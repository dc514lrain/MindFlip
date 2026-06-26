# 决策大师 (MindFlip) — 开发指南

> **Baseline:** [Architecture.md](Architecture.md), [API.md](API.md), [DataModel.md](DataModel.md)  
> **适用阶段:** Phase 1 (MVP V1.0)

---

## 1. 环境搭建

### 1.1 所需工具

| 工具 | 用途 | 下载 |
|------|------|------|
| 微信开发者工具 | 小程序开发、调试、预览 | [developers.weixin.qq.com](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| Node.js 18 LTS | 云函数运行时 + npm | [nodejs.org](https://nodejs.org/) |
| CloudBase CLI (`@cloudbase/cli`) | 云函数本地调试与部署 | `npm install -g @cloudbase/cli` |
| Git | 版本管理 | [git-scm.com](https://git-scm.com/) |

### 1.2 项目初始化

```bash
# 1. 克隆仓库
git clone <repo-url> MindFlip
cd MindFlip

# 2. 安装依赖
npm install

# 3. 用微信开发者工具打开项目根目录
#    选择 "小程序" 项目类型
#    填入 AppID: wxf80d3193e000946f

# 4. 在微信开发者工具中开通云开发
#    工具栏 → 云开发 → 开通 → 创建环境 (env: mindflip-dev)

# 5. 部署云函数
#    在微信开发者工具中, 右键每个 cloudfunctions 下的函数 → 上传并部署
```

### 1.3 项目配置文件说明

| 文件 | 说明 |
|------|------|
| `project.config.json` | 小程序项目配置。`skylineRenderEnable: true` 启用 Skyline |
| `tsconfig.json` | TypeScript 编译配置。`strict: true`，所有严格模式全开 |
| `package.json` | npm 依赖管理。Phase 1 仅 `mobx-miniprogram` + `mobx-miniprogram-bindings` |

### 1.4 Skyline 开发前提

当前项目已配置:
- `skylineRenderEnable: true` — Skyline 渲染引擎
- `componentFramework: "glass-easel"` — Glass-Easel 组件框架
- `lazyCodeLoading: "requiredComponents"` — 按需注入

**Skyline 与 WebView 的核心差异需注意:**
- 不支持 `window` / `document` 等 DOM API
- 样式使用 WXSS 子集，部分 CSS 属性不可用（详见微信官方 Skyline 文档）
- 使用 `worklet` 动画机制替代 CSS Animation
- 页面的 `Page` 构造器需显式指定 `renderer: 'skyline'` (在页面 json 中配置)

---

## 2. 编码规范

### 2.1 TypeScript 规范

- `strict` 模式全开：`strictNullChecks`, `noImplicitAny`, `noUnusedLocals` 等全部启用。
- 所有函数签名必须有返回值类型标注。
- 禁止使用 `any`，特殊情况需注释说明并过 Code Review。
- 导出模块使用命名导出 (`export class` / `export const`)，避免 `export default`。

```typescript
// ✅ 正确的函数签名
function computeFollowRate(followed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((followed / total) * 100);
}

// ❌ 禁止: 无返回值类型、隐式 any
function computeFollowRate(followed, total) {
  return (followed / total) * 100;
}
```

### 2.2 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面 | `kebab-case` 文件夹，四文件同名 | `pages/tool-stats/tool-stats.ts` |
| 组件 | `kebab-case` 文件夹，四文件同名 | `components/personality-badge/personality-badge.ts` |
| Store | `PascalCaseStore.ts` | `core/stores/InboxStore.ts` |
| 工具模块 | 文件夹 `kebab-case`，逻辑 `kebab-case.ts` | `tools/coin/coin.ts` |
| 工具 manifest | `manifest.ts` (统一命名) | `tools/coin/manifest.ts` |
| 类型/接口 | `PascalCase` | `DecisionLog`, `ToolManifest` |

### 2.3 目录结构约定

```
每个功能模块必须包含:
├── module.ts      # 核心逻辑
├── module.wxml    # 视图模板
├── module.wxss    # 样式
└── module.json    # 页面/组件配置

工具模块额外包含:
├── manifest.ts    # 工具注册清单 (唯一入口)
└── module.stats.wxml  # 统计视图 (可选，嵌入 tool-stats 页)
```

### 2.4 ESLint / Prettier

> Phase 1 暂不强制配置 ESLint。TypeScript 编译器的 `strict` 模式已提供足够的静态检查。Phase 2 若团队扩大再加。

---

## 3. Skyline 开发规范

### 3.1 页面声明为 Skyline 渲染

每个页面的 `.json` 文件中显式声明:

```json
// pages/coin/coin.json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "usingComponents": {}
}
```

### 3.2 动画方案选型：Canvas 2D vs worklet

项目使用两种动画技术，按场景严格分工：

```
┌─────────────────────────────────────────────────────┐
│              动画方案决策树                           │
│                                                     │
│  是否需要逐帧控制 / 物理模拟 / 序列帧？               │
│       ├── YES ──→ Canvas 2D                        │
│       │           硬币翻转、骰子滚动、转盘旋转        │
│       │                                            │
│       └── NO  ──→ 是 UI 过渡/微动效？               │
│                     ├── YES ──→ Skyline worklet    │
│                     │           卡片飞入、浮层升降   │
│                     │                              │
│                     └── NO  ──→ WXSS transition    │
│                                 颜色切换、透明度渐变  │
└─────────────────────────────────────────────────────┘
```

#### 3.2.1 Canvas 2D 动画开发 (硬币/骰子专用)

**Canvas 2D 小程序 API:**

```typescript
// tools/coin/coin.canvas.ts — 硬币 Canvas 2D 动画模块

interface CoinCanvasAnimation {
  init(canvasId: string, ctx: wx.CanvasContext): void;
  play(result: 'heads' | 'tails'): Promise<void>;
  destroy(): void;
}

export function createCoinAnimation(): CoinCanvasAnimation {
  let ctx: wx.CanvasContext | null = null;
  let rafId: number = 0;
  let phase: 'idle' | 'winding' | 'flipping' | 'revealing' = 'idle';

  return {
    init(canvasId: string, canvasCtx: wx.CanvasContext): void {
      ctx = canvasCtx;
      // 预加载动画纹理（硬币正反面 PNG）
      // 设置 Canvas 尺寸适配屏幕 DP
    },

    play(result: 'heads' | 'tails'): Promise<void> {
      return new Promise(resolve => {
        phase = 'winding';
        const startTime = Date.now();

        const frame = (): void => {
          const elapsed = Date.now() - startTime;
          ctx!.clearRect(0, 0, 300, 300);

          // ═══ 阶段驱动绘制 ═══
          if (elapsed < 200) {
            // 阶段 1: 蓄力 — 硬币微缩 + 震动偏移
            this._drawWinding(elapsed);
          } else if (elapsed < 800) {
            // 阶段 2: 旋转 — Canvas 矩阵变换实现 3D 翻转透视
            this._drawFlipping(elapsed - 200, result);
          } else if (elapsed < 1000) {
            // 阶段 3: 揭晓 — 结果面定格 + 粒子爆发
            this._drawRevealing(elapsed - 800, result);
          } else {
            // 动画完成
            phase = 'idle';
            resolve();
            return;
          }

          rafId = requestAnimationFrame(frame);
        };

        rafId = requestAnimationFrame(frame);
      });
    },

    destroy(): void {
      if (rafId) cancelAnimationFrame(rafId);
      ctx = null;
    },

    _drawWinding(elapsed: number): void { /* 蓄力阶段绘制 */ },
    _drawFlipping(elapsed: number, result: string): void { /* 翻转阶段绘制 */ },
    _drawRevealing(elapsed: number, result: string): void { /* 揭晓阶段绘制 */ },
  };
}
```

**Canvas 2D 动画必须遵守的规则：**

1. **预加载纹理。** 在 `onLoad` 中通过 `wx.getImageInfo` 或 CloudBase 云存储 URL 预加载硬币正反面、骰子 6 面 PNG。动画中不发起网络请求。
2. **阶段驱动。** 每帧通过 `elapsed` 时间判断当前阶段，不同阶段调用不同绘制函数。禁止在帧循环中使用 `setTimeout`/`setInterval`。
3. **缓动函数统一管理。** 所有缓动函数（ease-out, bounce, elastic）收拢到 `core/utils/easing.ts`，禁止在动画模块中内联魔法曲线。

```typescript
// core/utils/easing.ts
export const Easing = {
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeOutBounce: (t: number): number => { /* ... */ },
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};
```

4. **资源释放。** `onUnload` 中必须调用 `animation.destroy()`，取消 `requestAnimationFrame` 并释放 Canvas 上下文。
5. **触觉反馈同步。** 动画的关键帧（硬币离手瞬间、骰子撞击桌面）调用 `triggerHaptic()`。
6. **Canvas 尺寸适配。** 使用 `wx.getSystemInfoSync().pixelRatio` 计算实际像素，避免高分屏模糊。

#### 3.2.2 Skyline worklet 动画 (通用 UI 过渡)

> 适用于结果卡片飞入 Inbox、浮层升降、Tab 切换等**非逐帧**的通用 UI 过渡动效。

```typescript
// 使用 Skyline worklet 的声明式动画
import { animation } from '@skyline/core';

Page({
  flyCardToInbox(): void {
    const flyAnimation = animation.create({
      duration: 400,
      timingFunction: 'ease-in-out',
    });
    flyAnimation
      .translate({ x: -150, y: -300 })
      .scale({ x: 0.3, y: 0.3 })
      .opacity(0.5)
      .execute();
  },
});
```

#### 3.2.3 动画分工一览

| 动画场景 | 技术 | 文件位置 |
|---------|------|---------|
| 硬币翻转/旋转 | Canvas 2D | `tools/coin/coin.canvas.ts` |
| 骰子滚动/碰撞 | Canvas 2D | `tools/dice/dice.canvas.ts` |
| 大转盘旋转 | Canvas 2D (Phase 1.1) / worklet (Phase 1 简化) | `tools/roulette/roulette.canvas.ts` |
| 结果卡片飞入 Inbox | Skyline worklet | `tools/_base/components/result-flyer/` |
| 浮层 (Half-screen Modal) 升起/降下 | Skyline worklet | 全局 Modal 组件 |
| Tab 切换过渡 | Skyline worklet | 自定义 Tab Bar 组件 |
| 按钮 hover/press 态 | WXSS transition | 全局样式 |

---

## 4. MobX Store 开发规范

### 4.1 Store 文件模板

```typescript
// core/stores/InboxStore.ts
import { observable, action, computed, makeObservable } from 'mobx-miniprogram';

export class InboxStore {
  // ═══ 响应式属性 (observable) ═══
  pendingList: DecisionLog[] = [];
  loading: boolean = false;

  // ═══ 计算属性 (computed) ═══
  get unreadCount(): number {
    return this.pendingList.length;
  }

  get hasExpiredItems(): boolean {
    return this.pendingList.some(item => {
      return (Date.now() - item.created_at) > 48 * 3600 * 1000;
    });
  }

  // ═══ 动作 (action) ═══
  async loadList(): Promise<void> {
    this.loading = true;
    try {
      const res = await DataService.queryInbox();
      this.pendingList = res.items;
    } finally {
      this.loading = false;
    }
  }

  async markFollowed(id: string): Promise<void> {
    await DataService.markDecision(id, 'followed');
    // 乐观移除
    this.pendingList = this.pendingList.filter(item => item._id !== id);
  }

  // ═══ 初始化 ═══
  constructor() {
    makeObservable(this, {
      pendingList: observable,
      loading: observable,
      unreadCount: computed,
      hasExpiredItems: computed,
      loadList: action,
      markFollowed: action,
    });
  }
}

// 导出单例
export const inboxStore = new InboxStore();
```

### 4.2 Store 使用规则

**规则 1: Store 只通过 DataService 访问数据。** Store 不直接调用 `wx.cloud.*` 或 `wx.setStorage`。

**规则 2: computed 只做纯计算。** 不在 computed 中发起网络请求或修改 observable。

**规则 3: action 中处理异步。** 所有异步操作 (云函数调用) 必须在 `action` 方法中完成。

**规则 4: 乐观更新优先。** 对于确定性操作 (如标记决策)，先更新本地 Store，再调用云函数。云函数失败时回滚。

### 4.3 页面绑定 Store

```typescript
// pages/index/index.ts
import { storeBindingsBehavior } from 'mobx-miniprogram-bindings';
import { appStore } from '../../core/stores/AppStore';
import { inboxStore } from '../../core/stores/InboxStore';

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: [
    {
      store: appStore,
      fields: ['user'],
      actions: [],
    },
    {
      store: inboxStore,
      fields: ['unreadCount'],
      actions: ['loadList'],
    },
  ],

  onLoad(): void {
    // 使用从 store 绑定来的方法
    (this as any).loadList();
  },
});
```

```xml
<!-- pages/index/index.wxml -->
<view class="inbox-badge" wx:if="{{unreadCount > 0}}">
  {{unreadCount}}
</view>
```

### 4.4 组件绑定 Store

```typescript
// components/personality-badge/personality-badge.ts
import { ComponentWithStore } from 'mobx-miniprogram-bindings';
import { statsStore } from '../../core/stores/StatsStore';

ComponentWithStore({
  storeBindings: {
    store: statsStore,
    fields: ['personality'],
    actions: [],
  },

  properties: {
    size: { type: String, value: 'medium' },  // 'small' | 'medium' | 'large'
  },

  observers: {
    'personality': function (val: Personality | null): void {
      // personality 变化时的副作用 (如触发动效)
    },
  },
});
```

---

## 5. 新增工具 Checklist

> **这是项目中最常见的开发操作。严格遵循以下步骤，确保新增工具零侵入框架代码。**

### 5.1 步骤总览

```
1. 创建工具文件夹    tools/<tool-id>/
2. 实现核心逻辑       tools/<tool-id>/<tool-id>.ts
3. 编写视图          tools/<tool-id>/<tool-id>.wxml + .wxss + .json
4. 编写 manifest     tools/<tool-id>/manifest.ts
5. 激活注册          app.ts 中添加 import
6. 注册路由          app.json pages 数组
7. 编写统计视图      tools/<tool-id>/<tool-id>.stats.wxml (可选)
8. 自测清单          8 项全部通过
```

### 5.2 详细步骤

#### Step 1: 创建工具文件夹

```bash
mkdir miniprogram/tools/<tool-id>
```

文件夹名使用 kebab-case，与 `tool_id` 一致。

#### Step 2: 实现核心逻辑

```typescript
// tools/<tool-id>/<tool-id>.ts

export interface <ToolId>Result {
  raw_result: string;
  semantic_result: string;
}

/**
 * 工具核心逻辑模块
 * 职责: 输入校验 → 执行决策算法 → 产出标准化结果
 */
export class <ToolId>Engine {
  /** 执行工具的核心决策逻辑 */
  static execute(input: <ToolId>Input): <ToolId>Result {
    // 1. 输入校验
    // 2. 执行算法 (随机 / 加权 / 对比)
    // 3. 返回标准化结果
    return { raw_result, semantic_result };
  }

  /** 工具特定的输入校验 */
  static validate(input: <ToolId>Input): { valid: boolean; message?: string } {
    // ...
  }
}
```

#### Step 3: 编写视图

**对于不需要精致动画的工具 (如优缺点对比)：**
按标准 WXML 模板编写即可。

**对于需要精致动画的极速组工具 (硬币/骰子)：**
WXML 中必须包含 Canvas 节点，并在 `.ts` 中完成 Canvas 2D 动画初始化：

```xml
<!-- tools/coin/coin.wxml -->
<view class="tool-container">
  <!-- Canvas 2D 动画画布 -->
  <canvas
    type="2d"
    id="coin-canvas"
    class="coin-canvas"
    bindtouchstart="onFlip"
  />

  <!-- 结果文字叠加层 (动画完成后展示) -->
  <view class="result-overlay" wx:if="{{showResult}}">
    <text class="result-text">{{semanticResult}}</text>
  </view>

  <!-- 事后轻备注 -->
  <view class="memo-input" wx:if="{{showResult}}">
    <input
      placeholder="给这个决定加个备忘（选填）"
      bindinput="onMemoInput"
    />
  </view>
</view>
```

```typescript
// tools/coin/coin.ts — Canvas 2D 初始化与生命周期
import { createCoinAnimation } from './coin.canvas';
import { triggerHaptic } from '../../core/utils/haptic';

Page({
  data: {
    showResult: false,
    semanticResult: '',
  },

  animation: null as ReturnType<typeof createCoinAnimation> | null,

  onLoad(): void {
    // Canvas 2D 初始化：在 onLoad 中创建上下文，避免首帧延迟
    const query = wx.createSelectorQuery();
    query.select('#coin-canvas')
      .fields({ node: true, size: true })
      .exec(res => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        this.animation = createCoinAnimation();
        this.animation.init('coin-canvas', ctx);
      });
  },

  onUnload(): void {
    // Canvas 2D 清理：取消帧循环，释放资源
    this.animation?.destroy();
    this.animation = null;
  },

  async onFlip(): Promise<void> {
    if (!this.animation) return;

    // 1. 先执行随机算法，确定结果
    const result = CoinEngine.flip();  // { raw: 'heads', semantic: '正面' }

    // 2. 触觉反馈：硬币离手瞬间
    triggerHaptic('heavy');

    // 3. 播放 Canvas 2D 动画
    await this.animation.play(result.raw);

    // 4. 动画完成后展示结果
    this.setData({
      showResult: true,
      semanticResult: result.semantic,
    });

    // 5. 写入决策记录
    await DataService.saveDecision({
      tool_type: 'coin',
      raw_result: result.raw,
      semantic_result: result.semantic,
    });
  },
});
```

```json
// tools/coin/coin.json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "usingComponents": {}
}
```

**关键原则：** 结果确定性优先于动画。先执行随机算法拿到确定结果，再播放动画——动画是为了"揭示"结果，而非"产生"结果。动画播放期间用户无法重复点击（需做防抖）。

#### Step 4: 编写 manifest

```typescript
// tools/<tool-id>/manifest.ts
import { toolRegistry } from '../../core/registry/ToolRegistry';
import type { ToolManifest } from '../../core/registry/ToolManifest';

const manifest: ToolManifest = {
  id: '<tool-id>',
  name: '<工具中文名>',
  description: '<一行描述，展示在首页卡片>',
  icon: '/assets/icons/<tool-id>.svg',
  group: 'instant',          // 'instant' = 极速组, 'decision' = 决策组
  inboxPolicy: 'auto',       // 'auto' / 'user_choice' / 'custom' / 'none'
  runRoute: '/pages/tool-run/tool-run?id=<tool-id>',
  statsRoute: '/pages/tool-stats/tool-stats?id=<tool-id>',
  statsDimensions: [
    'frequency',
    'time_heatmap',
    'result_distribution',
    'follow_rate',
    'break_reason_pie',
    'history_timeline',
  ],
};

toolRegistry.register(manifest);
```

**manifest 字段填写指引:**

| 字段 | 如何填写 |
|------|---------|
| `id` | 与文件夹名一致，全小写 + 下划线，如 `decision_tree` |
| `group` | 极速组 (硬币/骰子): `'instant'`；需前置输入的: `'decision'` |
| `inboxPolicy` | 结果自动进 Inbox: `'auto'`；用户自选: `'user_choice'`；不进 Inbox: `'none'` |
| `statsDimensions` | 按需勾选。无意义维度可去掉 (如硬币不需要 `time_heatmap`) |

#### Step 5: 激活注册

在 `app.ts` 顶部添加 import，确保 manifest 被加载并自注册:

```typescript
// app.ts
import './tools/coin/manifest';
import './tools/dice/manifest';
import './tools/roulette/manifest';
import './tools/pros-cons/manifest';
import './tools/<tool-id>/manifest';   // ← 新增这一行
```

> 如果 import 被 tree-shaking 移除，改为 `const _<tool_id> = require('./tools/<tool-id>/manifest')`。

#### Step 6: 注册路由

在 `app.json` 的 `pages` 数组中添加路由:

```json
{
  "pages": [
    "pages/index/index",
    "pages/review/review",
    "pages/me/me",
    "pages/tool-run/tool-run",
    "pages/tool-stats/tool-stats"
  ]
}
```

> 注意: 工具使用态和统计页是通用页面 (`tool-run` / `tool-stats`)，通过 `?id=<tool-id>` 动态路由。新增工具不需要新建页面路由——除非工具有完全不同的交互模式。

对于使用标准 `tool-run` 页面的工具，无需在 `app.json` 新增路由条目。

#### Step 7: 编写统计视图 (可选)

如果工具的统计视图有特殊 UI（如转盘的结果分布用扇区图而非柱状图），在 `tools/<tool-id>/<tool-id>.stats.wxml` 编写自定义模板。统计页 (`tool-stats`) 会根据 `tool_id` 动态加载对应模板。如果不需要自定义统计 UI，可跳过此步，`tool-stats` 页会使用通用图表组件渲染。

#### Step 8: 自测清单

新增一个工具后，逐项验证:

| # | 测试项 | 验证方式 |
|:--|-------|---------|
| 1 | 首页可见 | 对应分组的工具卡片正常展示 |
| 2 | 点击进入使用态 | 页面正常渲染，无白屏/报错 |
| 3 | 工具核心功能 | 随机/计算逻辑正确，结果展示正常 |
| 4 | 结果进入 Inbox | 运行后在复盘 Tab 可见 pending 记录 |
| 5 | 事后轻备注 | 备忘输入框正常，保存后记录可查 |
| 6 | 标记流程 | "遵循了"/"没遵循"按钮正常，选择原因标签正常 |
| 7 | 单工具统计页 | 各维度图表正常渲染，数据准确 |
| 8 | 触觉反馈 | 若工具使用震动，体验正确 |

**Canvas 2D 工具追加测试项:**

| # | 测试项 | 验证方式 |
|:--|-------|---------|
| C1 | Canvas 初始化 | 页面 `onLoad` 后 Canvas 上下文创建成功，首帧渲染正常 |
| C2 | 动画 60fps | 微信开发者工具 Performance 面板检测帧率，动画全程 ≥ 55fps |
| C3 | 动画时长 | 硬币 ~1s, 骰子 ~1.2s，偏差不超过 ±100ms |
| C4 | 结果确定性 | 先确定随机结果再播动画——动画结束展示的结果与 Inbox 记录一致 |
| C5 | 防抖 | 动画播放期间快速连续点击，不触发放重复执行 |
| C6 | 低端机兼容 | iPhone 8 / 红米 Note 9 等低端机型上帧率 ≥ 30fps |
| C7 | Canvas 释放 | 页面 `onUnload` 后无残留 `requestAnimationFrame` 回调 |
| C8 | 纹理预加载 | 硬币正反面/骰子六面 PNG 在 `onLoad` 完成加载，动画播放时无 I/O 延迟 |

---

## 6. 组件开发规范

### 6.1 组件目录结构

```
components/<component-name>/
├── <component-name>.ts       # 组件逻辑
├── <component-name>.wxml     # 组件模板
├── <component-name>.wxss     # 组件样式
└── <component-name>.json     # 组件配置
```

### 6.2 组件模板

```typescript
// components/personality-badge/personality-badge.ts
Component({
  // ═══ 属性 (外部传入) ═══
  properties: {
    primaryTag: { type: String, value: '' },
    primaryIcon: { type: String, value: '' },
    secondaryTags: { type: Array, value: [] },
    size: { type: String, value: 'medium' },  // small | medium | large
    loading: { type: Boolean, value: false },
  },

  // ═══ 内部状态 ═══
  data: {
    displayText: '',
  },

  // ═══ 属性监听 ═══
  observers: {
    'primaryTag, primaryIcon': function (tag: string, icon: string): void {
      this.setData({ displayText: `${icon} ${tag}` });
    },
  },

  // ═══ 生命周期 ═══
  lifetimes: {
    attached(): void {
      // 组件挂载
    },
  },

  // ═══ 方法 ═══
  methods: {
    onTap(): void {
      this.triggerEvent('badgetap', { tag: this.data.primaryTag });
    },
  },
});
```

### 6.3 组件样式隔离

```json
// components/personality-badge/personality-badge.json
{
  "component": true,
  "styleIsolation": "isolated",   // 样式隔离 (默认)
  "renderer": "skyline",
  "componentFramework": "glass-easel"
}
```

- `"isolated"`: 组件样式不影响外部，外部样式也不影响组件（推荐）。
- `"apply-shared"`: 外部样式可影响组件。
- `"shared"`: 双向穿透（不推荐，破坏封装性）。

### 6.4 全局组件 vs 页面内组件

- **全局组件** (`miniprogram/components/`): 跨页面复用，如 `personality-badge`, `tool-card`, `inbox-flyer`。
- **工具内组件** (`miniprogram/tools/_base/components/`): 仅工具间复用，如 `result-flyer`, `action-sheet`。

---

## 7. Git 工作流

### 7.1 分支策略

```
main          ── 生产就绪代码
  └── develop ── 开发集成分支
       ├── feat/tool-coin       # 功能分支
       ├── feat/inbox-list      # 功能分支
       ├── fix/subscribe-auth   # 修复分支
       └── refactor/dataservice # 重构分支
```

### 7.2 Commit 规范

```
<type>(<scope>): <subject>

type:
  feat     新功能
  fix      错误修复
  refactor 代码重构 (不涉及功能变更)
  style    样式/排版修改
  docs     文档更新
  test     测试相关
  chore    构建/工具链/依赖更新

示例:
  feat(coin): 实现抛硬币随机算法与触觉反馈
  feat(inbox): 实现待决清单列表查询与标记功能
  fix(inbox): 修复48小时过期逻辑时间戳计算错误
  refactor(dataservice): 提取云函数调用到DataService防腐层
  docs(api): 补充决策记录接口文档
```

### 7.3 Code Review 要求

- 每个 PR 至少覆盖一个完整功能点。
- PR 描述中附上自测清单结果。
- 合入 `develop` 前需至少一人 Review 通过。

---

## 8. 调试与测试

### 8.1 本地调试

**小程序端调试:**
- 微信开发者工具 → 调试器 (Sources / Network / Storage / AppData / Wxml 面板)
- Skyline 帧率监控: 调试器 → Performance 面板

**云函数本地调试:**
```bash
# 使用 CloudBase CLI 本地运行云函数
tcb fn invoke login --params '{"code":"021xxxx"}'

# 或在微信开发者工具中右键云函数 → 开启本地调试
```

### 8.2 日志规范

```typescript
// 统一日志工具 (core/utils/logger.ts)
export const Logger = {
  debug(msg: string, data?: unknown): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[MindFlip:DEBUG] ${msg}`, data);
    }
  },
  info(msg: string, data?: unknown): void {
    console.log(`[MindFlip:INFO] ${msg}`, data);
  },
  error(msg: string, err?: unknown): void {
    console.error(`[MindFlip:ERROR] ${msg}`, err);
    // 生产环境可在此上报到云函数错误收集
  },
};
```

云函数日志: 在 CloudBase 控制台 → 云函数 → 日志 中查看。

### 8.3 数据校验

使用 TypeScript 类型守卫进行运行时数据校验:

```typescript
// core/utils/type-guards.ts
export function isBreakReason(value: string): value is BreakReason {
  const validReasons = [
    'intuition', 'external_change', 'just_testing',
    'dislike_result', 'still_thinking',
  ];
  return validReasons.includes(value);
}
```

### 8.4 测试策略 (Phase 1)

| 类型 | 范围 | 工具 |
|------|------|------|
| 单元测试 | 工具核心算法 (如硬币随机、骰子分布) | Jest + ts-jest |
| 云函数测试 | CloudBase CLI 本地调用 | `tcb fn invoke` |
| UI 测试 | 微信开发者工具多机型预览 | IDE 模拟器 + 真机预览 |

> Phase 1 暂不引入 E2E 测试框架。核心工具算法的单元测试覆盖率目标 ≥ 80%。

---

## 9. 性能优化指南

### 9.1 首屏优化

- `lazyCodeLoading: "requiredComponents"` — 已开启，页面按需加载。
- 首页 `onLoad` 只加载首屏数据（极速工具不用加载任何数据），模板预览卡片使用本地静态图。
- `StatsStore.overview` 使用 `users.stats_snapshot` 预聚合数据，避免首页触发耗时统计查询。

### 9.2 列表优化

- 待决清单分页加载，每页 20 条。
- 使用 `wx:key="_id"` 优化列表渲染。
- Skyline 下使用 `grid-view` 或 `list-view` 替代 `scroll-view` + `wx:for`。

### 9.3 云函数优化

- 云函数启动后复用数据库连接 (CloudBase SDK 自动处理)。
- 减少云函数调用次数：优先本地计算，仅在需要持久化或安全计算时调用。
- 统计查询使用数据库聚合管道 (`aggregate`) 而非客户端循环计算。

---

## 10. 常见问题 (FAQ)

### Q: Skyline 中 WXML 的 `wx:if` 不生效？

A: 检查是否引入了非 Skyline 兼容的 WXS 脚本。Skyline 下 WXS 能力受限。

### Q: mobx store 的数据没有更新到页面？

A: 确认:
1. 属性加了 `observable` 装饰器
2. 修改属性的方法加了 `action` 装饰器
3. 页面/组件正确配置了 `storeBindings`
4. 修改的是对象的引用而非直接属性（数组用 `this.list = [...this.list, newItem]`）

### Q: 云函数本地调试时无法获取 OPENID？

A: CloudBase CLI 本地调试无法获取真实微信上下文。使用开发者工具的"云函数本地调试"功能，它会注入模拟的 `OPENID`。

### Q: 如何在不发版的情况下修改订阅定价？

A: 修改 CloudBase 中 `sku_config` 集合的 `is_active` 和 `price` 字段。前端每次进入 VIP 购买页时动态拉取 SKU 列表。详见 [FeatureAnalyze.md § 7.4](FeatureAnalyze.md#7-待决问题-open-questions)。
