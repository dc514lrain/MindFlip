// 工具使用态通用页（动态路由）
// 根据 URL 参数 ?id=<tool-id> 动态跳转到对应工具页面

import { toolRegistry } from '../../core/registry/ToolRegistry';
import { Router } from '../../core/utils/router';

interface ToolRunPageData {
  toolId: string;
  toolName: string;
  loading: boolean;
}

Page({
  data: {
    toolId: '',
    toolName: '',
    loading: true,
  } as ToolRunPageData,

  onLoad(options: Record<string, string>): void {
    const toolId = options.id || '';
    this.setData({ toolId, toolName: '' });

    const manifest = toolRegistry.get(toolId);
    if (!manifest) {
      wx.showToast({ title: '工具不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ toolName: manifest.name, loading: false });

    // 跳转到对应工具的独立页面
    // 注意: 工具独立页面不在 app.json tabBar.list 中，所以用 navigateTo
    if (toolId === 'coin') {
      wx.redirectTo({ url: '/tools/coin/coin' });
    } else if (toolId === 'dice') {
      wx.redirectTo({ url: '/tools/dice/dice' });
    } else if (toolId === 'roulette') {
      wx.redirectTo({ url: '/tools/roulette/roulette' });
    } else if (toolId === 'pros_cons') {
      wx.redirectTo({ url: '/tools/pros-cons/pros-cons' });
    } else {
      // 通用路由兜底
      Router.openTool(toolId);
    }
  },
});
