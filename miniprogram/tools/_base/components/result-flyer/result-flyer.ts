// 决策大师 (MindFlip) — 结果飞入 Inbox 动画组件

interface FlyerData {
  visible: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  icon: string;
  label: string;
  duration?: number;
}

Component({
  properties: {
    // 起点坐标（屏幕像素）
    fromX: { type: Number, value: 0 },
    fromY: { type: Number, value: 0 },
    // 终点坐标（屏幕像素）
    toX: { type: Number, value: 0 },
    toY: { type: Number, value: 0 },
    // 飞行图标
    icon: { type: String, value: '✅' },
    // 飞行标签文字
    label: { type: String, value: '已存入' },
    // 动画时长 (ms)
    duration: { type: Number, value: 600 },
    // 是否显示
    visible: { type: Boolean, value: false },
  },

  data: {
    flying: false,
  },

  methods: {
    trigger(opts: { fromX: number; fromY: number; toX: number; toY: number; icon?: string; label?: string }): void {
      this.setData({
        visible: true,
        fromX: opts.fromX,
        fromY: opts.fromY,
        toX: opts.toX,
        toY: opts.toY,
        icon: opts.icon ?? '✅',
        label: opts.label ?? '已存入',
        flying: true,
      });
      // 动画结束后自动隐藏
      const duration = this.properties.duration ?? 600;
      setTimeout(() => {
        this.setData({ visible: false, flying: false });
        this.triggerEvent('complete');
      }, duration + 100);
    },
  },
});
