// 决策大师 (MindFlip) — 大转盘工具 manifest

import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const rouletteManifest: ToolManifest = {
  id: 'roulette',
  name: '大转盘',
  description: '多选项？让转盘帮你选',
  icon: '/assets/icons/roulette.svg',
  group: 'decision',
  inboxPolicy: 'auto',
  runRoute: '/pages/tool-run/tool-run?id=roulette',
  statsRoute: '/pages/tool-stats/tool-stats?id=roulette',
  statsDimensions: [
    'frequency',
    'result_distribution',
    'follow_rate',
    'break_reason_pie',
    'history_timeline',
  ],
};

toolRegistry.register(rouletteManifest);
