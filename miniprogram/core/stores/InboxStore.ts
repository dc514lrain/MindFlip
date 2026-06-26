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

class InboxStore {
  pendingList: DecisionLog[] = [];
  unreadCount = 0;
  loading = false;
  bannerDismissed = false;
  pageToken: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async loadList(): Promise<void> {
    runInAction(() => { this.loading = true; });
    try {
      // TODO: 调用 dataService.queryInbox() 获取真实数据
      // const res = await dataService.queryInbox(20, this.pageToken ?? undefined);
      // runInAction(() => {
      //   this.pendingList = res.items;
      //   this.pageToken = res.next_token;
      // });
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const count = await dataService.getUnreadCount();
      runInAction(() => { this.unreadCount = count; });
    } catch {
      // 静默失败，不影响主流程
    }
  }

  async markFollowed(id: string): Promise<void> {
    runInAction(() => {
      this.pendingList = this.pendingList.filter(item => item._id !== id);
    });
    try {
      await dataService.markDecision(id, 'followed');
    } catch {
      // TODO: 回滚逻辑
    }
  }

  async markNotFollowed(id: string, reason: BreakReason): Promise<void> {
    if (!BREAK_REASONS.includes(reason)) return;
    runInAction(() => {
      this.pendingList = this.pendingList.filter(item => item._id !== id);
    });
    try {
      await dataService.markDecision(id, 'not_followed', reason);
    } catch {
      // TODO: 回滚逻辑
    }
  }

  dismissBanner(): void {
    runInAction(() => { this.bannerDismissed = true; });
  }

  get hasExpiredItems(): boolean {
    return this.pendingList.some(item => {
      return (Date.now() - item.created_at) > 48 * 3600 * 1000;
    });
  }
}

export const inboxStore = new InboxStore();
export { InboxStore, DecisionLog, BreakReason, BREAK_REASONS };
