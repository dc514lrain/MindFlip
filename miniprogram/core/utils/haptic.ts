// 决策大师 (MindFlip) — 触觉反馈封装
// 职责: 封装 Taptic Engine，工具关键节点触发触觉反馈

type HapticLevel = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

function isHapticSupported(): boolean {
  return wx.canIUse('feedback.haptic');
}

/**
 * 触发触觉反馈
 * @param level 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
 */
export function triggerHaptic(level: HapticLevel = 'medium'): void {
  if (!isHapticSupported()) return;
  try {
    switch (level) {
      case 'light':
        wx.vibrateShort({ type: 'light', fail: () => {} });
        break;
      case 'medium':
        wx.vibrateShort({ type: 'medium', fail: () => {} });
        break;
      case 'heavy':
        wx.vibrateLong({ fail: () => {} });
        break;
      case 'rigid':
        wx.vibrateShort({ type: 'rigid', fail: () => {} });
        break;
      case 'soft':
        wx.vibrateShort({ type: 'soft', fail: () => {} });
        break;
    }
  } catch {
    // 静默失败，不影响主流程
  }
}

/**
 * 硬币离手瞬间 — 重触觉
 */
export function hapticCoinFlip(): void {
  triggerHaptic('heavy');
}

/**
 * 骰子撞击桌面 — 中触觉
 */
export function hapticDiceImpact(): void {
  triggerHaptic('medium');
}

/**
 * 转盘停靠结果 — 软触觉
 */
export function hapticRouletteStop(): void {
  triggerHaptic('soft');
}

/**
 * 按钮点击 — 轻触觉
 */
export function hapticButtonTap(): void {
  triggerHaptic('light');
}
