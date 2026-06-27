// 首页 · 决策 Tab

import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { appStore } from '../../core/stores/AppStore';
import { inboxStore } from '../../core/stores/InboxStore';
import { statsStore } from '../../core/stores/StatsStore';
import { toolRegistry } from '../../core/registry/ToolRegistry';
import { Router } from '../../core/utils/router';

interface IndexPageData {
  instantTools: any[];
  decisionTools: any[];
  unreadCount: number;
  totalDecisions: number;
  followRate: number;
  primaryTag: string;
  primaryIcon: string;
  markedCount: number;
}

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: [
    {
      store: inboxStore,
      fields: ['unreadCount'],
    },
    {
      store: statsStore,
      fields: ['primaryTag', 'primaryIcon', 'overview'],
      actions: ['refreshOverview'],
    },
  ],

  data: {
    instantTools: [],
    decisionTools: [],
    unreadCount: 0,
    totalDecisions: 0,
    followRate: 0,
    primaryTag: '',
    primaryIcon: '',
    markedCount: 0,
  } as IndexPageData,

  onLoad(): void {
    const home = toolRegistry.getForHome();
    this.setData({
      instantTools: home.instant,
      decisionTools: home.decision,
    });
    inboxStore.refreshUnreadCount();
    statsStore.loadPersonality('weekly');
  },

  onShow(): void {
    inboxStore.refreshUnreadCount();
    statsStore.refreshOverview();
  },

  openTool(e: WechatMiniprogram.TouchEvent): void {
    const toolId = e.currentTarget.dataset.tool as string;
    Router.openTool(toolId);
  },

  goToReview(): void {
    Router.switchToReview();
  },

  goToStats(): void {
    Router.openToolStats('coin');
  },
});
