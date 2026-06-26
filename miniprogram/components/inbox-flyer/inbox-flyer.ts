// Inbox 飞入动效组件

Component({
  properties: {
    visible: { type: Boolean, value: false },
    message: { type: String, value: '已存入待决清单' },
    duration: { type: Number, value: 2000 },
  },

  observers: {
    'visible': function (val: boolean): void {
      if (val) {
        setTimeout(() => {
          this.setData({ visible: false });
          this.triggerEvent('complete');
        }, this.properties.duration);
      }
    },
  },

  methods: {
    onMaskTap(): void {
      this.setData({ visible: false });
    },
  },
});
