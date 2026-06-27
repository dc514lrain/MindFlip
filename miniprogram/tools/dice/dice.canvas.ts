// 决策大师 (MindFlip) — 骰子 Canvas 2D 动画引擎
// 职责: 多骰子滚动/碰撞效果，缓动函数模拟减速，最终定格在结果面

import { Easing } from '../../core/utils/easing';
import { triggerHaptic } from '../../core/utils/haptic';

interface DiceAnimationInstance {
  init(canvasId: string, ctx: unknown): void;
  play(faces: number[]): Promise<void>;
  destroy(): void;
}

/** 绘制单个骰子面 (1-6点) */
function drawDiceFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  face: number,
  opacity: number = 1,
): void {
  const r = size / 6;

  ctx.save();
  ctx.globalAlpha = opacity;

  // 骰子背景（白/浅灰）
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, r * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 骰子描边
  ctx.strokeStyle = '#D0D0D0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 骰子点数
  ctx.fillStyle = '#1A1A1A';
  const dotR = size * 0.065;
  const cx = x;
  const cy = y;

  // 各面点数布局（相对坐标）
  const layouts: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [[-0.26, -0.26], [0.26, 0.26]],
    3: [[-0.26, -0.26], [0, 0], [0.26, 0.26]],
    4: [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]],
    5: [[-0.26, -0.26], [0.26, -0.26], [0, 0], [-0.26, 0.26], [0.26, 0.26]],
    6: [[-0.26, -0.32], [0.26, -0.32], [-0.26, 0], [0.26, 0], [-0.26, 0.32], [0.26, 0.32]],
  };

  const dots = layouts[face] ?? layouts[1];
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(cx + dx * size, cy + dy * size, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function createDiceAnimation(): DiceAnimationInstance {
  let ctx: unknown = null;
  let rafId = 0;
  let phase: 'idle' | 'rolling' | 'revealing' = 'idle';

  const ROLLING_DURATION = 1400; // 1.4s 滚动
  const REVEAL_DURATION = 300;   // 0.3s 定格

  // 骰子布局计算（用于多骰子）
  function computeDiceLayout(count: number, cw: number, ch: number, baseSize: number) {
    const positions: Array<{ x: number; y: number; size: number }> = [];
    if (count === 1) {
      positions.push({ x: cw / 2, y: ch / 2, size: baseSize });
    } else if (count === 2) {
      positions.push({ x: cw / 2 - baseSize * 0.7, y: ch / 2, size: baseSize });
      positions.push({ x: cw / 2 + baseSize * 0.7, y: ch / 2, size: baseSize });
    } else if (count === 3) {
      positions.push({ x: cw / 2, y: ch / 2 - baseSize * 0.9, size: baseSize });
      positions.push({ x: cw / 2 - baseSize * 0.85, y: ch / 2 + baseSize * 0.75, size: baseSize });
      positions.push({ x: cw / 2 + baseSize * 0.85, y: ch / 2 + baseSize * 0.75, size: baseSize });
    } else {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const spacingX = baseSize * 1.3;
      const spacingY = baseSize * 1.3;
      const startX = cw / 2 - (cols - 1) * spacingX / 2;
      const startY = ch / 2 - (rows - 1) * spacingY / 2;
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: startX + col * spacingX,
          y: startY + row * spacingY,
          size: baseSize * 0.85,
        });
      }
    }
    return positions;
  }

  return {
    init(_canvasId: string, canvasCtx: unknown): void {
      ctx = canvasCtx as CanvasRenderingContext2D;
      phase = 'idle';
    },

    play(faces: number[]): Promise<void> {
      if (phase !== 'idle') return Promise.resolve();
      phase = 'rolling';
      triggerHaptic('medium');

      return new Promise<void>((resolve) => {
        const startTime = Date.now();
        const currentFaces: number[] = faces.map(() => 1);
        const counts = Math.min(faces.length, 6);

        function frame(): void {
          const elapsed = Date.now() - startTime;
          const ctxRef = ctx as CanvasRenderingContext2D;
          const cw = ctxRef.canvas.width;
          const ch = ctxRef.canvas.height;
          const baseSize = Math.min(cw, ch) * (counts === 1 ? 0.42 : counts <= 3 ? 0.3 : 0.22);

          ctxRef.clearRect(0, 0, cw, ch);

          if (elapsed < ROLLING_DURATION) {
            const progress = elapsed / ROLLING_DURATION;
            const easeProgress = Easing.easeOutQuart(progress);

            // 快速切换面数模拟滚动效果（最后15%切换到结果面）
            for (let i = 0; i < faces.length; i++) {
              if (progress < 0.85) {
                currentFaces[i] = Math.floor(Math.random() * 6) + 1;
              } else {
                currentFaces[i] = faces[i];
              }
            }

            // 弹跳偏移（多频率叠加模拟真实感）
            const bounceFreq = 3.5;
            const bounceAmp = baseSize * 0.12 * (1 - easeProgress);
            const bounceOffset = Math.sin(progress * Math.PI * bounceFreq) * bounceAmp
              + Math.sin(progress * Math.PI * bounceFreq * 1.7) * bounceAmp * 0.4;

            // 轻微旋转偏移（骰子轻微摇摆）
            const rotOffset = Math.sin(progress * Math.PI * 2.5) * 6 * (1 - easeProgress);

            const positions = computeDiceLayout(counts, cw, ch, baseSize);
            for (let i = 0; i < Math.min(counts, positions.length); i++) {
              const { x, y, size } = positions[i];
              drawDiceFace(ctxRef, x + (i % 2 === 0 ? rotOffset : -rotOffset), y - bounceOffset, size, currentFaces[i]);
            }
          } else if (elapsed < ROLLING_DURATION + REVEAL_DURATION) {
            if (phase === 'rolling') {
              phase = 'revealing';
              triggerHaptic('heavy'); // 最终撞击触觉
            }

            const progress = (elapsed - ROLLING_DURATION) / REVEAL_DURATION;
            const scale = Easing.easeBackOut(Math.min(progress * 2, 1));

            const positions = computeDiceLayout(counts, cw, ch, baseSize * scale);
            for (let i = 0; i < Math.min(counts, positions.length); i++) {
              const { x, y, size } = positions[i];
              // 结果骰子颜色稍作高亮
              ctxRef.save();
              ctxRef.shadowColor = 'rgba(33,150,243,0.3)';
              ctxRef.shadowBlur = 8 * progress;
              drawDiceFace(ctxRef, x, y, size, faces[i]);
              ctxRef.restore();
            }
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
