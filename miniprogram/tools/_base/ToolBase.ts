// 决策大师 (MindFlip) — 工具基类 (ToolBase)
// 职责: 定义所有决策工具的标准接口，供各工具模块实现

/**
 * 工具运行结果
 */
export interface ToolResult {
  raw_result: string;
  semantic_result: string;
  user_memo?: string;
}

/**
 * 工具输入参数（各工具可扩展）
 */
export interface ToolInput {
  memo?: string;
}

/**
 * ToolBase — 所有工具的抽象基类接口
 *
 * 工具模块必须实现:
 * - execute(input: ToolInput): ToolResult  — 执行工具并产出结果
 * - validate?(input: ToolInput): { valid: boolean; message?: string }  — 可选：输入校验
 *
 * 工具模块可选择性实现:
 * - getAnimation?(): CanvasAnimationEngine | null  — 返回 Canvas 2D 动画引擎（如有）
 */
export interface ToolBase {
  /** 工具 ID，与 manifest.id 一致 */
  readonly toolId: string;

  /** 执行工具，产出标准化结果 */
  execute(input: ToolInput): ToolResult;

  /** 工具特定的输入校验（可选） */
  validate?(input: ToolInput): { valid: boolean; message?: string };
}

/**
 * Canvas 动画引擎接口（硬币/骰子专用）
 */
export interface CanvasAnimationEngine {
  /** 初始化 Canvas 上下文 */
  init(canvasId: string, ctx: unknown): void;

  /** 播放动画，result 为已确定的随机结果 */
  play(result: string): Promise<void>;

  /** 销毁动画，释放资源 */
  destroy(): void;
}
