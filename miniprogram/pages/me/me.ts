// 我的 Tab

import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { appStore } from '../../core/stores/AppStore';
import { statsStore } from '../../core/stores/StatsStore';
import { Router } from '../../core/utils/router';

interface MePageData {
  user: {
    nickname: string;
    avatar_url: string;
  };
  isVip: boolean;
  toolSlotsUsed: number;
  toolSlotsMax: number;
  stats: {
    total_decisions: number;
    total_follow_rate: number;
    weekly_decisions: number;
  };
  personality: unknown;
  primaryTag: string;
  primaryIcon: string;
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
      fields: ['overview', 'personality', 'primaryTagName as primaryTag', 'primaryIcon'],
      actions: ['refreshOverview', 'loadPersonality'],
    },
  ],

  data: {
    user: { nickname: '微信用户', avatar_url: '' },
    isVip: false,
    toolSlotsUsed: 0,
    toolSlotsMax: 1,
    stats: { total_decisions: 0, total_follow_rate: 0, weekly_decisions: 0 },
    personality: null,
    primaryTag: '',
    primaryIcon: '',
  } as MePageData,

  onLoad(): void {
    statsStore.refreshOverview();
    statsStore.loadPersonality('all_time');
    // 尝试获取微信头像昵称
    this.fetchUserProfile();
  },

  onShow(): void {
    statsStore.refreshOverview();
    statsStore.loadPersonality('all_time');
  },

  fetchUserProfile(): void {
    const userInfo = wx.getStorageSync('user_profile');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        if (parsed.nickname) {
          this.setData({
            user: {
              nickname: parsed.nickname,
              avatar_url: parsed.avatar_url || '',
            },
          });
        }
      } catch {
        // ignore
      }
    }
  },

  goToAllStats(): void {
    Router.openToolStats('coin');
  },

  goToPrivacy(): void {
    wx.showModal({
      title: '隐私设置',
      content: '深度隐私模式（VIP专属）正在开发中',
      showCancel: false,
    });
  },

  goToSubscribe(): void {
    Router.openSubscribeGuide();
  },

  goToAbout(): void {
    wx.showModal({
      title: '关于决策大师',
      content: '版本 1.0.0\n让随机性成为你的决策盟友\n\n© 2026 MindFlip',
      showCancel: false,
    });
  },

  onShareAppMessage(): object {
    return {
      title: '决策大师 MindFlip — 让随机性成为你的决策盟友',
      path: '/pages/index/index',
    };
  },
});
