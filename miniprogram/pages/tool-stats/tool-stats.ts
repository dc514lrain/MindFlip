// 单工具统计页

import { toolRegistry } from '../../core/registry/ToolRegistry';
import { dataService } from '../../core/services/DataService';
import { relativeTime } from '../../core/utils/date';

interface DecisionLog {
  _id: string;
  tool_type: string;
  raw_result: string;
  semantic_result: string;
  follow_status: string;
  created_at: number;
  user_memo?: string;
}

interface ToolStatsResponse {
  tool_id: string;
  tool_name: string;
  total_uses: number;
  time_heatmap: number[][];
  result_distribution: Record<string, number>;
  follow_rate: number;
  break_reason_distribution: Record<string, number>;
  history: DecisionLog[];
}

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
  history: (DecisionLog & { relativeTimeStr: string })[];
  statusLabelMap: Record<string, string>;
  loading: boolean;
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
    loading: true,
  } as ToolStatsPageData,

  onLoad(options: Record<string, string>): void {
    const toolId = options.id || '';
    const manifest = toolRegistry.get(toolId);
    if (!manifest) {
      wx.showToast({ title: '工具不存在', icon: 'none' });
      return;
    }

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
    this.setData({ loading: true });
    try {
      const res = await dataService.getToolStats(toolId) as ToolStatsResponse;
      if (!res) {
        this.setData({ loading: false });
        return;
      }

      // 计算热力图最大值
      let maxHeat = 1;
      if (res.time_heatmap && res.time_heatmap.length > 0) {
        res.time_heatmap.forEach(row => {
          row.forEach(val => { if (val > maxHeat) maxHeat = val; });
        });
      }

      // 计算结果分布百分比
      const total = Object.values(res.result_distribution || {}).reduce((s, v) => s + v, 0);
      const distribution = Object.entries(res.result_distribution || {})
        .map(([key, count]) => ({
          key,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // 处理历史记录时间格式化
      const history = (res.history || []).map(item => ({
        ...item,
        relativeTimeStr: relativeTime(item.created_at),
      }));

      this.setData({
        totalUses: res.total_uses ?? 0,
        followRate: res.follow_rate ?? 0,
        heatmapData: res.time_heatmap ?? [],
        maxHeat,
        distribution,
        history,
        loading: false,
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  onShareAppMessage(): object {
    return {
      title: `${this.data.toolName} 统计数据`,
      path: `/pages/tool-stats/tool-stats?id=${this.data.toolId}`,
    };
  },
});
