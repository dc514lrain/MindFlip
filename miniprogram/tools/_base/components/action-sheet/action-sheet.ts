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
  },

  data: {
    breakReasonOptions: BREAK_REASON_OPTIONS,
    selectedReason: '' as string,
    showReasons: false,
  },

  observers: {
    'visible': function (val: boolean) {
      if (!val) {
        this.resetState();
      }
    },
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
      this.setData({ showReasons: true });
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

    onBack(): void {
      this.setData({ showReasons: false, selectedReason: '' });
    },

    onCancel(): void {
      this.triggerEvent('close');
      this.resetState();
    },

    resetState(): void {
      this.setData({ selectedReason: '', showReasons: false });
    },

    noop(): void {
      // 阻止事件冒泡
    },
  },
});
