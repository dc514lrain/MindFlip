// 决策大师 (MindFlip) — ToolManifest 接口定义
// 职责: 工具注册清单的 TypeScript 接口，所有工具 manifest 共享此类型

// ═══ 工具分组 ══════════════════════════════════════════════════════════════════
type ToolGroup = 'instant' | 'decision';

// ═══ 工具 Inbox 收录策略 ════════════════════════════════════════════════════════
type InboxPolicy = 'auto' | 'user_choice' | 'custom' | 'none';

// ═══ 统计维度枚举 ══════════════════════════════════════════════════════════════
type ToolStatsDimension =
  | 'frequency'
  | 'time_heatmap'
  | 'result_distribution'
  | 'follow_rate'
  | 'break_reason_pie'
  | 'history_timeline';

// ═══ ToolManifest 接口 ═════════════════════════════════════════════════════════
interface ToolManifest {
  /** 全局唯一工具标识，如 "coin" / "dice" / "roulette" */
  id: string;

  /** 工具显示名称 */
  name: string;

  /** 工具描述，首页卡片展示用 */
  description: string;

  /** 工具图标（相对 assets 路径或 iconfont 名） */
  icon: string;

  /** 交互分组 */
  group: ToolGroup;

  /** Inbox 收录策略 */
  inboxPolicy: InboxPolicy;

  /** 使用态页面路由 */
  runRoute: string;

  /** 统计视图路由 */
  statsRoute: string;

  /** 该工具特有的统计维度 */
  statsDimensions: ToolStatsDimension[];

  /** Phase 2 预留：该工具是否支持作为模板供自定义工具克隆 */
  canBeTemplate?: boolean;

  /** Phase 2 预留：自定义工具模板的 JSON Schema（内置工具为 undefined） */
  blockSchema?: unknown;
}

// ═══ BlockSchema (Phase 2 预留) ═══════════════════════════════════════════════
interface BlockSchema {
  version: number;
  blocks: unknown[];
}

export {
  ToolManifest,
  ToolGroup,
  InboxPolicy,
  ToolStatsDimension,
  BlockSchema,
};
