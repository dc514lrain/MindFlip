// 工具使用态通用页（动态路由）
// 此页面作为中转，实际各工具内容由独立页面承载

import { toolRegistry } from '../../core/registry/ToolRegistry';

interface ToolRunPageData {
  toolId: string;
}

Page({
  data: {
    toolId: '',
  } as ToolRunPageData,

  onLoad(options: Record<string, string>): void {
    const toolId = options.id || '';
    this.setData({ toolId });

    // 动态路由：根据 toolId 跳转到对应工具页面
    const manifest = toolRegistry.get(toolId);
    if (!manifest) {
      console.warn(`[tool-run] 未找到工具: ${toolId}`);
      return;
    }
    // 路由已由 app.json 指向各工具自己的页面
    // 此处可做权限校验或其他逻辑
  },
});
