// 决策大师 (MindFlip) — 硬币 Canvas 2D 动画引擎
// 职责: 硬币翻转三阶段动画（蓄力/旋转/揭晓），60fps 物理拟真效果
//
// 动画数据流:
//   play(result) → 阶段1(0-200ms) → 阶段2(200-800ms) → 阶段3(800-1000ms) → resolve

import { Easing } from '../../core/utils/easing';
import { triggerHaptic } from '../../core/utils/haptic';

interface CoinAnimationInstance {
  init(canvasId: string, ctx: unknown): void;
  play(result: 'heads' | 'tails'): Promise<void>;
  destroy(): void;
}

export function createCoinAnimation(): CoinAnimationInstance {
  let ctx: unknown = null;
  let rafId = 0;
  let phase: 'idle' | 'winding' | 'flipping' | 'revealing' = 'idle';
  let resolvePromise: (() => void) | null = null;

  // 动画阶段时长 (ms)
  const WINDING_DURATION = 200;
  const FLIPPING_DURATION = 600;
  const REVEALING_DURATION = 200;
  const TOTAL_DURATION = WINDING_DURATION + FLIPPING_DURATION + REVEALING_DURATION;

  function getCurrentTimestamp(): number {
    return Date.now();
  }

  function drawCoin(
    ctxRef: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    progress: number,
    result: 'heads' | 'tails',
    phaseType: 'winding' | 'flipping' | 'revealing',
  ): void {
    ctxRef.clearRect(0, 0, ctxRef.canvas.width, ctxRef.canvas.height);

    // 透视缩放：硬币在翻转时宽度变化，模拟3D旋转效果
    const scaleX = phaseType === 'winding'
      ? Easing.easeInQuad(1 - progress)
      : phaseType === 'flipping'
        ? Math.abs(Math.cos(progress * Math.PI)) // 0→1→0 变化
        : 1;

    const scaleY = phaseType === 'winding'
      ? Easing.easeInQuad(1 - progress * 0.1)
      : 1;

    // 蓄力震动偏移
    const shakeX = phaseType === 'winding' ? (Math.random() - 0.5) * 8 * (1 - progress) : 0;
    const shakeY = phaseType === 'winding' ? (Math.random() - 0.5) * 8 * (1 - progress) : 0;

    // 揭晓阶段的光晕效果
    if (phaseType === 'revealing') {
      const glowAlpha = Easing.easeOutQuad(progress) * 0.6;
      const gradient = ctxRef.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 2);
      gradient.addColorStop(0, `rgba(232, 184, 75, ${glowAlpha})`);
      gradient.addColorStop(1, 'rgba(232, 184, 75, 0)');
      ctxRef.fillStyle = gradient;
      ctxRef.fillRect(0, 0, ctxRef.canvas.width, ctxRef.canvas.height);
    }

    ctxRef.save();
    ctxRef.translate(cx + shakeX, cy + shakeY);
    ctxRef.scale(Math.max(scaleX, 0.05), scaleY);

    // 硬币主体金属渐变
    const coinGradient = ctxRef.createLinearGradient(-radius, -radius, radius, radius);
    if (phaseType === 'revealing') {
      // 揭晓后使用结果色（正面金/反面银）
      const isHeads = result === 'heads';
      coinGradient.addColorStop(0, isHeads ? '#F5D77A' : '#D0D0D0');
      coinGradient.addColorStop(0.4, isHeads ? '#E8B84B' : '#A8A8A8');
      coinGradient.addColorStop(0.7, isHeads ? '#C9942E' : '#8C8C8C');
      coinGradient.addColorStop(1, isHeads ? '#A67620' : '#707070');
    } else {
      coinGradient.addColorStop(0, '#F5D77A');
      coinGradient.addColorStop(0.4, '#E8B84B');
      coinGradient.addColorStop(0.7, '#C9942E');
      coinGradient.addColorStop(1, '#A67620');
    }

    ctxRef.fillStyle = coinGradient;
    ctxRef.beginPath();
    ctxRef.arc(0, 0, radius, 0, Math.PI * 2);
    ctxRef.fill();

    // 内圈装饰
    const innerR = radius * 0.82;
    const innerGradient = ctxRef.createRadialGradient(0, 0, innerR * 0.7, 0, 0, innerR);
    innerGradient.addColorStop(0, 'rgba(255,255,255,0.18)');
    innerGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctxRef.fillStyle = innerGradient;
    ctxRef.beginPath();
    ctxRef.arc(0, 0, innerR, 0, Math.PI * 2);
    ctxRef.fill();

    // 硬币描边
    ctxRef.strokeStyle = phaseType === 'revealing' && result === 'heads'
      ? '#8B6914'
      : '#B8860B';
    ctxRef.lineWidth = 4;
    ctxRef.stroke();

    // 内圈细线
    ctxRef.strokeStyle = 'rgba(255,255,255,0.3)';
    ctxRef.lineWidth = 1.5;
    ctxRef.beginPath();
    ctxRef.arc(0, 0, innerR, 0, Math.PI * 2);
    ctxRef.stroke();

    // 硬币文字（揭晓后显示用户选项或正面/反面）
    const text = phaseType === 'revealing'
      ? (result === 'heads' ? '正' : '反')
      : '?';

    // 文字阴影
    ctxRef.shadowColor = 'rgba(0,0,0,0.3)';
    ctxRef.shadowBlur = 6;
    ctxRef.shadowOffsetY = 2;

    ctxRef.fillStyle = phaseType === 'revealing' && result === 'heads'
      ? '#6B4A10'
      : phaseType === 'revealing'
        ? '#3A3A3A'
        : 'rgba(100,70,20,0.8)';
    ctxRef.font = `bold ${radius * 0.48}px -apple-system, sans-serif`;
    ctxRef.textAlign = 'center';
    ctxRef.textBaseline = 'middle';
    ctxRef.fillText(text, 0, 2);

    // 底部小标签（揭晓时显示）
    if (phaseType === 'revealing') {
      ctxRef.shadowBlur = 0;
      ctxRef.shadowOffsetY = 0;
      ctxRef.font = `${radius * 0.14}px -apple-system, sans-serif`;
      ctxRef.fillStyle = 'rgba(0,0,0,0.35)';
      ctxRef.fillText(result === 'heads' ? 'HEADS' : 'TAILS', 0, radius * 0.62);
    }

    ctxRef.restore();
  }

  return {
    init(canvasId: string, canvasCtx: unknown): void {
      ctx = canvasCtx as CanvasRenderingContext2D;
      phase = 'idle';
    },

    play(result: 'heads' | 'tails'): Promise<void> {
      if (phase !== 'idle') return Promise.resolve();
      phase = 'winding';

      // 蓄力阶段触觉反馈
      setTimeout(() => triggerHaptic('heavy'), 0);

      return new Promise<void>((resolve) => {
        resolvePromise = resolve;
        const startTime = getCurrentTimestamp();

        function frame(): void {
          const elapsed = getCurrentTimestamp() - startTime;
          const ctxRef = ctx as CanvasRenderingContext2D;
          const cx = ctxRef.canvas.width / 2;
          const cy = ctxRef.canvas.height / 2;
          const radius = Math.min(cx, cy) * 0.7;

          if (elapsed < WINDING_DURATION) {
            // 阶段1: 蓄力
            const progress = elapsed / WINDING_DURATION;
            drawCoin(ctxRef, cx, cy, radius, progress, result, 'winding');
          } else if (elapsed < WINDING_DURATION + FLIPPING_DURATION) {
            // 阶段2: 旋转
            if (phase === 'winding') phase = 'flipping';
            const progress = (elapsed - WINDING_DURATION) / FLIPPING_DURATION;
            drawCoin(ctxRef, cx, cy, radius, progress, result, 'flipping');
          } else if (elapsed < TOTAL_DURATION) {
            // 阶段3: 揭晓
            if (phase === 'flipping') phase = 'revealing';
            const progress = (elapsed - WINDING_DURATION - FLIPPING_DURATION) / REVEALING_DURATION;
            drawCoin(ctxRef, cx, cy, radius, progress, result, 'revealing');
          } else {
            // 动画结束
            phase = 'idle';
            if (resolvePromise) resolvePromise();
            return;
          }

          rafId = requestAnimationFrame(frame);
        }

        rafId = requestAnimationFrame(frame);
      });
    },

    destroy(): void {
      if (rafId) cancelAnimationFrame(rafId);
      phase = 'idle';
      ctx = null;
      resolvePromise = null;
    },
  };
}

// 导出接口类型供外部使用
export type { CoinAnimationInstance };
