// 决策大师 (MindFlip) — 首次使用引导浮层组件
// 职责: 用户完成第一次决策后展示教育性引导文案，3秒后自动消失

Component({
  properties: {
    visible: { type: Boolean, value: false },
  },

  data: {
    progress: 0,
  },

  lifetimes: {
    attached(): void {
      // noop
    },
  },

  observers: {
    'visible': function (val: boolean) {
      if (val) {
        this.startTimer();
      } else {
        this.clearTimer();
      }
    },
  },

  pageLifetimes: {
    show(): void {
      // noop
    },
    hide(): void {
      this.clearTimer();
    },
  },

  methods: {
    startTimer(): void {
      this.clearTimer();
      // 3秒后自动消失
      this._autoCloseTimer = setTimeout(() => {
        this.triggerEvent('close');
      }, 3000);

      // 进度条动画
      let progress = 0;
      this._progressInterval = setInterval(() => {
        progress += 1;
        if (progress > 100) progress = 100;
        this.setData({ progress });
        if (progress >= 100) {
          this.clearTimer();
        }
      }, 30);
    },

    clearTimer(): void {
      if (this._autoCloseTimer) {
        clearTimeout(this._autoCloseTimer);
        this._autoCloseTimer = null;
      }
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }
    },

    onDismiss(): void {
      this.clearTimer();
      this.triggerEvent('close');
    },
  },
});
