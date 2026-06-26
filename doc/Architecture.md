# 决策大师 (MindFlip) — 技术架构文档

> **Baseline:** [FeatureAnalyze.md](FeatureAnalyze.md)  
> **适用阶段:** Phase 1 (MVP V1.0) — 基础决策工具 + 待决清单 + 人格标签  
> **最后更新:** 2026-06-27

---

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (微信小程序)                       │
│                                                             │
│  Skyline 渲染引擎 · Glass-Easel 组件 · TypeScript             │
│  mobx-miniprogram (状态管理)                                   │
│  DataService 防腐层 (隔离 wx API / CloudBase)                  │
│  ToolRegistry (工具注册中心 · 可插拔)                          │
│  CryptoService (端侧 AES-256-GCM 加密 · Phase 2 深度使用)      │
├─────────────────────────────────────────────────────────────┤
│                     Gateway                                  │
│                                                             │
│  CloudBase HTTP API (自动鉴权 · 自带微信 OpenID)              │
│  wx.cloud.callFunction() — 云函数调用                         │
│  wx.cloud.database() — 文档型数据库直连 (受权限策略约束)        │
│  wx.cloud.uploadFile() — 云存储 (海报/头像)                    │
├─────────────────────────────────────────────────────────────┤
│                  Service Layer (云函数)                       │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  login   │ │ decision │ │  inbox   │ │  stats   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │subscribe │ │personality│ │scheduler │ │  share   │      │
│  │  _msg    │ │  _calc   │ │ (定时)   │ │ (Phase2) │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                               │
│                                                             │
│  CloudBase 文档型数据库 (collections)                         │
│  CloudBase 云存储 (图片/海报)                                  │
│  本地 Storage (登录缓存 / 草稿 / 工具运行历史)                  │
│  CloudBase 定时触发器 (24h/48h 推送调度)                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 核心原则

1. **客户端重 UI，云函数重逻辑。** 小程序端负责渲染和交互，数据计算和业务规则上收云函数。
2. **DataService 防腐层。** 所有数据 I/O 通过 `DataService` 抽象层，不直接在页面中调用 `wx.cloud.*` 或 `wx.setStorage`。
3. **工具即模块 (Tool as Module)。** 每个决策工具是自包含的独立模块，通过标准接口注册到 `ToolRegistry`。
4. **精致动画分层。** 极速组工具（硬币/骰子）使用 Canvas 2D 实现 60fps 拟真物理动画；通用 UI 过渡使用 Skyline worklet。两种动画技术按场景分工，不互相替代。
5. **Phase 1 数据模型预留 Phase 2 字段。** 数据库 Schema 现在就开始记录 `UnionID`、预留 `custom_schema` 类型、预留 `privacy_mode` 字段。

---

## 2. 技术栈明细

| 层级 | 选型 | 版本 | 说明 |
|------|------|:----:|------|
| 渲染引擎 | Skyline | 3.x+ | `skylineRenderEnable: true` 已启用 |
| 组件框架 | Glass-Easel | latest | `componentFramework: "glass-easel"` |
| 语言 | TypeScript | 5.x strict | 编译目标 ES2020 |
| 状态管理 | mobx-miniprogram | 6.x | Observable + computed + reactions |
| 状态绑定 | mobx-miniprogram-bindings | 3.x | `ComponentWithStore` / `PageWithStore` |
| 后端 | 微信云开发 CloudBase | latest | 云函数 (Node.js 18) + 文档型 DB + 云存储 |
| 2D 动画 | Canvas 2D (微信原生 API) | — | 硬币/骰子 60fps 拟真物理动画，详见 § 4.6 |
| 加密 | CryptoJS (Phase 2) | 4.x | AES-256-GCM + PBKDF2 密钥派生 |

### 2.1 依赖清单 (`package.json` Phase 1)

```json
{
  "dependencies": {
    "mobx-miniprogram": "^6.0.0",
    "mobx-miniprogram-bindings": "^3.0.0"
  },
  "devDependencies": {
    "miniprogram-api-typings": "^4.0.0"
  }
}
```

> Phase 2 追加：`crypto-js`（端侧加密）、`fabric` 或 `canvas` 海报生成库。

---

## 3. 目录结构

```
MindFlip/
├── miniprogram/                    # 小程序源码根目录
│   ├── app.ts                      # 入口：Store 初始化、登录流程
│   ├── app.json                    # 路由注册、window/tabBar 配置
│   ├── app.wxss                    # 全局样式变量 (colors/spacing/typography)
│   │
│   ├── core/                       # ═══ 核心框架层 ═══
│   │   ├── services/
│   │   │   └── DataService.ts      # 防腐层：所有数据 I/O 抽象
│   │   ├── stores/
│   │   │   ├── AppStore.ts         # 全局：用户信息、VIP 状态、登录态
│   │   │   ├── InboxStore.ts       # 待决清单：pending 列表、未读计数
│   │   │   └── StatsStore.ts       # 统计：人格标签、遵循率、分布数据
│   │   ├── registry/
│   │   │   ├── ToolRegistry.ts     # 工具注册中心（核心解耦点）
│   │   │   └── ToolManifest.ts     # 工具清单 TypeScript 接口定义
│   │   └── utils/
│   │       ├── router.ts           # 统一路由跳转封装
│   │       ├── date.ts             # 时间格式化、48h 过期计算
│   │       ├── haptic.ts           # 触觉反馈封装 (Taptic Engine)
│   │       ├── easing.ts           # 缓动函数库 (Canvas 2D / worklet 共用)
│   │       └── subscribe.ts        # 订阅消息授权流程封装
│   │
│   ├── tools/                      # ═══ 决策工具层 (可插拔) ═══
│   │   ├── _base/                  # 工具基类与共享组件
│   │   │   ├── ToolBase.ts         # 所有工具需实现的抽象接口
│   │   │   ├── ToolBase.wxml       # 工具页通用壳 (header/footer/loading)
│   │   │   └── components/         # 跨工具复用组件
│   │   │       ├── result-flyer/   # 结果飞入 Inbox 动画组件
│   │   │       └── action-sheet/   # 遵循/未遵循操作浮层
│   │   ├── coin/                   # 🔵 硬币工具
│   │   │   ├── manifest.ts         # 工具注册清单 (唯一入口)
│   │   │   ├── coin.ts             # 核心逻辑：随机算法、备忘处理
│   │   │   ├── coin.wxml           # 使用态页面 (含 Canvas 节点)
│   │   │   ├── coin.wxss
│   │   │   ├── coin.canvas.ts      # Canvas 2D 动画引擎 (硬币旋转/翻转)
│   │   │   └── coin.stats.wxml     # 统计视图 (嵌入 tool-stats 页)
│   │   ├── dice/                   # 🔵 骰子工具
│   │   │   ├── manifest.ts
│   │   │   ├── dice.ts
│   │   │   ├── dice.wxml           # 使用态页面 (含 Canvas 节点)
│   │   │   ├── dice.wxss
│   │   │   ├── dice.canvas.ts      # Canvas 2D 动画引擎 (骰子滚动/碰撞)
│   │   │   └── dice.stats.wxml
│   │   ├── roulette/               # 🟢 大转盘工具
│   │   │   ├── manifest.ts
│   │   │   ├── roulette.ts
│   │   │   ├── roulette.wxml
│   │   │   ├── roulette.wxss
│   │   │   └── roulette.stats.wxml
│   │   └── pros-cons/              # 🟢 优缺点对比工具
│   │       ├── manifest.ts
│   │       ├── pros-cons.ts
│   │       ├── pros-cons.wxml
│   │       ├── pros-cons.wxss
│   │       └── pros-cons.stats.wxml
│   │
│   ├── pages/                      # ═══ 页面层 ═══
│   │   ├── index/                  # 首页 · 决策 Tab
│   │   ├── review/                 # 复盘 Tab (Inbox + Insights)
│   │   ├── me/                     # 我的 Tab
│   │   ├── tool-run/               # 工具使用态通用页 (动态路由)
│   │   ├── tool-stats/             # 单工具统计页 (动态路由)
│   │   └── subscribe-guide/        # 订阅消息授权引导页
│   │
│   ├── components/                 # ═══ 全局共享组件 ═══
│   │   ├── editorial-header/       # 杂志风标题排版组件
│   │   ├── personality-badge/      # 人格标签展示组件
│   │   ├── tool-card/              # 工具卡片通用组件
│   │   ├── inbox-flyer/            # Inbox 飞入动效组件
│   │   ├── subscribe-modal/        # 订阅消息授权半屏弹窗
│   │   └── vip-gate/               # VIP 功能门控组件
│   │
│   ├── styles/                     # ═══ 全局样式 ═══
│   │   ├── variables.wxss          # CSS 变量：颜色/字号/间距/网格
│   │   ├── editorial.wxss          # 杂志风排版公用 class
│   │   └── reset.wxss              # 样式重置
│   │
│   └── assets/                     # ═══ 静态资源 ═══
│       ├── icons/                  # Tab Bar 图标、工具图标
│       ├── fonts/                  # 杂志风定制字体 (若需)
│       └── templates/              # 工具模板预览缩略图 (Free 首页展示)
│
├── cloudfunctions/                 # ═══ 云函数 (Node.js) ═══
│   ├── login/                      # 微信登录 + UnionID 换取
│   ├── decision/                   # 决策记录 CRUD
│   ├── inbox/                      # 待决清单查询与标记
│   ├── stats/                      # 统计数据聚合
│   ├── personality/                # 人格标签计算
│   ├── subscribe/                  # 订阅消息发送
│   └── scheduler/                  # 定时任务触发 (24h/48h)
│
├── doc/                            # ═══ 技术文档 ═══
│   ├── FeatureAnalyze.md           # 产品需求基线
│   ├── Architecture.md             # 本文档
│   ├── DataModel.md                # 数据模型设计
│   ├── API.md                      # 接口设计
│   └── DevelopmentGuide.md         # 开发指南
│
├── project.config.json
├── tsconfig.json
└── package.json
```

---

## 4. 工具注册中心 (Tool Registry) — 核心解耦设计

> **这是整个架构中最重要的解耦点。** 新增一个工具无需修改任何框架代码，只需创建工具模块文件夹并注册一份 manifest。

### 4.1 设计目标

1. **零侵入新增。** 添加一个工具 = 创建 `tools/<new-tool>/` 文件夹 + 编写 `manifest.ts`。`app.json` 只需新增一条路由注册。
2. **统一行为接口。** 所有工具共享同一套生命周期——运行 → 记录 → 进 Inbox → 标记 → 归档。框架层不关心具体工具逻辑，只通过接口调用。
3. **Phase 2 兼容。** Phase 1 的内置工具 manifest 结构与 Phase 2 用户自定义工具的 JSON Schema 来自同一份 `ToolManifest` 接口定义，Block Protocol 引擎直接兼容。

### 4.2 ToolManifest 接口定义

```typescript
// core/registry/ToolManifest.ts

/** 工具所属交互分组（决定首页展示策略） */
type ToolGroup = 'instant' | 'decision';

/** 工具是否支持进入 Inbox */
type InboxPolicy =
  | 'auto'        // 自动进入 Inbox（硬币/骰子/转盘）
  | 'user_choice' // 用户自选（优缺点对比）
  | 'custom'      // 构建者配置（Phase 2 自定义工具）
  | 'none';       // 不进 Inbox

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

  /** 使用态页面路由 (如 pages/tool-run/tool-run?id=coin) */
  runRoute: string;

  /** 统计视图路由 (如 pages/tool-stats/tool-stats?id=coin) */
  statsRoute: string;

  /** 该工具特有的统计维度（在单工具统计页展示哪些图表） */
  statsDimensions: ToolStatsDimension[];

  /** Phase 2 预留：该工具是否支持作为模板供自定义工具克隆 */
  canBeTemplate?: boolean;

  /** Phase 2 预留：自定义工具模板的 JSON Schema（内置工具为 undefined） */
  blockSchema?: BlockSchema;
}

/** 统计维度枚举 */
type ToolStatsDimension =
  | 'frequency'       // 使用频次
  | 'time_heatmap'     // 时间分布热力图
  | 'result_distribution'  // 结果分布
  | 'follow_rate'      // 遵循率
  | 'break_reason_pie' // 未遵循原因饼图
  | 'history_timeline'; // 历史记录时间线
```

### 4.3 ToolRegistry 实现

```typescript
// core/registry/ToolRegistry.ts

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
```

### 4.4 工具 manifest 示例（以硬币为例）

```typescript
// tools/coin/manifest.ts

import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const coinManifest: ToolManifest = {
  id: 'coin',
  name: '抛硬币',
  description: '正面还是反面？把选择交给天意',
  icon: '/assets/icons/coin.svg',
  group: 'instant',
  inboxPolicy: 'auto',
  runRoute: '/pages/tool-run/tool-run?id=coin',
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

// 自注册：文件被 import 时自动注册到全局 Registry
toolRegistry.register(coinManifest);
```

### 4.5 新增工具的步骤（写给开发者）

> **只需 4 步，零侵入框架代码。**

1. 在 `miniprogram/tools/` 下创建 `tools/<tool-id>/` 文件夹。
2. 编写 `manifest.ts`，实现 `ToolManifest` 接口并调用 `toolRegistry.register()`。
3. 在 `app.ts` 顶部 `import './tools/<tool-id>/manifest'` 完成激活。
4. 在 `app.json` 中为该工具的页面路由添加一条路径。

详细规范见 [DevelopmentGuide.md § 5. 新增工具 Checklist](DevelopmentGuide.md#5-新增工具-checklist)。

### 4.6 工具动画引擎 (Canvas 2D)

> **适用范围：** 极速组工具——硬币、骰子。这类工具的核心体验依赖拟真的物理动画，需使用 Canvas 2D 而非 worklet/纯 CSS 实现。

#### 4.6.1 为什么选择 Canvas 2D

| 对比维度 | Canvas 2D | Skyline worklet | CSS Animation |
|---------|:---------:|:--------------:|:------------:|
| 逐帧绘制能力 | ✅ 完全控制每一帧 | ⚠️ 受限，偏声明式 | ❌ 无法逐帧控制 |
| 物理模拟 | ✅ 可接入简单物理引擎 | ❌ 不支持 | ❌ 不支持 |
| 复杂纹理/序列帧 | ✅ 支持图片序列帧 | ⚠️ 受限 | ❌ 无序列帧 |
| 60fps 稳定性 | ✅ GPU 加速 | ✅ GPU 加速 | ⚠️ 主线程阻塞时掉帧 |
| 与 Skyline 兼容性 | ✅ `wx.createCanvasContext` 在 Skyline 下可用 | ✅ 原生 | ✅ 部分属性不可用 |
| 开发复杂度 | 🔴 较高 (需手写绘制逻辑) | 🟢 低 (声明式) | 🟢 低 |

**结论：** Canvas 2D 是硬币翻转序列帧、骰子 3D 滚动模拟、粒子特效等"精致微交互"的唯一合理选择。worklet 仅用于非逐帧的通用 UI 过渡（如结果卡片飞入 Inbox、Tab 切换动效）。

#### 4.6.2 Canvas 动画数据流

```
[用户点击"抛硬币"]
        │
        ▼
[coin.ts: flipCoin()]  ──→  随机算法确定结果 (heads/tails)
        │
        ▼
[coin.canvas.ts: playAnimation(result)]
        │
        ├── 阶段 1: 蓄力 (scale 微缩 + 震动 0-200ms)
        ├── 阶段 2: 旋转 (序列帧/旋转矩阵 200-800ms)
        ├── 阶段 3: 揭晓 (结果面定格 + 粒子爆发 800-1000ms)
        │
        ▼
[Canvas 2D requestAnimationFrame 循环]
  每帧执行:
  1. ctx.clearRect()
  2. 计算当前阶段进度 (easing function)
  3. 绘制当前帧 (旋转矩阵变换 + 纹理贴图)
  4. 若动画未结束 → requestAnimationFrame(下一帧)
  5. 若动画结束 → 回调通知 coin.ts 展示结果
        │
        ▼
[触觉反馈] triggerHaptic('heavy') 在阶段 1 起始触发
        │
        ▼
[结果展示] → 进入 Inbox 数据流
```

#### 4.6.3 动画模块接口契约

每个使用 Canvas 2D 的工具需导出统一的动画接口，方便后续接入和测试：

```typescript
// tools/<tool-id>/<tool-id>.canvas.ts

interface CanvasAnimation {
  /** 初始化 Canvas 上下文，绑定 WXML 中的 canvas 节点 */
  init(canvasId: string, ctx: wx.CanvasContext): void;

  /** 播放动画，result 为工具已确定的随机结果 */
  play(result: string): Promise<void>;  // Promise 在动画完成时 resolve

  /** 销毁动画，释放资源（页面 onUnload 时调用） */
  destroy(): void;
}
```

#### 4.6.4 性能约束

| 指标 | 目标 | 实现手段 |
|------|:----|---------|
| 帧率 | 稳定 60fps | `requestAnimationFrame` + Canvas GPU 加速 |
| 动画时长 | 800-1000ms | 硬币 3 阶段共 ~1s，骰子滚动 ~1.2s |
| 首帧时间 | < 50ms | `wx.createCanvasContext` 在 `onLoad` 中预先创建 |
| 内存 | < 10MB | 动画纹理使用小尺寸 PNG (≤ 256×256px)，动画结束及时释放 |

#### 4.6.5 工具差异化动画策略

| 工具 | 动画方案 | 说明 |
|------|---------|------|
| **硬币** | Canvas 2D 序列帧 | 硬币旋转翻转效果——正面→侧面→反面 3D 透视变化，使用预渲染的 PNG 序列帧 (8-12 帧) 或 Canvas 矩阵变换实时绘制 |
| **骰子** | Canvas 2D + 简单物理 | 骰子滚动碰撞效果——使用缓动函数模拟骰子在桌面滚动的减速过程，最终定格在结果面 |
| **大转盘** | Canvas 2D 旋转动画 | 转盘扇区绘制 + 缓动旋转 + 指针停靠效果。Phase 1 可用 worklet 简化实现，Phase 2 升级 Canvas |
| **优缺点对比** | 无 Canvas 动画 | 不需要拟真物理效果，使用标准 worklet 卡片展开/折叠过渡 |

> **开发优先级：** 硬币 → 骰子 → 大转盘。硬币和骰子必须在 Phase 1 交付 Canvas 2D 精致动画。大转盘可先用 worklet 简化版，Canvas 版在 Phase 1.1 优化。

---

## 5. MobX Store 架构

### 5.1 Store 职责划分

```
AppStore (全局)
├── user: UserProfile          # 微信头像/昵称/OpenID/UnionID
├── vip: VipStatus             # 会员等级、到期时间
├── isLogin: boolean           # 登录态
└── actions: login / refreshVip / ...

InboxStore (待决清单)
├── pendingList: Decision[]    # 近 48h 未标记决策
├── unreadCount: number        # 未处理条数（小红点）
├── bannerDismissed: boolean   # 订阅消息 Banner 状态
└── actions: loadList / markFollowed / dismissBanner / ...

StatsStore (统计)
├── overview: StatsOverview    # 总次数 / 总遵循率
├── personality: Personality   # 主标签 + 副标签
├── toolDistribution: ToolDist[] # 工具使用分布
├── preheatProgress: number    # 冷启动预热进度 (0-10)
└── actions: refreshOverview / computePersonality / ...
```

### 5.2 Store 与页面的绑定方式

```typescript
// pages/index/index.ts — Page 绑定
import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { appStore } from '../../core/stores/AppStore';
import { inboxStore } from '../../core/stores/InboxStore';

Page({
  behaviors: [storeBindingsBehavior],
  storeBindings: [
    {
      store: appStore,
      fields: ['user', 'vip'],
    },
    {
      store: inboxStore,
      fields: ['unreadCount'],
      actions: [],
    },
  ],
  // ...页面逻辑
});
```

```typescript
// Component 绑定同理，使用 ComponentWithStore 模式
import { ComponentWithStore } from 'mobx-miniprogram-bindings';
```

---

## 6. DataService 防腐层

> 所有数据 I/O 通过 `DataService` 完成。页面/Store 不直接调用 `wx.cloud.*` 或 `wx.setStorage`。

```typescript
// core/services/DataService.ts

class DataService {
  // ═══ 决策记录 ═══
  async saveDecision(decision: DecisionCreate): Promise<string>;      // 写入决策记录
  async queryDecisions(filter: DecisionFilter): Promise<Decision[]>;    // 查询决策列表
  async markDecision(id: string, status: FollowStatus, reason?: string): Promise<void>;

  // ═══ 用户 ═══
  async getUserProfile(openid: string): Promise<UserProfile>;
  async updateUserProfile(data: Partial<UserProfile>): Promise<void>;

  // ═══ 统计 ═══
  async getStatsOverview(userId: string): Promise<StatsOverview>;
  async getToolStats(userId: string, toolId: string): Promise<ToolStats>;

  // ═══ 人格标签 ═══
  async getPersonality(userId: string): Promise<Personality>;
  async savePersonality(userId: string, tags: Personality): Promise<void>;

  // ═══ 工具模板 (Phase 2) ═══
  async saveToolTemplate(template: ToolTemplate): Promise<string>;
  async getToolTemplates(userId: string): Promise<ToolTemplate[]>;

  // ═══ 本地缓存 ═══
  getLocalCache<T>(key: string): T | null;
  setLocalCache<T>(key: string, value: T, ttlMs?: number): void;
}
```

**实现策略：** Phase 1 中 `DataService` 内部直接调用 CloudBase API。后期如需迁移至独立后端，只需替换 `DataService` 的实现，调用方零感知。

---

## 7. 路由与导航设计

### 7.1 Tab Bar 页面 (app.json)

```json
{
  "tabBar": {
    "custom": true,
    "list": [
      { "pagePath": "pages/index/index" },
      { "pagePath": "pages/review/review" },
      { "pagePath": "pages/quick/quick" },
      { "pagePath": "pages/me/me" }
    ]
  }
}
```

> 使用 `custom: true` 自定义 Tab Bar，中间放凸起快速决策按钮。

### 7.2 非 Tab 页面路由

| 路由 | 页面 | 传参 |
|------|------|------|
| `/pages/tool-run/tool-run` | 工具使用态通用页 | `?id=coin` (工具 ID) |
| `/pages/tool-stats/tool-stats` | 单工具统计页 | `?id=coin` (工具 ID) |
| `/pages/subscribe-guide/subscribe-guide` | 订阅消息授权引导 | `?from=inbox` (来源标识) |

### 7.3 路由统一封装

```typescript
// core/utils/router.ts
export const Router = {
  /** 打开工具使用页 */
  openTool(toolId: string): void {
    wx.navigateTo({ url: `/pages/tool-run/tool-run?id=${toolId}` });
  },
  /** 打开工具统计页 */
  openToolStats(toolId: string): void {
    wx.navigateTo({ url: `/pages/tool-stats/tool-stats?id=${toolId}` });
  },
  /** 切换到复盘 Tab (跨 Tab 使用 switchTab) */
  switchToReview(): void {
    wx.switchTab({ url: '/pages/review/review' });
  },
};
```

---

## 8. CloudBase 资源规划

### 8.1 云函数清单

| 云函数名 | 触发方式 | 超时 | 内存 | 频次限制 |
|---------|:------:|:----:|:----:|:------:|
| `login` | HTTP 调用 (由小程序端每次启动触发) | 3s | 256MB | — |
| `decision` | HTTP 调用 (工具运行后) | 3s | 256MB | — |
| `inbox` | HTTP 调用 (待决清单页) | 3s | 256MB | — |
| `stats` | HTTP 调用 (统计页) | 5s | 512MB | — |
| `personality` | HTTP 调用 (手动刷新或每周自动) | 5s | 512MB | — |
| `subscribe` | HTTP 调用 + 云函数内调用 `cloud.openapi.subscribeMessage.send` | 10s | 256MB | 微信订阅消息 API 限额 |
| `scheduler` | **定时触发器** (每天 9:00 触发) | 30s | 256MB | 1 次/天 |

### 8.2 定时触发器配置

```json
// cloudfunctions/scheduler/config.json
{
  "triggers": [
    {
      "name": "daily_inbox_push",
      "type": "timer",
      "config": "0 0 9 * * * *"   // 每天 9:00 北京时间
    }
  ]
}
```

`scheduler` 云函数执行逻辑：
1. 查询所有 `follow_status = "pending"` 且 `24h <= created_at < 48h` 的决策记录。
2. 按用户聚合，生成"你有 N 个决定等待复盘"推送内容。
3. 调用 `cloud.openapi.subscribeMessage.send` 逐用户发送。
4. 将超过 48h 的 pending 记录标记为 `expired`。

---

## 9. 核心数据流

### 9.1 决策生命周期

```
[用户使用工具]
      │
      ▼
[工具产生随机结果]
      │
      ├──→ DataService.saveDecision() ──→ decision_logs 集合 (status=pending)
      │
      ├──→ InboxStore.pendingList 更新 (unreadCount++)
      │
      ├──→ 订阅消息定时器启动 (24h 后推送)
      │
      ▼
[用户在待决清单中标记]
      │
      ├── "遵循了" → status=followed, reason=null
      └── "没遵循" → status=not_followed, reason=系统标签
      │
      ▼
[DataService.markDecision()] ──→ decision_logs 集合 (status 更新)
      │
      ├──→ InboxStore 移除该条记录
      ├──→ StatsStore.refreshOverview()
      └──→ 如果累计标记 >= 10: PersonalityStore.computePersonality()
```

### 9.2 登录流程

```
[小程序启动]
      │
      ├── 本地 Storage 有 token?
      │   ├── Yes → DataService.getUserProfile() 恢复登录态
      │   └── No  → wx.login() 获取 code
      │               │
      │               ▼
      │            wx.cloud.callFunction({ name: 'login', data: { code } })
      │               │
      │               ├── 云函数调用 wx.auth.code2Session 换取 OpenID/UnionID
      │               ├── 查询/创建 users 集合记录
      │               └── 返回 UserProfile + token
      │
      ▼
[AppStore 更新登录态 → 页面渲染]
```

---

## 10. 安全策略

### 10.1 客户端 → 云函数通信

- 使用 CloudBase HTTP API，自带微信用户身份鉴权。
- 云函数通过 `cloud.getWXContext()` 获取 `OPENID` / `UNIONID`，不可伪造。

### 10.2 数据库权限

| 集合 | 读权限 | 写权限 |
|------|:------|:------|
| `users` | 仅创建者可读 | 仅创建者可写 |
| `decision_logs` | 仅创建者可读 | 仅创建者可写 |
| `personality_tags` | 仅创建者可读 | 仅创建者可写 (或云函数写) |
| `subscribe_config` | 仅创建者可读 | 仅创建者可写 |

> 所有集合设置 `"read": "doc._openid == auth.openid"`, `"write": "doc._openid == auth.openid"`。

### 10.3 隐私保护

- **输入数据阅后即焚：** 硬币/骰子/转盘/优缺点工具的原始输入参数不写入 `decision_logs`，仅记录 `semantic_result`。
- **端侧加密预留：** `DataService` 中预留 `encrypt(template, pin)` / `decrypt(encryptedTemplate, pin)` 方法签名，Phase 2 填充 CryptoJS 实现。

---

## 11. 性能目标

| 指标 | 目标值 | 测量工具 |
|------|:------|------|
| 首屏 FCP | < 1.5s | 微信性能面板 |
| 抛硬币动画 | 60fps | Skyline 帧率监控 |
| 云函数冷启动 | < 500ms | CloudBase 控制台 |
| 待决清单列表加载 | < 300ms (200 条内) | DataService 打点 |

性能策略：
- **Canvas 2D 动画 (硬币/骰子)：** 使用 `wx.createCanvasContext` + `requestAnimationFrame` 逐帧绘制，稳定 60fps。动画纹理 (PNG) 在 `onLoad` 阶段预加载，避免运行时 I/O。动画结束后释放 Canvas 上下文。
- **Skyline worklet 动画 (通用 UI 过渡)：** 结果卡片飞入 Inbox、Tab 切换、浮层升起等通用动效使用 worklet 声明式动画。
- 待决清单分页加载，每页 20 条。
- 统计页数据由云函数预聚合，客户端只做渲染。

---

## 12. Phase 1 → Phase 2 架构演进预留

| 维度 | Phase 1 实现 | Phase 2 扩展方式 |
|------|-------------|----------------|
| 工具类型 | `ToolManifest.id` 为内置枚举 (`coin/dice/roulette/pros_cons`) | 增加 `custom_schema` 类型，读取 `ToolManifest.blockSchema` |
| 工具数量 | 内置 4 个，不可由用户创建 | Block Protocol 引擎渲染用户自定义 JSON Schema，`ToolRegistry` 支持动态注册 |
| 用户工具槽位 | Free 1 个 / VIP 5 个字段在 `users` 集合已预留 | Block Protocol 编辑器上线后直接可用 |
| 隐私模式 | `users.privacy_mode` 字段已预留，默认 `standard` | Phase 2 上线 `deep` 模式，CryptoJS 端侧加密 |
| 分享 | `share` 云函数骨架已保留 | Phase 2 实现快照打包与版本锁定 |
| 数据导出 | 海报图片导出 (Canvas) | Phase 2 追加 JSON/CSV 数据导出 |

---

## 13. 关键设计决策记录 (ADR)

| ID | 决策 | 理由 | 日期 |
|:---|------|------|:----:|
| ADR-1 | 原生 WXML + Skyline | 性能最优、Skyline 新特性完整访问、Phase 3 前无需跨端 | 2026-06-27 |
| ADR-2 | 纯 CloudBase 后端 | MVP 阶段免运维、文档型 DB 天然匹配 JSON Schema、定时触发器满足推送需求 | 2026-06-27 |
| ADR-3 | mobx-miniprogram 状态管理 | 官方推荐、Observable 细粒度更新匹配 Skyline 渲染引擎、computed 自动派生统计数据 | 2026-06-27 |
| ADR-4 | 工具注册中心 (ToolRegistry) | 零侵入新增工具、标准 manifest 接口、Phase 2 Block Protocol 直接兼容 | 2026-06-27 |
| ADR-5 | DataService 防腐层 | UI 层不接触 wx.cloud.*、后期迁移后端只需改 Service 实现 | 2026-06-27 |
| ADR-6 | Canvas 2D 用于硬币/骰子精致动画 | 极速组工具核心体验依赖拟真物理效果。Canvas 2D 提供逐帧控制、序列帧绘制和物理模拟能力，是 60fps 精致微交互的唯一合理选择。worklet 仅用于通用 UI 过渡动效。详见 § 4.6 | 2026-06-27 |
