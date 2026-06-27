// 优缺点对比工具 TypeScript 页面逻辑

import { dataService } from '../../core/services/DataService';
import { formatTime } from '../../core/utils/date';

// ── 类型定义 ──────────────────────────────────────────────────────────────────
interface ProItem {
  id: string;
  text: string;
  weight: number;
}

interface ConItem {
  id: string;
  text: string;
  weight: number;
}

// ── ProsConsEngine 核心算法 ────────────────────────────────────────────────────
const ProsConsEngine = {
  analyze(pros: ProItem[], cons: ConItem[]) {
    const prosScore = pros.reduce((sum, p) => sum + p.weight, 0);
    const consScore = cons.reduce((sum, c) => sum + c.weight, 0);
    const diff = prosScore - consScore;
    const conclusion: 'pros' | 'cons' | 'neutral' = diff > 0 ? 'pros' : diff < 0 ? 'cons' : 'neutral';
    return {
      conclusion,
      pros_score: prosScore,
      cons_score: consScore,
      semantic_result: conclusion === 'pros' ? '优点胜出' : conclusion === 'cons' ? '缺点胜出' : '持平',
      raw_result: `优点 ${prosScore} : 缺点 ${consScore}`,
    };
  },
};

interface ProsConsPageData {
  topic: string;
  pros: ProItem[];
  cons: ConItem[];
  showResult: boolean;
  loading: boolean;
  conclusion: 'pros' | 'cons' | 'neutral';
  prosScore: number;
  consScore: number;
  semanticResult: string;
  rawResult: string;
  resultTime: string;
  memo: string;
}

function genId(): string {
  return String(Date.now() + Math.random());
}

Page({
  data: {
    topic: '',
    pros: [{ id: genId(), text: '', weight: 1 }] as ProItem[],
    cons: [{ id: genId(), text: '', weight: 1 }] as ConItem[],
    showResult: false,
    loading: false,
    conclusion: 'neutral' as 'pros' | 'cons' | 'neutral',
    prosScore: 0,
    consScore: 0,
    semanticResult: '',
    rawResult: '',
    resultTime: '',
    memo: '',
  } as ProsConsPageData,

  onTopicInput(e: WechatMiniprogram.Input): void {
    this.setData({ topic: e.detail.value });
  },

  onItemInput(e: WechatMiniprogram.Input): void {
    const { list, index } = e.currentTarget.dataset as { list: 'pros' | 'cons'; index: number };
    const items = [...(this.data[list] as (ProItem | ConItem)[])];
    items[index] = { ...items[index], text: e.detail.value };
    this.setData({ [list]: items } as unknown as Record<string, unknown>);
  },

  onWeightChange(e: WechatMiniprogram.TouchEvent): void {
    const { list, index, weight } = e.currentTarget.dataset as { list: 'pros' | 'cons'; index: number; weight: number };
    const items = [...(this.data[list] as (ProItem | ConItem)[])];
    items[index] = { ...items[index], weight };
    this.setData({ [list]: items } as unknown as Record<string, unknown>);
  },

  onDeleteItem(e: WechatMiniprogram.TouchEvent): void {
    const { list, index } = e.currentTarget.dataset as { list: 'pros' | 'cons'; index: number };
    const items = (this.data[list] as (ProItem | ConItem)[]).filter((_, i) => i !== index);
    this.setData({ [list]: items } as unknown as Record<string, unknown>);
  },

  onAddPro(): void {
    const pros = [...this.data.pros, { id: genId(), text: '', weight: 1 }];
    this.setData({ pros });
  },

  onAddCon(): void {
    const cons = [...this.data.cons, { id: genId(), text: '', weight: 1 }];
    this.setData({ cons });
  },

  onAnalyze(): void {
    const validPros = this.data.pros.filter(p => p.text.trim());
    const validCons = this.data.cons.filter(c => c.text.trim());
    if (validPros.length === 0 || validCons.length === 0) {
      wx.showToast({ title: '请至少各填一条优缺点', icon: 'none' });
      return;
    }
    const result = ProsConsEngine.analyze(validPros, validCons);
    const now = Date.now();
    this.setData({
      showResult: true,
      conclusion: result.conclusion,
      prosScore: result.pros_score,
      consScore: result.cons_score,
      semanticResult: result.semantic_result,
      rawResult: result.raw_result,
      resultTime: formatTime(now, 'datetime'),
    });
  },

  onMemoInput(e: WechatMiniprogram.Input): void {
    this.setData({ memo: e.detail.value });
  },

  async onSave(): Promise<void> {
    const { rawResult, semanticResult, memo, topic } = this.data;
    try {
      await dataService.saveDecision({
        action: 'create',
        tool_type: 'pros_cons',
        raw_result: rawResult,
        semantic_result: `${topic}：${semanticResult}`,
        user_memo: memo || undefined,
      });
      wx.showToast({ title: '已存入待决清单', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/review/review' }), 800);
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  onReset(): void {
    this.setData({
      showResult: false,
      pros: [{ id: genId(), text: '', weight: 1 }],
      cons: [{ id: genId(), text: '', weight: 1 }],
      memo: '',
      topic: '',
    });
  },
});
