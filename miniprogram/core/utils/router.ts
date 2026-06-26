// 决策大师 (MindFlip) — 统一路由跳转封装
// 职责: 所有页面跳转通过 Router 封装，统一处理 Tab 切换与非 Tab 跳转

interface RouterOptions {
  success?: () => void;
  fail?: (err: unknown) => void;
}

export const Router = {
  /** 打开工具使用页 */
  openTool(toolId: string): void {
    wx.navigateTo({ url: `/pages/tool-run/tool-run?id=${toolId}` });
  },

  /** 打开工具统计页 */
  openToolStats(toolId: string): void {
    wx.navigateTo({ url: `/pages/tool-stats/tool-stats?id=${toolId}` });
  },

  /** 切换到复盘 Tab */
  switchToReview(): void {
    wx.switchTab({ url: '/pages/review/review' });
  },

  /** 切换到首页 Tab */
  switchToIndex(): void {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /** 切换到快选 Tab */
  switchToQuick(): void {
    wx.switchTab({ url: '/pages/quick/quick' });
  },

  /** 切换到我的 Tab */
  switchToMe(): void {
    wx.switchTab({ url: '/pages/me/me' });
  },

  /** 打开订阅消息授权引导页 */
  openSubscribeGuide(from: string = 'banner'): void {
    wx.navigateTo({ url: `/pages/subscribe-guide/subscribe-guide?from=${from}` });
  },

  /** 关闭当前页并返回上一页 */
  goBack(): void {
    wx.navigateBack();
  },

  /** 关闭所有页面并跳转至首页（用于登录后重置导航栈） */
  redirectToHome(): void {
    wx.reLaunch({ url: '/pages/index/index' });
  },
};
