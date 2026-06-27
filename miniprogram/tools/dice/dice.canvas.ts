// 决策大师 (MindFlip) — 骰子 Canvas 2D 动画引擎
// 职责: 骰子滚动/碰撞效果，缓动函数模拟减速，最终定格在结果面

import { Easing } from '../../core/utils/easing';
import { triggerHaptic } from '../../core/utils/haptic';

interface DiceAnimationInstance {
  init(canvasId: string, ctx: unknown): void;
  play(face: number): Promise<void>;
  destroy(): void;
}

/** 绘制单个骰子面 (1-6点) */
function drawDiceFace(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, face: number): void {
  const r = size / 6;

  // 骰子背景
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, r * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 骰子描边
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 骰子点数
  ctx.fillStyle = '#1A1A1A';
  const dotR = size * 0.06;
  const cx = x;
  const cy = y;

  // 各面点数布局（相对坐标）
  const layouts: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [[-0.25, -0.25], [0.25, 0.25]],
    3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
    4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
    5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
    6: [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0], [0.25, 0], [-0.25, 0.3], [0.25, 0.3]],
  };

  const dots = layouts[face] ?? layouts[1];
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(cx + dx * size, cy + dy * size, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createDiceAnimation(): DiceAnimationInstance {
  let ctx: unknown = null;
  let rafId = 0;
  let phase: 'idle' | 'rolling' | 'revealing' = 'idle';

  const ROLLING_DURATION = 1200; // 1.2s 滚动
  const REVEAL_DURATION = 200;   // 0.2s 定格

  return {
    init(canvasId: string, canvasCtx: unknown): void {
      ctx = canvasCtx as CanvasRenderingContext2D;
      phase = 'idle';
    },

    play(face: number): Promise<void> {
      if (phase !== 'idle') return Promise.resolve();
      phase = 'rolling';
      triggerHaptic('medium');

      return new Promise<void>((resolve) => {
        const startTime = Date.now();
        let lastFace = face;

        function frame(): void {
          const elapsed = Date.now() - startTime;
          const ctxRef = ctx as CanvasRenderingContext2D;
          const cw = ctxRef.canvas.width;
          const ch = ctxRef.canvas.height;
          const size = Math.min(cw, ch) * 0.45;

          ctxRef.clearRect(0, 0, cw, ch);

          if (elapsed < ROLLING_DURATION) {
            const progress = elapsed / ROLLING_DURATION;
            const bounceProgress = Easing.easeOutBounce(progress);

            // 快速切换面数模拟滚动效果（滚动期最后3帧固定在结果面）
            if (progress < 0.85) {
              lastFace = Math.floor(Math.random() * 6) + 1;
            } else {
              lastFace = face;
            }

            // 模拟上下弹跳效果
            const bounceOffset = Math.sin(progress * Math.PI * 3) * size * 0.1 * (1 - progress);
            const cx = cw / 2;
            const cy = ch / 2 - bounceOffset;

            drawDiceFace(ctxRef, cx, cy, size, lastFace);
          } else if (elapsed < ROLLING_DURATION + REVEAL_DURATION) {
            if (phase === 'rolling') phase = 'revealing';
            triggerHaptic('heavy'); // 最终撞击触觉

            const progress = (elapsed - ROLLING_DURATION) / REVEAL_DURATION;
            const scale = Easing.easeBackOut(Math.min(progress * 3, 1));
            const ctxRef2 = ctx as CanvasRenderingContext2D;
            const cw = ctxRef2.canvas.width;
            const ch = ctxRef2.canvas.height;
            const size = Math.min(cw, ch) * 0.45 * scale;
            drawDiceFace(ctxRef2, cw / 2, ch / 2, size, face);
          } else {
            phase = 'idle';
            resolve();
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
    },
  };
}

export type { DiceAnimationInstance };
