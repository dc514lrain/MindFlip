// 自定义 Tab Bar 组件

import { inboxStore } from '../../core/stores/InboxStore';

interface TabItem {
  path: string;
  name: string;
  label: string;
  icon: string;
  active: boolean;
}

interface CustomTabBarData {
  tabs: TabItem[];
  unreadCount: number;
}

Component({
  data: {
    tabs: [
      { path: '/pages/index/index', name: 'index', label: '首页', icon: '🏠', active: true },
      { path: '/pages/review/review', name: 'review', label: '复盘', icon: '📋', active: false },
      { path: '/pages/quick/quick', name: 'quick', label: '快选', icon: '⚡', active: false },
      { path: '/pages/me/me', name: 'me', label: '我的', icon: '👤', active: false },
    ] as TabItem[],
    unreadCount: 0,
  } as CustomTabBarData,

  lifetimes: {
    attached(): void {
      this.updateActiveTab();
      this.setData({ unreadCount: inboxStore.unreadCount });
    },
  },

  methods: {
    updateActiveTab(): void {
      const pages = getCurrentPages();
      if (pages.length === 0) return;
      const currentPage = pages[pages.length - 1];
      const currentPath = `/${currentPage.route}`;
      const tabs = this.data.tabs.map(tab => ({
        ...tab,
        active: tab.path === currentPath,
      }));
      this.setData({ tabs });
    },

    onTabTap(e: WechatMiniprogram.TouchEvent): void {
      const path = e.currentTarget.dataset.path as string;
      const name = e.currentTarget.dataset.name as string;
      if (name === 'quick') return; // 中间按钮单独处理
      wx.switchTab({ url: path });
    },

    onQuickTap(): void {
      wx.switchTab({ url: '/pages/quick/quick' });
    },
  },
});
