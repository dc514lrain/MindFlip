// 订阅消息授权引导页

import { dataService } from '../../core/services/DataService';

interface SubscribeGuidePageData {
  authorized: boolean;
  rejectedCount: number;
  loading: boolean;
}

Page({
  data: {
    authorized: false,
    rejectedCount: 0,
    loading: true,
  } as SubscribeGuidePageData,

  onLoad(options: Record<string, string>): void {
    this.loadStatus();
  },

  async loadStatus(): Promise<void> {
    // 订阅状态由 subscribe 云函数管理，前端无法直接查询
    // 这里假设未授权状态，引导用户开启
    this.setData({ loading: false });
  },

  async onAuthorize(): Promise<void> {
    try {
      const res = await new Promise<WechatMiniprogram.RequestSubscribeMessageSuccessCallbackResult>((resolve, reject) => {
        wx.requestSubscribeMessage({
          tmplIds: ['YOUR_TEMPLATE_ID'],
          success: resolve,
          fail: reject,
        });
      });
      const accepted = res['YOUR_TEMPLATE_ID'] === 'accept';
      await dataService.updateSubscribeAuth(accepted);
      this.setData({ authorized: accepted });
      if (accepted) {
        wx.showToast({ title: '授权成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch {
      wx.showToast({ title: '授权失败，请稍后重试', icon: 'none' });
    }
  },

  onOpenSettings(): void {
    wx.openSetting({
      success: () => {
        // 用户可能手动开启了订阅
        this.setData({ authorized: true });
      },
    });
  },

  onSkip(): void {
    wx.navigateBack();
  },
});
