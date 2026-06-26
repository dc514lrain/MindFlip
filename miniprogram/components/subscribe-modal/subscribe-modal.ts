// 订阅消息授权半屏弹窗组件

Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '开启复盘提醒' },
    description: { type: String, value: '每天 9:00 收到待决清单推送提醒' },
    benefits: { type: Array, value: ['每天 9:00 推送待决清单', '帮助养成复盘习惯', '随时可在微信内关闭'] },
  },

  methods: {
    onClose(): void {
      this.triggerEvent('close');
    },

    onLater(): void {
      this.triggerEvent('later');
    },

    onAuthorize(): void {
      this.triggerEvent('authorize');
    },
  },
});
