// 复盘 Tab

import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { inboxStore } from '../../core/stores/InboxStore';
import { statsStore } from '../../core/stores/StatsStore';
import { relativeTime, expireCountdown, isExpiringSoon } from '../../core/utils/date';

interface ReviewPageData {
  pendingList: (Decision & { relativeTime: string; isExpiringSoon: boolean; countdown: string })[];
  pendingCount: number;
  loading: boolean;
  totalDecisions: number;
  followRate: number;
  primaryTag: string;
  primaryIcon: string;
  secondaryTagText: string;
  preheatProgress: number;
  preheatCount: number;
}

interface Decision {
  _id: string;
  tool_type: string;
  tool_name: string;
  semantic_result: string;
  user_memo: string;
  created_at: number;
}

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: [
    {
      store: inboxStore,
      fields: ['pendingList', 'loading'],
      actions: ['loadList', 'markFollowed', 'markNotFollowed'],
    },
    {
      store: statsStore,
      fields: ['primaryTag', 'primaryIcon', 'secondaryTags', 'overview', 'preheatProgress'],
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
  } as ReviewPageData,

  onLoad(): void {
    inboxStore.loadList();
    statsStore.loadPersonality('weekly');
    statsStore.refreshOverview();
  },

  onShow(): void {
    inboxStore.loadList();
  },

  onMarkFollowed(e: WechatMiniprogram.TouchEvent): void {
    const id = e.currentTarget.dataset.id as string;
    inboxStore.markFollowed(id);
  },

  onMarkNotFollowed(e: WechatMiniprogram.TouchEvent): void {
    const id = e.currentTarget.dataset.id as string;
    // TODO: 展开 action-sheet 选择 break_reason
    inboxStore.markFollowed(id); // 临时
  },
});
