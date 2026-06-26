// 我的 Tab

import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { appStore } from '../../core/stores/AppStore';
import { statsStore } from '../../core/stores/StatsStore';

interface MePageData {
  user: {
    nickname: string;
    avatar_url: string;
  };
  isVip: boolean;
  stats: {
    total_decisions: number;
    total_follow_rate: number;
    weekly_decisions: number;
  };
  personality: unknown;
}

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: [
    {
      store: appStore,
      fields: ['user', 'isVip'],
    },
    {
      store: statsStore,
      fields: ['overview', 'personality'],
      actions: ['refreshOverview', 'loadPersonality'],
    },
  ],

  data: {
    user: { nickname: '', avatar_url: '' },
    isVip: false,
    stats: { total_decisions: 0, total_follow_rate: 0, weekly_decisions: 0 },
    personality: null,
  } as MePageData,

  onLoad(): void {
    statsStore.refreshOverview();
    statsStore.loadPersonality('all_time');
  },

  goToAllStats(): void {
    // TODO: 跳转全部统计页面
  },

  goToPrivacy(): void {
    // TODO: 跳转隐私设置
  },

  goToAbout(): void {
    wx.showModal({
      title: '决策大师 MindFlip',
      content: '版本 1.0.0\n让随机性成为你的决策盟友',
      showCancel: false,
    });
  },
});
