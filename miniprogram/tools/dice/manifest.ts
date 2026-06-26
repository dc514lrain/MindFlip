// 决策大师 (MindFlip) — 骰子工具 manifest

import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const diceManifest: ToolManifest = {
  id: 'dice',
  name: '掷骰子',
  description: '一个不够？多个骰子让随机更公平',
  icon: '/assets/icons/dice.svg',
  group: 'instant',
  inboxPolicy: 'auto',
  runRoute: '/pages/tool-run/tool-run?id=dice',
  statsRoute: '/pages/tool-stats/tool-stats?id=dice',
  statsDimensions: [
    'frequency',
    'time_heatmap',
    'result_distribution',
    'follow_rate',
    'break_reason_pie',
    'history_timeline',
  ],
};

toolRegistry.register(diceManifest);
