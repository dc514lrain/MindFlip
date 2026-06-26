// 决策大师 (MindFlip) — 优缺点对比工具 manifest

import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const prosConsManifest: ToolManifest = {
  id: 'pros_cons',
  name: '优缺点对比',
  description: '理性分析，给纠结一个答案',
  icon: '/assets/icons/pros-cons.svg',
  group: 'decision',
  inboxPolicy: 'user_choice',
  runRoute: '/pages/tool-run/tool-run?id=pros_cons',
  statsRoute: '/pages/tool-stats/tool-stats?id=pros_cons',
  statsDimensions: [
    'frequency',
    'follow_rate',
    'history_timeline',
  ],
};

toolRegistry.register(prosConsManifest);
