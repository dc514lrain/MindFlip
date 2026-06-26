// 快速选择页

import { Router } from '../../core/utils/router';

Page({
  openTool(e: WechatMiniprogram.TouchEvent): void {
    const toolId = e.currentTarget.dataset.tool as string;
    Router.openTool(toolId);
  },
});
