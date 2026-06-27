// 大转盘工具 TypeScript 页面逻辑

import { dataService } from '../../core/services/DataService';
import { formatTime } from '../../core/utils/date';
import { triggerHaptic } from '../../core/utils/haptic';
import { Easing } from '../../core/utils/easing';

// ── 类型定义 ──────────────────────────────────────────────────────────────────
interface RouletteOption {
  id: string;
  label: string;
}

// ── RouletteEngine 核心算法 ────────────────────────────────────────────────────
const RouletteEngine = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 20,

  spin(options: RouletteOption[]) {
    const index = Math.floor(Math.random() * options.length);
    const selected = options[index];
    return {
      raw_result: selected.label,
      semantic_result: `转到了「${selected.label}」`,
    };
  },
};

interface RoulettePageData {
  showResult: boolean;
  loading: boolean;
  options: RouletteOption[];
  semanticResult: string;
  rawResult: string;
  resultTime: string;
  memo: string;
}

Page({
  data: {
    showResult: false,
    loading: false,
    options: [
      { id: '0', label: '' },
      { id: '1', label: '' },
    ] as RouletteOption[],
    semanticResult: '',
    rawResult: '',
    resultTime: '',
    memo: '',
  } as RoulettePageData,

  onOptionInput(e: WechatMiniprogram.Input): void {
    const index = e.currentTarget.dataset.index as number;
    const options = [...this.data.options];
    options[index] = { ...options[index], label: e.detail.value };
    this.setData({ options });
  },

  onDeleteOption(e: WechatMiniprogram.TouchEvent): void {
    const index = e.currentTarget.dataset.index as number;
    const options = this.data.options.filter((_, i) => i !== index);
    this.setData({ options });
  },

  onAddOption(): void {
    if (this.data.options.length >= RouletteEngine.MAX_OPTIONS) return;
    const options = [...this.data.options, { id: String(Date.now()), label: '' }];
    this.setData({ options });
  },

  async onSpin(): Promise<void> {
    const validOptions = this.data.options.filter(o => o.label.trim());
    if (validOptions.length < RouletteEngine.MIN_OPTIONS) return;

    this.setData({ loading: true, showResult: false });
    triggerHaptic('heavy');

    // 模拟转动动画 (Phase 1 简化版，不使用 Canvas)
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    const result = RouletteEngine.spin(validOptions);
    const now = Date.now();

    this.setData({
      loading: false,
      showResult: true,
      semanticResult: result.semantic_result,
      rawResult: result.raw_result,
      resultTime: formatTime(now, 'datetime'),
    });

    triggerHaptic('soft');
  },

  onMemoInput(e: WechatMiniprogram.Input): void {
    this.setData({ memo: e.detail.value });
  },

  async onSave(): Promise<void> {
    const { rawResult, semanticResult, memo } = this.data;
    try {
      await dataService.saveDecision({
        action: 'create',
        tool_type: 'roulette',
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
    this.setData({ showResult: false, memo: '', rawResult: '', semanticResult: '' });
  },
});
