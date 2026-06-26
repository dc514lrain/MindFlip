// 硬币工具 TypeScript 页面逻辑
// 架构: coin.ts (核心算法) + coin.canvas.ts (Canvas 2D 动画) + coin.wxml (视图)

import { CoinEngine } from './coin';
import { createCoinAnimation } from './coin.canvas';
import { dataService } from '../../core/services/DataService';
import { formatTime } from '../../core/utils/date';

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
}

let animation: ReturnType<typeof createCoinAnimation> | null = null;

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
  } as CoinPageData,

  animationRef: null as ReturnType<typeof createCoinAnimation> | null,

  onLoad(): void {
    // Canvas 2D 初始化：在 onLoad 中预先创建上下文，避免首帧延迟
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
      wx.showToast({ title: '已存入待决清单', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/review/review' }), 800);
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
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
