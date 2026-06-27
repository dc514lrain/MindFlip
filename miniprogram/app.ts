// 决策大师 (MindFlip) — 小程序入口文件
// 职责: Store 初始化、登录流程、工具 manifest 注册、Onboarding 逻辑

import { appStore } from './core/stores/AppStore';
import { inboxStore } from './core/stores/InboxStore';
import { statsStore } from './core/stores/StatsStore';
import { toolRegistry } from './core/registry/ToolRegistry';
import { dataService } from './core/services/DataService';

// ── 工具 manifest 自注册 ──────────────────────────────────────────────────────
import './tools/coin/manifest';
import './tools/dice/manifest';
import './tools/roulette/manifest';
import './tools/pros-cons/manifest';

const ONBOARDING_KEY = 'onboarding_done';
const RECENT_TOOLS_KEY = 'recent_tools';

App({
  stores: {
    appStore,
    inboxStore,
    statsStore,
  },

  onLaunch(): void {
    // 云能力初始化（必须在使用 wx.cloud.* 之前调用）
    wx.cloud.init({
      env: 'cloud1',
      traceUser: true,
    });
    this.initLogin();
  },

  onShow(): void {
    // Tab 切换回来时刷新未读计数
    inboxStore.refreshUnreadCount();
  },

  async initLogin(): Promise<void> {
    const cachedToken = wx.getStorageSync('token');

    if (cachedToken) {
      try {
        const user = await dataService.getUserProfile() as ReturnType<typeof appStore.setUser> extends void ? Parameters<typeof appStore.setUser>[0] : never;
        if (user && typeof user === 'object' && 'openid' in (user as object)) {
          appStore.setUser(user as any);
        }
      } catch {
        wx.removeStorageSync('token');
      }
    }

    if (!wx.getStorageSync('token')) {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              const result = await dataService.login(res.code) as {
                token: string;
                user: Parameters<typeof appStore.setUser>[0];
                is_new_user: boolean;
              };
              if (result?.token && result?.user) {
                appStore.setUser(result.user);
                wx.setStorageSync('token', result.token);

                // 新用户首次登录，尝试获取昵称头像
                if (result.is_new_user) {
                  this.fetchUserInfo();
                }
              }
            } catch (err) {
              console.error('[MindFlip] 登录失败', err);
            }
          }
        },
        fail: (err) => {
          console.error('[MindFlip] wx.login 失败', err);
        },
      });
    }
  },

  async fetchUserInfo(): Promise<void> {
    try {
      const info = await new Promise<WechatMiniprogram.UserInfo>((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于展示用户头像和昵称',
          success: (res) => resolve(res.userInfo),
          fail: reject,
        });
      });
      if (info?.nickName) {
        const updateData = {
          nickname: info.nickName,
          avatar_url: info.avatarUrl,
        };
        // 触发 login 云函数更新用户信息
        try {
          await dataService.login('');
          // 更新 appStore
          if (appStore.user) {
            appStore.setUser({ ...appStore.user, ...updateData } as any);
          }
        } catch {
          // 静默失败
        }
      }
    } catch {
      // 用户拒绝或无法获取，不影响主流程
    }
  },

  // ── Onboarding ──────────────────────────────────────────────────────────────
  // 工具使用后触发首次引导
  triggerOnboarding(): void {
    const done = wx.getStorageSync(ONBOARDING_KEY);
    if (done) return;
    wx.setStorageSync(ONBOARDING_KEY, true);
  },

  isOnboardingShown(): boolean {
    return !!wx.getStorageSync(ONBOARDING_KEY);
  },

  // ── 最近使用工具 ─────────────────────────────────────────────────────────────
  recordRecentTool(toolId: string): void {
    const key = RECENT_TOOLS_KEY;
    const raw = wx.getStorageSync(key);
    let recent: string[] = raw ? JSON.parse(raw) : [];
    // 去重并移到最前
    recent = recent.filter(id => id !== toolId);
    recent.unshift(toolId);
    recent = recent.slice(0, 6); // 最多保留6个
    wx.setStorageSync(key, JSON.stringify(recent));
  },

  getRecentTools(): string[] {
    const raw = wx.getStorageSync(RECENT_TOOLS_KEY);
    return raw ? JSON.parse(raw) : [];
  },
});
