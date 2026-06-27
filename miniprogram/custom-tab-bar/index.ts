// 自定义 TabBar
Component({
  data: {
    current: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: '🏠',
      },
      {
        pagePath: '/pages/review/review',
        text: '复盘',
        icon: '📋',
      },
      {
        pagePath: '/pages/quick/quick',
        text: '快选',
        icon: '⚡',
      },
      {
        pagePath: '/pages/me/me',
        text: '我的',
        icon: '👤',
      },
    ],
  },

  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const { path, index } = e.currentTarget.dataset;
      if (this.data.current === index) return;
      wx.switchTab({ url: path });
    },
  },
});
