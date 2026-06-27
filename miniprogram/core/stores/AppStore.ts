// 决策大师 (MindFlip) — AppStore
// 职责: 全局用户信息、VIP 状态、登录态

import { makeAutoObservable, runInAction } from 'mobx-miniprogram';
import { dataService } from '../services/DataService';

interface UserProfile {
  openid: string;
  unionid: string;
  nickname: string;
  avatar_url: string;
  vip_level: 'free' | 'vip';
  vip_expire_at: number | null;
  tool_slot_used: number;
  tool_slot_max: number;
  privacy_mode: 'standard' | 'deep';
  stats_snapshot: {
    total_decisions: number;
    total_follow_rate: number;
    primary_tag?: string;
    weekly_decisions: number;
    updated_at: number;
  };
}

class AppStore {
  user: UserProfile | null = null;
  isLogin = false;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setUser(user: UserProfile): void {
    runInAction(() => {
      this.user = user;
      this.isLogin = true;
    });
    dataService.cacheUser(user);
  }

  async refreshUser(): Promise<void> {
    try {
      const res = await dataService.getUserProfile();
      if (res) {
        this.setUser(res as UserProfile);
      }
    } catch {
      // 静默失败
    }
  }

  async refreshVip(): Promise<void> {
    // 重新获取用户信息以更新 VIP 状态
    await this.refreshUser();
  }

  get vipStatus(): 'free' | 'vip' {
    return this.user?.vip_level ?? 'free';
  }

  get isVip(): boolean {
    return this.vipStatus === 'vip';
  }

  get toolSlotsRemaining(): number {
    if (!this.user) return 0;
    return this.user.tool_slot_max - this.user.tool_slot_used;
  }

  get nickname(): string {
    return this.user?.nickname ?? '微信用户';
  }

  get avatarUrl(): string {
    return this.user?.avatar_url ?? '';
  }
}

export const appStore = new AppStore();
export { AppStore, UserProfile };
