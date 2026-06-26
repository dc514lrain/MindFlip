// VIP 功能门控组件

Component({
  properties: {
    isVip: { type: Boolean, value: false },
    showOverlay: { type: Boolean, value: true },
    title: { type: String, value: 'VIP 专属功能' },
    description: { type: String, value: '升级 VIP 解锁此功能' },
    dismissible: { type: Boolean, value: true },
  },

  methods: {
    onUpgrade(): void {
      this.triggerEvent('upgrade');
    },

    onDismiss(): void {
      this.triggerEvent('dismiss');
    },
  },
});
