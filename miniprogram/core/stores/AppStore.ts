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

  async refreshVip(): Promise<void> {
    // TODO: 调用云函数刷新 VIP 状态
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
}

export const appStore = new AppStore();
export { AppStore, UserProfile };
