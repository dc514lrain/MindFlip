// 决策大师 (MindFlip) — 遵循/未遵循操作浮层组件

interface BreakReasonOption {
  value: string;
  label: string;
  icon: string;
}

const BREAK_REASON_OPTIONS: BreakReasonOption[] = [
  { value: 'intuition', label: '直觉告诉我另一个更好', icon: '🧠' },
  { value: 'external_change', label: '外部条件变化了', icon: '🌧️' },
  { value: 'just_testing', label: '我只是试试看', icon: '🔍' },
  { value: 'dislike_result', label: '结果我不喜欢', icon: '😅' },
  { value: 'still_thinking', label: '我再想想', icon: '🤔' },
];

Component({
  properties: {
    visible: { type: Boolean, value: false },
    decisionText: { type: String, value: '' },
    showReasons: { type: Boolean, value: false },
  },

  data: {
    breakReasonOptions: BREAK_REASON_OPTIONS,
    selectedReason: '' as string,
  },

  methods: {
    onMaskTap(): void {
      this.triggerEvent('close');
    },

    onFollowed(): void {
      this.triggerEvent('follow');
      this.resetState();
    },

    onNotFollowed(): void {
      if (this.properties.showReasons) {
        // 展开原因选择
        this.setData({ showReasons: true });
      } else {
        this.triggerEvent('notfollow', { reason: null });
        this.resetState();
      }
    },

    onSelectReason(e: WechatMiniprogram.TouchEvent): void {
      const reason = e.currentTarget.dataset.reason as string;
      this.setData({ selectedReason: reason });
    },

    onConfirmNotFollowed(): void {
      const reason = this.data.selectedReason;
      if (!reason) return;
      this.triggerEvent('notfollow', { reason });
      this.resetState();
    },

    onCancel(): void {
      this.triggerEvent('close');
      this.resetState();
    },

    resetState(): void {
      this.setData({ selectedReason: '', showReasons: false });
    },

    noop(): void {
      // 阻止冒泡
    },
  },
});
