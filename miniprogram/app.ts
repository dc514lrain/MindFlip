// 决策大师 (MindFlip) — 小程序入口文件
// 职责: Store 初始化、登录流程、工具 manifest 注册

import { appStore } from './core/stores/AppStore';
import { inboxStore } from './core/stores/InboxStore';
import { statsStore } from './core/stores/StatsStore';
import { toolRegistry } from './core/registry/ToolRegistry';

// ── 工具 manifest 自注册 ──────────────────────────────────────────────────────
import './tools/coin/manifest';
import './tools/dice/manifest';
import './tools/roulette/manifest';
import './tools/pros-cons/manifest';

App<IAppOption>({
  stores: {
    appStore,
    inboxStore,
    statsStore,
  },

  onLaunch(): void {
    // Skyline 渲染引擎无需额外初始化
    this.initLogin();
  },

  onShow(): void {
    // Tab 切换回来时刷新未读计数
    inboxStore.refreshUnreadCount();
  },

  private async initLogin(): Promise<void> {
    // 优先使用缓存的登录态
    const cachedToken = wx.getStorageSync('token');
    if (cachedToken) {
      try {
        // TODO: 调用 DataService.getUserProfile() 验证 token 有效性
        // const user = await DataService.getUserProfile();
        // appStore.setUser(user);
      } catch {
        // token 失效，清除并重新登录
        wx.removeStorageSync('token');
      }
    }

    // 无有效 token 则触发登录流程
    if (!wx.getStorageSync('token')) {
      wx.login({
        success: async (res) => {
          if (res.code) {
            // TODO: 调用 DataService.login(res.code) 获取用户信息
            // const result = await DataService.login(res.code);
            // appStore.setUser(result.user);
            // wx.setStorageSync('token', result.token);
            console.log('[MindFlip] 登录 code:', res.code);
          }
        },
        fail: (err) => {
          console.error('[MindFlip] 登录失败', err);
        },
      });
    }
  },
});
