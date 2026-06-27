// 硬币工具 TypeScript 页面逻辑

import { createCoinAnimation } from './coin.canvas';
import { dataService } from '../../core/services/DataService';
import { formatTime } from '../../core/utils/date';
import { app as appInst } from '../../app';

// ── CoinEngine 核心算法 ────────────────────────────────────────────────────────
const CoinEngine = {
  RESULT_LABELS: { heads: '正面', tails: '反面' } as Record<string, string>,

  flip(headsLabel: string, tailsLabel: string) {
    const raw_result = Math.random() < 0.5 ? 'heads' : 'tails';
    const semantic_result = raw_result === 'heads' ? headsLabel : tailsLabel;
    return { raw_result, semantic_result };
  },
};

interface CoinPageData {
  showResult: boolean;
  loading: boolean;
  headsLabel: string;
  tailsLabel: string;
  rawResult: string;
  rawResultText: string;
  semanticResult: string;
  resultTime: string;
  memo: string;
  showSubscribeModal: boolean;
  showOnboarding: boolean;
}

Page({
  data: {
    showResult: false,
    loading: false,
    headsLabel: '火锅',
    tailsLabel: '烧烤',
    rawResult: '',
    rawResultText: '',
    semanticResult: '',
    resultTime: '',
    memo: '',
    showSubscribeModal: false,
    showOnboarding: false,
  } as CoinPageData,

  animationRef: null as ReturnType<typeof createCoinAnimation> | null,

  onLoad(): void {
    const query = wx.createSelectorQuery();
    query.select('#coin-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this.animationRef = createCoinAnimation();
        this.animationRef.init('coin-canvas', ctx);
      });
  },

  onUnload(): void {
    this.animationRef?.destroy();
    this.animationRef = null;
  },

  onHeadsInput(e: WechatMiniprogram.Input): void {
    this.setData({ headsLabel: e.detail.value });
  },

  onTailsInput(e: WechatMiniprogram.Input): void {
    this.setData({ tailsLabel: e.detail.value });
  },

  onMemoInput(e: WechatMiniprogram.Input): void {
    this.setData({ memo: e.detail.value });
  },

  async onFlip(): Promise<void> {
    if (this.data.loading || this.data.showResult) return;

    const { headsLabel, tailsLabel } = this.data;
    const result = CoinEngine.flip(headsLabel, tailsLabel);

    this.setData({ loading: true, showResult: false });

    // 先播放 Canvas 动画（动画完成后展示结果）
    if (this.animationRef) {
      await this.animationRef.play(result.raw_result);
    }

    const now = Date.now();
    this.setData({
      loading: false,
      showResult: true,
      rawResult: result.raw_result,
      rawResultText: CoinEngine.RESULT_LABELS[result.raw_result],
      semanticResult: result.semantic_result,
      resultTime: formatTime(now, 'datetime'),
    });
  },

  async onSave(): Promise<void> {
    const { rawResult, semanticResult, memo } = this.data;
    try {
      await dataService.saveDecision({
        action: 'create',
        tool_type: 'coin',
        raw_result: rawResult,
        semantic_result: semanticResult,
        user_memo: memo || undefined,
      });

      // 记录最近使用
      appInst.recordRecentTool('coin');

      // 检查是否需要显示订阅授权弹窗
      const subscribed = wx.getStorageSync('subscribed');
      if (!subscribed) {
        this.setData({ showSubscribeModal: true });
        wx.setStorageSync('subscribed', 'shown');
      }

      // 触发首次使用引导（仅显示一次）
      if (!appInst.isOnboardingShown()) {
        this.setData({ showOnboarding: true });
        appInst.triggerOnboarding();
      }

      wx.showToast({ title: '已存入待决清单', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/review/review' }), 800);
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  onSubscribeResult(e: WechatMiniprogram.CustomEvent): void {
    this.setData({ showSubscribeModal: false });
  },

  onOnboardingClose(): void {
    this.setData({ showOnboarding: false });
  },

  onRetry(): void {
    this.setData({
      showResult: false,
      memo: '',
      rawResult: '',
      rawResultText: '',
      semanticResult: '',
    });
  },
});
