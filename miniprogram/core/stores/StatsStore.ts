// 决策大师 (MindFlip) — StatsStore
// 职责: 人格标签、遵循率、分布数据

import { makeAutoObservable, runInAction } from 'mobx-miniprogram';
import { dataService } from '../services/DataService';

interface PersonalityTag {
  primary: { name: string; icon: string };
  secondary: { name: string; icon: string }[];
}

interface Personality {
  tags: PersonalityTag | null;
  preheat_progress: {
    current: number;
    required: number;
    next_milestone_msg: string;
  };
  stats_basis: {
    follow_rate: number;
    dominant_break_reason: string;
    top_tool: string;
  };
  calculated_at: number | null;
}

interface ToolDistribution {
  tool_id: string;
  tool_name: string;
  count: number;
}

interface StatsOverview {
  total_decisions: number;
  total_follow_rate: number;
  tool_distribution: ToolDistribution[];
  follow_breakdown: {
    followed: number;
    not_followed: number;
    pending: number;
    expired: number;
  };
  break_reason_distribution: Record<string, number>;
}

class StatsStore {
  overview: StatsOverview | null = null;
  personality: Personality | null = null;
  loading = false;
  personalityCacheMs = 3600 * 1000; // 1h

  constructor() {
    makeAutoObservable(this);
  }

  async refreshOverview(): Promise<void> {
    runInAction(() => { this.loading = true; });
    try {
      // TODO: const res = await dataService.getGlobalStats();
      // runInAction(() => { this.overview = res; });
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async loadPersonality(period: 'weekly' | 'all_time' = 'weekly'): Promise<void> {
    const cached = dataService.getCachedPersonality() as Personality | null;
    if (cached) {
      runInAction(() => { this.personality = cached; });
      return;
    }
    try {
      // TODO: const res = await dataService.getPersonality(period);
      // dataService.cachePersonality(res, this.personalityCacheMs);
      // runInAction(() => { this.personality = res; });
    } catch {
      // 静默失败
    }
  }

  get preheatProgress(): number {
    const p = this.personality?.preheat_progress;
    return p ? Math.min(p.current / p.required, 1) : 0;
  }

  get primaryTag(): PersonalityTag['primary'] | null {
    return this.personality?.tags?.primary ?? null;
  }

  get secondaryTags(): PersonalityTag['secondary'] {
    return this.personality?.tags?.secondary ?? [];
  }
}

export const statsStore = new StatsStore();
export { StatsStore, Personality, PersonalityTag, StatsOverview, ToolDistribution };
