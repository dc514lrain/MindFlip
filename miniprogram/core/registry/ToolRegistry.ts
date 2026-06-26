// 决策大师 (MindFlip) — ToolRegistry 工具注册中心
// 职责: 统一管理所有工具的注册与查询，核心解耦点

import { ToolManifest } from './ToolManifest';

class ToolRegistry {
  private tools: Map<string, ToolManifest> = new Map();

  /** 注册一个工具（各工具入口文件调用） */
  register(manifest: ToolManifest): void {
    if (this.tools.has(manifest.id)) {
      console.warn(`[ToolRegistry] 工具 "${manifest.id}" 重复注册，将被覆盖`);
    }
    this.tools.set(manifest.id, manifest);
  }

  /** 获取单个工具清单 */
  get(id: string): ToolManifest | undefined {
    return this.tools.get(id);
  }

  /** 获取全部已注册工具 */
  getAll(): ToolManifest[] {
    return Array.from(this.tools.values());
  }

  /** 按分组筛选 */
  getByGroup(group: string): ToolManifest[] {
    return this.getAll().filter(t => t.group === group);
  }

  /** 获取首页推荐（按指定排序） */
  getForHome(): { instant: ToolManifest[]; decision: ToolManifest[] } {
    return {
      instant: this.getByGroup('instant'),
      decision: this.getByGroup('decision'),
    };
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry();
export { ToolRegistry };
