// 决策大师 (MindFlip) — 硬币工具 manifest
// 自注册到 ToolRegistry

import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const coinManifest: ToolManifest = {
  id: 'coin',
  name: '抛硬币',
  description: '正面还是反面？把选择交给天意',
  icon: '/assets/icons/coin.svg',
  group: 'instant',
  inboxPolicy: 'auto',
  runRoute: '/tools/coin/coin',
  statsRoute: '/pages/tool-stats/tool-stats?id=coin',
  statsDimensions: [
    'frequency',
    'time_heatmap',
    'result_distribution',
    'follow_rate',
    'break_reason_pie',
    'history_timeline',
  ],
};

toolRegistry.register(coinManifest);
