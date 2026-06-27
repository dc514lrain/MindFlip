// 复盘 Tab (Inbox + Insights)

import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { inboxStore, DecisionLog, BreakReason } from '../../core/stores/InboxStore';
import { statsStore } from '../../core/stores/StatsStore';
import { relativeTime, expireCountdown, isExpiringSoon } from '../../core/utils/date';

interface DisplayDecision extends DecisionLog {
  relativeTimeStr: string;
  isExpiringSoonFlag: boolean;
  countdown: string;
}

interface ReviewPageData {
  pendingList: DisplayDecision[];
  pendingCount: number;
  loading: boolean;
  totalDecisions: number;
  followRate: number;
  primaryTag: string;
  primaryIcon: string;
  secondaryTagText: string;
  preheatProgress: number;
  preheatCount: number;
  showBanner: boolean;
  actionSheetItem: { id: string; text: string } | null;
  showActionSheet: boolean;
}

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: [
    {
      store: inboxStore,
      fields: ['pendingList', 'loading', 'showBanner'],
    },
    {
      store: statsStore,
      fields: ['primaryTagName as primaryTag', 'primaryIcon', 'secondaryTagText', 'overview', 'preheatProgress', 'preheatCount', 'totalDecisions', 'followRate'],
      actions: ['refreshOverview', 'loadPersonality'],
    },
  ],

  data: {
    pendingList: [],
    pendingCount: 0,
    loading: false,
    totalDecisions: 0,
    followRate: 0,
    primaryTag: '',
    primaryIcon: '',
    secondaryTagText: '',
    preheatProgress: 0,
    preheatCount: 0,
    showBanner: false,
    actionSheetItem: null,
    showActionSheet: false,
  } as ReviewPageData,

  observers: {
    'pendingList': function (newList: DecisionLog[]) {
      const display = this.computeDisplayList(newList || []);
      this.setData({
        pendingList: display,
        pendingCount: display.length,
      });
    },
  },

  onLoad(): void {
    inboxStore.loadList();
    statsStore.loadPersonality('weekly');
    statsStore.refreshOverview();
  },

  onShow(): void {
    inboxStore.loadList();
  },

  onPullDownRefresh(): void {
    Promise.all([
      inboxStore.loadList(),
      statsStore.refreshOverview(),
      statsStore.loadPersonality('weekly'),
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onMarkFollowed(e: WechatMiniprogram.TouchEvent): void {
    const id = e.currentTarget.dataset.id as string;
    inboxStore.markFollowed(id);
  },

  onMarkNotFollowed(e: WechatMiniprogram.TouchEvent): void {
    const id = e.currentTarget.dataset.id as string;
    const item = inboxStore.pendingList.find(d => d._id === id);
    this.setData({
      actionSheetItem: item ? { id, text: item.semantic_result } : null,
      showActionSheet: true,
    });
  },

  onActionFollow(): void {
    const item = this.data.actionSheetItem;
    if (!item) return;
    inboxStore.markFollowed(item.id);
    this.closeActionSheet();
  },

  onActionNotFollow(e: WechatMiniprogram.CustomEvent): void {
    const reason = e.detail.reason as string;
    const item = this.data.actionSheetItem;
    if (!item || !reason) return;
    inboxStore.markNotFollowed(item.id, reason as BreakReason);
    this.closeActionSheet();
  },

  closeActionSheet(): void {
    this.setData({ showActionSheet: false, actionSheetItem: null });
  },

  onDismissBanner(): void {
    inboxStore.dismissBanner();
  },

  onBannerTap(): void {
    wx.navigateTo({ url: '/pages/subscribe-guide/subscribe-guide?from=inbox' });
  },

  // 辅助方法：将 pendingList 转换为显示格式
  computeDisplayList(rawList: DecisionLog[]): DisplayDecision[] {
    return rawList.map(item => ({
      ...item,
      relativeTimeStr: relativeTime(item.created_at),
      isExpiringSoonFlag: isExpiringSoon(item.created_at),
      countdown: expireCountdown(item.created_at),
    }));
  },

  noop(): void {
    // 空操作，用于阻止事件冒泡
  },
});
