// 单工具统计页

import { toolRegistry } from '../../core/registry/ToolRegistry';
import { dataService } from '../../core/services/DataService';
import { relativeTime } from '../../core/utils/date';

interface ToolStatsPageData {
  toolId: string;
  toolName: string;
  toolDescription: string;
  totalUses: number;
  followRate: number;
  showHeatmap: boolean;
  showDistribution: boolean;
  heatmapData: number[][];
  maxHeat: number;
  distribution: { key: string; count: number; percent: number }[];
  history: (DecisionLog & { relativeTime: string })[];
  statusLabelMap: Record<string, string>;
}

Page({
  data: {
    toolId: '',
    toolName: '',
    toolDescription: '',
    totalUses: 0,
    followRate: 0,
    showHeatmap: false,
    showDistribution: false,
    heatmapData: [],
    maxHeat: 1,
    distribution: [],
    history: [],
    statusLabelMap: {
      pending: '待复盘',
      followed: '遵循了',
      not_followed: '没遵循',
      expired: '已过期',
    },
  } as ToolStatsPageData,

  onLoad(options: Record<string, string>): void {
    const toolId = options.id || '';
    const manifest = toolRegistry.get(toolId);
    if (!manifest) return;

    this.setData({
      toolId,
      toolName: manifest.name,
      toolDescription: manifest.description,
      showHeatmap: manifest.statsDimensions.includes('time_heatmap'),
      showDistribution: manifest.statsDimensions.includes('result_distribution'),
    });

    this.loadStats(toolId);
  },

  async loadStats(toolId: string): Promise<void> {
    try {
      // TODO: const res = await dataService.getToolStats(toolId);
      // this.setData({ ...res });
    } catch {
      // 静默处理
    }
  },
});
