// 快速选择页（中间凸起 Tab 按钮对应的半屏面板）

import { toolRegistry } from '../../core/registry/ToolRegistry';
import { Router } from '../../core/utils/router';
import { app as appInst } from '../../app';

interface QuickPageData {
  recentTools: ReturnType<typeof toolRegistry.get>[];
  allTools: ReturnType<typeof toolRegistry.get>[];
}

Page({
  data: {
    recentTools: [],
    allTools: [],
  } as QuickPageData,

  onLoad(): void {
    this.loadTools();
  },

  onShow(): void {
    this.loadTools();
  },

  loadTools(): void {
    const all = toolRegistry.getAll();
    const recentIds = appInst.getRecentTools();
    const recentTools = recentIds
      .map(id => toolRegistry.get(id))
      .filter(Boolean) as ReturnType<typeof toolRegistry.get>[];

    this.setData({
      recentTools,
      allTools: all,
    });
  },

  openTool(e: WechatMiniprogram.TouchEvent): void {
    const toolId = e.currentTarget.dataset.tool as string;
    if (toolId) {
      Router.openTool(toolId);
      // 记录最近使用
      appInst.recordRecentTool(toolId);
    }
  },

  goToAllTools(): void {
    wx.switchTab({ url: '/pages/index/index' });
  },

  getToolIcon(toolId: string): string {
    const iconMap: Record<string, string> = {
      coin: '🪙',
      dice: '🎲',
      roulette: '🎯',
      pros_cons: '⚖️',
    };
    return iconMap[toolId] || '🎲';
  },
});
