// 订阅消息授权引导页

import { requestSubscribeAuth, getSubscribeGuideConfig } from '../../core/utils/subscribe';

interface SubscribeGuidePageData {
  from: string;
  sceneDescription: string;
}

Page({
  data: {
    from: '',
    sceneDescription: '每天 9:00 收到待决清单推送提醒，帮助你养成复盘习惯',
  } as SubscribeGuidePageData,

  onLoad(options: Record<string, string>): void {
    const from = options.from || 'banner';
    this.setData({ from });
    const config = getSubscribeGuideConfig(from);
    this.setData({ sceneDescription: config.description || this.data.sceneDescription });
  },

  async onAuthorize(): Promise<void> {
    const isAuthorized = await requestSubscribeAuth({
      templateId: 'YOUR_TEMPLATE_ID',
      scene: this.data.from,
    });
    if (isAuthorized) {
      wx.showToast({ title: '已开启提醒', icon: 'success' });
    }
    wx.navigateBack();
  },

  onSkip(): void {
    wx.navigateBack();
  },
});
