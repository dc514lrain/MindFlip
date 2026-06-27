// 决策大师 (MindFlip) — InboxStore
// 职责: 待决清单 pending 列表、未读计数

import { makeAutoObservable, runInAction } from 'mobx-miniprogram';
import { dataService } from '../services/DataService';

interface DecisionLog {
  _id: string;
  tool_type: string;
  tool_name: string;
  raw_result: string;
  semantic_result: string;
  user_memo: string;
  follow_status: 'pending' | 'followed' | 'not_followed' | 'expired';
  break_reason: string | null;
  created_at: number;
  marked_at: number | null;
  expired_at: number | null;
}

const BREAK_REASONS = ['intuition', 'external_change', 'just_testing', 'dislike_result', 'still_thinking'] as const;
type BreakReason = typeof BREAK_REASONS[number];

interface InboxQueryResult {
  items: DecisionLog[];
  next_token: string | null;
  total: number;
}

class InboxStore {
  pendingList: DecisionLog[] = [];
  unreadCount = 0;
  loading = false;
  bannerDismissed = false;
  pageToken: string | null = null;
  subscribeAuthorized = false;
  rejectedCount = 0;

  constructor() {
    makeAutoObservable(this);
    this.loadSubscribeAuth();
  }

  async loadSubscribeAuth(): Promise<void> {
    try {
      const res = await dataService.getSubscribeAuthStatus();
      runInAction(() => {
        this.subscribeAuthorized = res.is_authorized;
        this.rejectedCount = res.rejected_count;
        this.bannerDismissed = dataService.getLocalCache<boolean>('banner_dismissed') ?? false;
      });
    } catch {
      // 静默失败
    }
  }

  async loadList(): Promise<void> {
    runInAction(() => { this.loading = true; });
    try {
      const res = await dataService.queryInbox(20, this.pageToken ?? undefined) as InboxQueryResult;
      runInAction(() => {
        this.pendingList = res?.items ?? [];
        this.pageToken = res?.next_token ?? null;
      });
    } catch {
      // 静默失败，保留旧数据
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const count = await dataService.getUnreadCount();
      runInAction(() => { this.unreadCount = count; });
    } catch {
      // 静默失败
    }
  }

  async markFollowed(id: string): Promise<void> {
    // 乐观更新
    const prevList = this.pendingList;
    runInAction(() => {
      this.pendingList = this.pendingList.filter(item => item._id !== id);
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
    try {
      await dataService.markDecision(id, 'followed');
    } catch {
      // 回滚
      runInAction(() => { this.pendingList = prevList; });
    }
  }

  async markNotFollowed(id: string, reason: BreakReason): Promise<void> {
    if (!BREAK_REASONS.includes(reason)) return;
    // 乐观更新
    const prevList = this.pendingList;
    runInAction(() => {
      this.pendingList = this.pendingList.filter(item => item._id !== id);
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
    try {
      await dataService.markDecision(id, 'not_followed', reason);
    } catch {
      // 回滚
      runInAction(() => { this.pendingList = prevList; });
    }
  }

  dismissBanner(): void {
    runInAction(() => { this.bannerDismissed = true; });
    dataService.setLocalCache('banner_dismissed', true);
  }

  setSubscribeAuth(authorized: boolean, rejectedCount: number): void {
    runInAction(() => {
      this.subscribeAuthorized = authorized;
      this.rejectedCount = rejectedCount;
    });
  }

  get hasExpiredItems(): boolean {
    return this.pendingList.some(item => {
      return (Date.now() - item.created_at) > 48 * 3600 * 1000;
    });
  }

  get showBanner(): boolean {
    return !this.bannerDismissed && !this.subscribeAuthorized && this.rejectedCount < 3;
  }
}

export const inboxStore = new InboxStore();
export { InboxStore, DecisionLog, BreakReason, BREAK_REASONS };
