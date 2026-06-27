// 骰子工具 TypeScript 页面逻辑

import { createDiceAnimation } from './dice.canvas';
import { dataService } from '../../core/services/DataService';
import { formatTime } from '../../core/utils/date';

// ── DiceEngine 核心算法 ────────────────────────────────────────────────────────
interface DiceResult {
  face_count: number;
  roll: number;
}

const DiceEngine = {
  rollMultiple(count: number) {
    const results: DiceResult[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const face_count = Math.floor(Math.random() * 6) + 1;
      results.push({ face_count, roll: face_count });
      total += face_count;
    }
    return { results, total, semantic_result: `掷出了 ${total} 点` };
  },
};

interface DicePageData {
  showResult: boolean;
  loading: boolean;
  diceCount: number;
  resultFaces: number[];
  totalResult: number;
  semanticResult: string;
  targetFace: number;
  resultTime: string;
  memo: string;
}

Page({
  data: {
    showResult: false,
    loading: false,
    diceCount: 1,
    resultFaces: [] as number[],
    totalResult: 0,
    semanticResult: '',
    targetFace: 0,
    resultTime: '',
    memo: '',
  } as DicePageData,

  animationRef: null as ReturnType<typeof createDiceAnimation> | null,

  onLoad(): void {
    const query = wx.createSelectorQuery();
    query.select('#dice-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this.animationRef = createDiceAnimation();
        this.animationRef.init('dice-canvas', ctx);
      });
  },

  onUnload(): void {
    this.animationRef?.destroy();
    this.animationRef = null;
  },

  onSelectCount(e: WechatMiniprogram.TouchEvent): void {
    this.setData({ diceCount: e.currentTarget.dataset.count as number });
  },

  onMemoInput(e: WechatMiniprogram.Input): void {
    this.setData({ memo: e.detail.value });
  },

  async onRoll(): Promise<void> {
    if (this.data.loading || this.data.showResult) return;
    this.setData({ loading: true, showResult: false });

    const multiResult = DiceEngine.rollMultiple(this.data.diceCount);

    if (this.animationRef) {
      await this.animationRef.play(multiResult.total);
    }

    const now = Date.now();
    this.setData({
      loading: false,
      showResult: true,
      resultFaces: multiResult.results.map(r => r.face_count),
      totalResult: multiResult.total,
      semanticResult: multiResult.semantic_result,
      targetFace: multiResult.total,
      resultTime: formatTime(now, 'datetime'),
    });
  },

  async onSave(): Promise<void> {
    const { totalResult, semanticResult, memo } = this.data;
    try {
      await dataService.saveDecision({
        action: 'create',
        tool_type: 'dice',
        raw_result: String(totalResult),
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
    this.setData({ showResult: false, memo: '', resultFaces: [], totalResult: 0 });
  },
});
