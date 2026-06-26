// 决策大师 (MindFlip) — 缓动函数库
// 职责: 统一管理所有缓动曲线，Canvas 2D 动画与 Skyline worklet 共用

/**
 * t: 0-1 的进度值
 * 返回: 0-1 的缓动后值
 */

// ═══ 常用缓动函数 ════════════════════════════════════════════════════════════════

/** 线性（匀速） */
export function linear(t: number): number {
  return t;
}

/** 二次方缓出 */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** 三次方缓出 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** 四次方缓出 */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** 指数缓出 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** 正弦缓出 */
export function easeOutSine(t: number): number {
  return Math.sin(t * (Math.PI / 2));
}

/** 二次方缓入 */
export function easeInQuad(t: number): number {
  return t * t;
}

/** 三次方缓入 */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/** 二次方缓入缓出 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** 三次方缓入缓出 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 弹性缓出（用于结果揭晓动画） */
export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

/** 弹跳缓出（用于硬币落地、骰子碰撞） */
export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

/** 回退缓动（用于硬币蓄力缩放） */
export function easeBackOut(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** 强回退（用于骰子旋转初期蓄力） */
export function easeBackIn(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

// ═══ 统一导出 ════════════════════════════════════════════════════════════════════
export const Easing = {
  linear,
  easeOutQuad,
  easeOutCubic,
  easeOutQuart,
  easeOutExpo,
  easeOutSine,
  easeInQuad,
  easeInCubic,
  easeInOutQuad,
  easeInOutCubic,
  easeOutElastic,
  easeOutBounce,
  easeBackOut,
  easeBackIn,
};
