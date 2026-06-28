# 决策大师 (MindFlip) — 第一次迭代开发计划 (Stage 1)

> **目标:** 完成 Phase 1 MVP 全链路闭环 — 从用户打开小程序到决策复盘、统计、订阅消息推送的完整流程。  
> **Baseline:** 当前项目已初始化所有页面/组件/云函数骨架，Stage 1 将其从占位符填充为可运行的业务代码。  
> **预计工期:** 3-4 周 (1 人全职)  
> **最后更新:** 2026-06-28

---

## 总览：Stage 1 开发优先级图

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1.1: 基础设施 (CloudBase + 数据通路)    [Week 1 前半]  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ DB 集合  │  │ 云函数   │  │DataService│                  │
│  │ 创建索引 │  │ 实现     │  │ 接入联调  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Stage 1.2: 核心工具 (硬币 + 骰子)           [Week 1 后半]   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 随机逻辑 │  │Canvas 2D │  │ tool-run │                  │
│  │ coin.ts  │  │  coin    │  │ 通用页   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Stage 1.3: 复盘闭环 (Inbox + 标记)         [Week 2 前半]   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │待决清单  │  │action-   │  │ review   │                  │
│  │列表+详情 │  │sheet标记  │  │ 页联动   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Stage 1.4: 统计 + 人格标签                  [Week 2 后半]  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │全局统计  │  │单工具统计 │  │人格标签  │                  │
│  │Insights  │  │tool-stats │  │计算+展示  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Stage 1.5: 订阅消息 + 其它工具              [Week 3]       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │订阅授权  │  │定时推送  │  │大转盘    │                  │
│  │subscribe │  │scheduler │  │roulette  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ┌──────────┐                                               │
│  │优缺点    │                                               │
│  │pros-cons │                                               │
│  └──────────┘                                               │
├─────────────────────────────────────────────────────────────┤
│  Stage 1.6: 导航 + 收尾                      [Week 4]       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │自定义    │  │ 我的页   │  │ Onboarding│                 │
│  │Tab Bar   │  │ me 页    │  │ 首次引导  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Stage 1.1: 基础设施 — CloudBase 数据通路

### 1.1.1 数据库集合创建 (CloudBase 控制台操作)

在 CloudBase 控制台 (`cloud1` 环境) 的"数据库"中创建以下集合：

| 集合名 | 权限 | 需创建的索引 |
|--------|------|-------------|
| `users` | 仅创建者可读写 | `_openid` (自动), `unionid` (普通索引) |
| `decision_logs` | 仅创建者可读写 | `_openid + follow_status + created_at` (复合, DESC), `_openid + tool_type + created_at` (复合, DESC), `created_at` (普通) |
| `personality_tags` | 仅创建者可读写 | `_openid + period_type + period_end` (复合, DESC) |
| `subscribe_config` | 仅创建者可读写 | `_openid` (自动) |
| `tools_meta` | 所有用户可读，仅管理员可写 | `tool_id` (普通) |

> **操作指引：** CloudBase 控制台 → 数据库 → 新建集合 → 索引管理 → 添加索引。

### 1.1.2 云函数实现

以下 7 个云函数已完成 `index.js` 占位文件。Stage 1.1 的任务是填充真正的业务逻辑。

---

#### 云函数 1: `login/index.js`

**文件:** `cloudfunctions/login/index.js`  
**当前状态:** 已有骨架 (code2Session 标记为 TODO)  
**需实现:**

```javascript
// 1. 调用 cloud.openapi.auth.code2Session (需先在微信后台配置云开发授权)
//    const session = await cloud.openapi.auth.code2Session({ 
//      jsCode: event.code 
//    });
//    const openid = session.openid;
//    const unionid = session.unionid || '';
//
// 2. 查询 users 集合是否已有该 openid
//    - 存在: 更新 last_login_at，返回已有用户信息
//    - 不存在: 创建新用户文档 (vip_level='free', tool_slot_max=1, ...)
//
// 3. 生成 token: `${openid}_${Date.now()}`
//    存入返回数据给客户端缓存
//
// 4. 返回: { code: 0, data: { token, user, is_new_user } }
```

**验收标准:**
- [ ] 首次登录: `is_new_user = true`, users 集合新增 1 条记录
- [ ] 二次登录: `is_new_user = false`, last_login_at 更新
- [ ] code 无效时返回 401

---

#### 云函数 2: `decision/index.js`

**文件:** `cloudfunctions/decision/index.js`  
**当前状态:** 仅有空壳  
**需实现:**

```javascript
// 两个 action: 'create' 和 'sync'
//
// action='create':
//   1. 从 cloud.getWXContext() 获取 OPENID
//   2. 写入 decision_logs 集合:
//      {
//        tool_type, tool_id, tool_name,
//        raw_result, semantic_result, user_memo (选填),
//        follow_status: 'pending',
//        break_reason: null,
//        created_at: Date.now(),
//        marked_at: null, expired_at: null
//      }
//   3. 返回 { decision_id, created_at }
//
// action='sync':
//   1. 批量写入 (最多 20 条)，按 _id 去重
//   2. 返回成功写入条数
```

**验收标准:**
- [ ] 单条 create 成功写入 decision_logs 集合
- [ ] sync 批量写入去重正确

---

#### 云函数 3: `inbox/index.js`

**文件:** `cloudfunctions/inbox/index.js`  
**当前状态:** 仅有空壳  
**需实现:**

```javascript
// 三个 action: 'list', 'mark', 'unread'
//
// action='list':
//   1. 查询条件: _openid匹配 + follow_status='pending' + created_at >= now-48h
//   2. 排序: created_at DESC
//   3. 分页: page_size(默认20) + page_token(游标 _id)
//   4. 返回: { items: [...], next_token, total }
//
// action='mark':
//   1. 校验 break_reason 在白名单内 (若 follow_status='not_followed')
//   2. 校验记录未被标记过 (幂等)
//   3. 更新: follow_status, break_reason, marked_at
//   4. 返回: { marked_at, personality_unlocked, primary_tag }
//      (当用户累计标记 >= 10 次时，触发人格标签首次计算)
//
// action='unread':
//   1. 计数: follow_status='pending' + created_at >= now-48h
//   2. 返回: { count }
```

**验收标准:**
- [ ] list 返回正确的 pending 列表，48h 外的自动过滤
- [ ] mark 幂等：已标记的记录不可再标记
- [ ] unread 计数与实际 pending 数一致

---

#### 云函数 4: `stats/index.js`

**文件:** `cloudfunctions/stats/index.js`  
**当前状态:** 仅有空壳  
**需实现:**

```javascript
// 两个 scope: 'global' 和 'tool'
//
// scope='global':
//   使用 aggregate 管道聚合:
//   1. total_decisions: 总数
//   2. total_follow_rate: followed / (followed + not_followed) * 100
//   3. tool_distribution: 按 tool_type 分组计数
//   4. follow_breakdown: 按 follow_status 分组计数
//   5. break_reason_distribution: 仅 not_followed 的 break_reason 分组
//   6. recent_timeline: 最近 20 条 (不限状态)
//
// scope='tool' (参数 tool_id):
//   仅过滤该 tool_id 的记录，聚合维度同上
//   额外: time_heatmap(7×24 矩阵), result_distribution
```

**验收标准:**
- [ ] global 统计返回完整，百分比计算正确
- [ ] tool 统计按 tool_id 正确过滤
- [ ] 无数据时返回零值而非报错

---

#### 云函数 5: `personality/index.js`

**文件:** `cloudfunctions/personality/index.js`  
**当前状态:** 仅有空壳  
**需实现:**

```javascript
// 参数 period: 'weekly' | 'all_time'
//
// 1. 查询标记数: 若 < 10 次，返回 preheat_progress (不解锁)
//
// 2. 若 >= 10 次，计算人格:
//    - 统计窗口内 (weekly=30天, all_time=全部) 的 follow_rate
//    - 统计 dominant_break_reason (出现最多的未遵循原因)
//    - 统计 top_tool (使用最多的工具)
//    - 应用 IF-ELSE 判定规则得出 primary_tag + secondary_tags
//
// 3. 写入 personality_tags 集合 (新增一条，不覆写历史)
//
// 4. 返回标签结果
```

**人格判定规则 (硬编码 MVP 版):**
```javascript
function computePrimaryTag(stats) {
  if (stats.follow_rate > 0.9) return { name: '绝对理性派', icon: '🎯' };
  if (stats.follow_rate < 0.3) return { name: '逆向叛逆者', icon: '🔄' };
  if (stats.top_tool === 'coin' && stats.follow_rate > 0.7) return { name: '天意顺从者', icon: '🙏' };
  if (stats.dominant_break_reason === 'intuition') return { name: '直觉驱动型', icon: '🧠' };
  if (stats.dominant_break_reason === 'just_testing') return { name: '工具探索型', icon: '🧪' };
  if (stats.dominant_break_reason === 'external_change') return { name: '务实应变型', icon: '🌧️' };
  if (stats.dominant_break_reason === 'still_thinking') return { name: '审慎观望型', icon: '⏳' };
  return { name: '理性决策者', icon: '⚖️' };
}
```

**验收标准:**
- [ ] 标记 < 10 次: 返回 preheat_progress 和引导文案
- [ ] 标记 >= 10 次: 返回正确的主标签 + 副标签
- [ ] personality_tags 集合新增记录成功

---

#### 云函数 6: `subscribe/index.js`

**文件:** `cloudfunctions/subscribe/index.js`  
**当前状态:** ✅ 已完成（模板 ID 已确认，`send_push` 支持双模板）

**已确认的订阅消息模板:**

| 模板 | 模板 ID | 字段 | 用途 |
|------|---------|------|------|
| 待办事项提醒 | `00_yc3if3s1BFTytpy49f2P8_tElEc3DibxcNzN5d88` | thing1 / number2 / thing3 | 24h 决策复盘聚合推送 |
| 测评报告生成通知 | `EVk9xTAqm-Fb8Sp_VQTv55ZypUcEpAGJxq7rJOiBLSM` | thing1 / phrase2 / thing3 | 每周五人格周刊出刊通知 |

**`send_push` 字段映射逻辑（已实现）:**
```javascript
// template_type='inbox' → 模板 1
thing1: '决策复盘提醒'
number2: count (pending 数量)
thing3: '点击完成复盘标记'

// template_type='weekly' → 模板 2
thing1: '个人决策行为周刊'
phrase2: tag_name (如 "绝对理性派 🎯")
thing3: '点击查看本周完整报告'
```

---

#### 云函数 7: `scheduler/index.js`

**文件:** `cloudfunctions/scheduler/index.js` + `config.json`  
**当前状态:** ✅ 已完成（`config.json` 定时器已配置每天 9:00，`index.js` 已实现三段式逻辑）

**已实现的执行流程:**
```javascript
// 1. 24h 复盘推送 (模板 1: 待办事项提醒)
//    查询 pending 记录 → 按用户聚合 → 过滤未授权 → 逐用户推送
//    参数: { action:'send_push', touser, count, template_type:'inbox' }
//
// 2. 48h 过期自动标记
//    pending 且 created_at < now-48h → follow_status='expired'
//
// 3. 每周五人格周刊推送 (模板 2: 测评报告生成通知)
//    仅在 d.getDay() === 5 时执行
//    → 触发 personality 云函数计算
//    → 向已授权用户推送周刊
//    参数: { action:'send_push', touser, template_type:'weekly', tag_name }
```

**验收标准:**
- [ ] 定时触发器按 cron 准时执行（每天 9:00）
- [ ] 24h 复盘推送只发送给已授权用户，字段填充符合模板 1 规范
- [ ] 48h 过期标记正确
- [ ] 周五附加周刊推送，字段填充符合模板 2 规范
- [ ] 单用户推送失败不影响其他用户

---

### 1.1.3 DataService 联调

**文件:** `miniprogram/core/services/DataService.ts`  
**当前状态:** 所有方法已实现，底层 `callFunction` 已封装  
**需实现:**
- [ ] 在云函数部署后，移除各 Store 中的 `// TODO` 注释，接入真实云函数调用
- [ ] 验证每个 DataService 方法能正确调用对应云函数并解析返回值

---

## Stage 1.2: 核心工具 — 硬币 + 骰子 (Canvas 2D)

> **优先级最高。** 这是产品的核心交互——用户第一眼看到的东西。

### 1.2.1 硬币工具

#### 文件清单 (tools/coin/)

| 文件 | 状态 | 说明 |
|------|:----:|------|
| `manifest.ts` | ✅ 已完成 | 已注册到 ToolRegistry |
| `coin.ts` | 🔴 待创建 | 随机算法 + 备忘处理 |
| `coin.wxml` | 🔴 待创建 | Canvas 节点 + 结果叠加层 |
| `coin.wxss` | 🔴 待创建 | 杂志风排版样式 |
| `coin.json` | 🔴 待创建 | 页面配置 |
| `coin.canvas.ts` | 🔴 待创建 | Canvas 2D 动画引擎 |
| `coin.stats.wxml` | 🟡 待创建 | 硬币专属统计视图 (可选) |

#### `coin.ts` — 核心逻辑

```typescript
// 实现类: CoinEngine
// 职责: 随机算法 + 输入校验 + 结果标准化

class CoinEngine {
  /** 抛硬币 */
  static flip(): CoinResult {
    const raw = Math.random() < 0.5 ? 'heads' : 'tails';
    return {
      raw_result: raw,
      semantic_result: raw === 'heads' ? '正面' : '反面',
    };
  }

  /** 校验 (硬币无输入，始终有效) */
  static validate(): { valid: true } {
    return { valid: true };
  }
}
```

#### `coin.canvas.ts` — Canvas 2D 动画引擎

**实现接口:** `CanvasAnimation` (参考 [DevelopmentGuide.md § 3.2.1](../DevelopmentGuide.md#321-canvas-2d-动画开发-硬币骰子专用))

**动画阶段 (`play` 方法):**

| 阶段 | 时间 | 绘制内容 | 触觉反馈 |
|------|:----:|------|:----:|
| 蓄力 (winding) | 0-200ms | 硬币微缩 (scale 1.0→0.85) + 随机震动偏移 (±3px) | `triggerHaptic('heavy')` 在 0ms |
| 翻转 (flipping) | 200-800ms | Canvas 矩阵变换模拟 3D 翻转 (scaleX 从 1→-1→1 循环 3 次) | — |
| 揭晓 (revealing) | 800-1000ms | 结果面定格 + 粒子光晕扩散 (半径 0→50px, opacity 1→0) | `triggerHaptic('light')` 在 800ms |

**技术要求:**
- `requestAnimationFrame` 驱动帧循环
- 缓动函数从 `core/utils/easing.ts` 引用
- 纹理 (coin_heads.png / coin_tails.png / coin_side.png / coin_glow.png) 在 `init()` 中预加载
- `destroy()` 中取消 rafId + 释放引用
- Canvas 尺寸使用 `pixelRatio` 适配

**降级策略:** 若 Canvas 节点获取失败 (低版本微信)，降级为纯文字闪烁动画——"正面...反面...正面..." 逐字切换 3 次后定格。

#### `coin.wxml` — 使用态页面

```xml
<!-- 结构: -->
<!-- 1. Canvas 画布 (全屏居中，承载动画) -->
<!-- 2. 杂志风标题 "抛硬币" -->
<!-- 3. 结果叠加层 (动画完成后淡入) -->
<!-- 4. 备忘输入框 (动画完成后淡入，灰色小字) -->
<!-- 5. 再来一次 按钮 (底部) -->
```

#### 验收标准

- [ ] 点击 Canvas 触发抛硬币，防抖生效 (动画中不可重复点击)
- [ ] Canvas 2D 动画完整播放 3 阶段，帧率稳定
- [ ] 动画完成后显示结果文字 ("正面" / "反面")
- [ ] 备忘输入框可输入并保存
- [ ] 结果自动写入 decision_logs (Inbox 可见)
- [ ] Canvas 降级方案在低版本微信正常工作
- [ ] 页面 unload 时 Canvas 资源正确释放

---

### 1.2.2 骰子工具

#### 文件清单 (tools/dice/)

| 文件 | 状态 | 说明 |
|------|:----:|------|
| `manifest.ts` | ✅ 已完成 | — |
| `dice.ts` | 🔴 待创建 | 随机算法 (1-6) |
| `dice.wxml` | 🔴 待创建 | Canvas 节点 |
| `dice.wxss` | 🔴 待创建 | — |
| `dice.json` | 🔴 待创建 | — |
| `dice.canvas.ts` | 🔴 待创建 | Canvas 2D 动画引擎 |
| `dice.stats.wxml` | 🟡 待创建 | 可选 |

#### `dice.ts` — 核心逻辑

```typescript
class DiceEngine {
  static roll(): DiceResult {
    const raw = String(Math.floor(Math.random() * 6) + 1); // "1" - "6"
    const digitMap = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六' };
    return {
      raw_result: raw,
      semantic_result: `${digitMap[raw]}点`,
    };
  }
}
```

#### `dice.canvas.ts` — Canvas 2D 动画引擎

**动画阶段:**

| 阶段 | 时间 | 绘制内容 | 触觉反馈 |
|------|:----:|------|:----:|
| 投掷 (throwing) | 0-100ms | 骰子放大 + 上抛 (translateY -50px) | `triggerHaptic('heavy')` |
| 滚动 (rolling) | 100-800ms | 随机面快速切换 (60ms/面) + 减速 | — |
| 弹跳 (bouncing) | 800-1000ms | 3 次衰减弹跳 (translateY 振幅递减) | `triggerHaptic('light')` 每次弹跳 |
| 定格 (settling) | 1000-1200ms | 结果面静止 + 阴影稳定 | — |

**技术要求:** 同硬币。纹理需加载 6 面骰子 PNG + 阴影 PNG。

#### `dice.wxml` — 同理硬币，Canvas 节点 + 杂志风标题

#### 验收标准

- [ ] Canvas 动画完整播放 4 阶段，骰子面切换自然
- [ ] 结果 1-6 均匀分布 (大量测试)
- [ ] 其余同硬币标准

---

### 1.2.3 tool-run 通用工具页

**文件:** `miniprogram/pages/tool-run/tool-run.ts` + `.wxml` + `.wxss`

**职责:** 作为所有工具使用态的通用壳。根据 URL 参数 `?id=<tool-id>` 动态加载对应工具模块。

**关键实现:**
```typescript
// tool-run.ts
onLoad(options: { id: string }): void {
  const toolId = options.id;
  const manifest = toolRegistry.get(toolId);
  if (!manifest) {
    wx.showToast({ title: '工具不存在', icon: 'none' });
    wx.navigateBack();
    return;
  }
  // 根据 manifest 动态渲染对应的工具组件
  // 极速组 (instant): 直接嵌入工具 wxml template
  // 决策组 (decision): 先展示输入表单，再触发运行
}
```

> **注意:** Phase 1 的极速组工具 (硬币/骰子) 可先使用独立页面路由。`tool-run` 通用页在 Phase 2 (自定义工具) 成为核心入口。Stage 1 中先搭好路由框架，硬币/骰子可暂时使用独立页面快速交付。

#### 验收标准

- [ ] 通过 `?id=coin` / `?id=dice` 能正确渲染对应工具
- [ ] 不存在的 tool_id 给出提示并返回

---

## Stage 1.3: 复盘闭环 — 待决清单 + 标记

### 1.3.1 review 页完善

**文件:** `miniprogram/pages/review/review.ts` + `.wxml` (已有骨架)  
**当前状态:** ts 有 storeBindings，mark 方法为 TODO  
**需实现:**

#### review.ts
- [ ] `onMarkNotFollowed`: 点击后展示 action-sheet 浮层 (而非直接 markFollowed)
- [ ] InboxStore 的 `loadList` 接入真实的 `dataService.queryInbox()`
- [ ] `pendingList` 列表项增加 `relativeTime` 格式化显示 (如 "3 小时前")
- [ ] 列表项增加"即将过期"视觉提示 (过期前 2 小时高亮)

#### review.wxml
```
上半部分: 待决清单
├── 订阅消息 Banner (is_authorized=false 时展示)
├── 时间线列表 (pending 记录, 按时间倒序)
│   └── 每项: 工具图标 + 语义结果 + 相对时间 + "遵循"/"没遵循"按钮
└── 空状态插画 (pending 为 0 时)

下半部分: Insights
├── 本周人格标签卡片 (主标签 + 副标签)
├── 总决策次数 + 总遵循率 (大数字展示)
├── 工具使用分布 (横向条形图)
└── 最近决策时间线 (最近 20 条)
```

#### 验收标准

- [ ] 有 pending 记录时正确展示时间线
- [ ] 点击"遵循了"立即从列表移除
- [ ] 点击"没遵循"展开 action-sheet 选择原因
- [ ] 空状态展示插画
- [ ] 即将过期项高亮显示
- [ ] 订阅 Banner 逻辑正确 (三振出局 / 永久隐藏)

---

### 1.3.2 action-sheet 组件完善

**文件:** `miniprogram/tools/_base/components/action-sheet/action-sheet.ts` + `.wxml`  
**当前状态:** 已有占位符  
**需实现:**

```
浮层结构 (半屏 Modal):
┌─────────────────────────────┐
│  你为什么没遵循这个决定？     │  ← 标题
│                             │
│  ○ 🧠 直觉告诉我另一个更好   │  ← 单选列表
│  ○ 🌧️ 外部条件变化了       │
│  ○ 🔍 我只是试试看          │
│  ○ 😅 结果我不喜欢          │
│  ○ 🤔 我再想想             │
│                             │
│       [ 确认 ]              │  ← 主按钮 (必须选中一个才能点击)
└─────────────────────────────┘
```

**交互细节:**
- 5 个原因标签单选，选中后高亮 (accent 色边框)
- "确认"按钮默认置灰，选中原因后激活
- 浮层从底部升起 (使用 Skyline worklet 动画)
- 点击遮罩层关闭

#### 验收标准

- [ ] 5 个原因标签正确渲染
- [ ] 单选逻辑正确
- [ ] 选中前"确认"按钮不可点击
- [ ] 确认后调用 `inboxStore.markNotFollowed(id, reason)`

---

### 1.3.3 result-flyer 组件

**文件:** `miniprogram/tools/_base/components/result-flyer/`  
**职责:** 工具运行完成后，结果卡片缩小并飞入右上角 Inbox 图标的动画

**动画流程:**
1. 结果卡片停留 2 秒
2. 卡片缩小 (scale 1→0.3) 同时位移至右上角 (计算 Inbox 图标位置)
3. 透明度渐变 (opacity 1→0.5)
4. 动画完成后触发回调

> 使用 Skyline worklet 实现。硬币/骰子的 Canvas 动画结束后调用此组件。

#### 验收标准

- [ ] 飞入动画流畅 60fps
- [ ] 目标位置计算准确 (不同屏幕尺寸)

---

## Stage 1.4: 统计 + 人格标签

### 1.4.1 全局统计 (review 页 Insights 区域)

**依赖:** `stats` 云函数已实现  
**需实现:**

- [ ] review 页下半部分 Insights 区域从 StatsStore 获取数据
- [ ] 总决策次数 + 总遵循率大数字展示 (杂志风)
- [ ] 工具使用分布横向条形图 (纯 CSS/WXSS 实现，不依赖第三方图表库)
- [ ] 最近决策时间线 (从 StatsStore.overview.recent_timeline 渲染)

**StatsStore 接入:**
```typescript
// statsStore.refreshOverview() 中移除 TODO，接入:
// const res = await dataService.getGlobalStats();
// runInAction(() => { this.overview = res; });
```

---

### 1.4.2 单工具统计页

**文件:** `miniprogram/pages/tool-stats/tool-stats.ts` + `.wxml`  
**当前状态:** 骨架存在  
**需实现:**

- [ ] 根据 URL 参数 `?id=<tool-id>` 获取 manifest
- [ ] 调用 `dataService.getToolStats(toolId)` 获取数据
- [ ] 根据 `manifest.statsDimensions` 决定展示哪些图表模块

**图表模块清单 (工具统计页):**

| 模块 | 说明 | 实现方式 |
|------|------|---------|
| 使用频次 | 大数字 + "共使用 X 次" | 纯 CSS |
| 时间分布热力图 | 7×24 单元格矩阵，颜色深浅表示频率 | 纯 CSS grid |
| 结果分布 | 硬币: 正反面对比条; 骰子: 1-6 频率柱状图 | 纯 CSS |
| 遵循率 | 环形图 (followed/not_followed/pending 占比) | Canvas 2D 或纯 CSS conic-gradient |
| 未遵循原因分布 | 横向条形图 | 纯 CSS |
| 历史记录列表 | 该工具的所有决策时间线 (分页 20 条) | scroll-view |

---

### 1.4.3 人格标签组件

**文件:** `miniprogram/components/personality-badge/personality-badge.ts` + `.wxml`  
**当前状态:** 已有骨架  
**需实现:**

```
卡片 UI (杂志风):
┌──────────────────────────────┐
│                              │
│   🎯 绝对理性派              │  ← 主标签 (大字号 36rpx 加粗)
│                              │
│   直觉驱动型 · 工具探索型     │  ← 副标签 (小字号 24rpx 灰色)
│                              │
│   基于 24 次决策 · 遵循率 82% │  ← 统计依据 (微字号)
│                              │
└──────────────────────────────┘
```

**预热态 (标记 < 10 次):**
```
┌──────────────────────────────┐
│   潜意识解析中...             │
│   ████████░░░░░░░░ 4/10      │  ← 进度条
│   已捕捉 4 次心智反弹         │
│   还差 6 次即可生成专属人格   │
└──────────────────────────────┘
```

#### 验收标准

- [ ] 标记 >= 10 次: 展示完整人格标签卡片
- [ ] 标记 < 10 次: 展示进度条和引导文案
- [ ] 主标签 + 副标签正确展示
- [ ] 每次标记后进度条刷新

---

## Stage 1.5: 订阅消息 + 其它工具

### 1.5.1 订阅消息授权组件

**文件:** `miniprogram/components/subscribe-modal/subscribe-modal.ts` + `.wxml`  
**当前状态:** 已有骨架  
**需实现:**

**首次授权时机:** 用户完成第 1 次工具使用后触发。

**交互流程:**
1. 结果卡片飞入 Inbox 动画完成后
2. 从底部升起半屏弹窗 (Half-screen Modal)
3. 文案: *"硬币已经给出了答案。24 小时后，我们会来检验你是否遵从了天意。允许系统为你投递一封复盘信吗？"*
4. 按钮: [ 不了，谢谢 ] [ 允许 ]  — 次要/主要 双按钮
5. 点击"允许" → 调用 `wx.requestSubscribeMessage` 原生弹窗
6. 用户确认/拒绝后 → 调用 `dataService.updateSubscribeAuth(result)`

**挽回策略:**
- Inbox 页顶部 Banner: *"开启复盘送达服务，不再错过潜意识的回音 →"*
- 智能路由:
  - 未被永久拒绝: 点击 → 重新拉起授权
  - 已被永久拒绝 (rejected_count >= 3): 点击 → 弹出引导图，指引手动开启

**三振出局逻辑:**
```typescript
// subscribe_config 集合中:
// rejected_count >= 3 → 不再主动弹窗
// banner_dismissed === true 或 banner_skip_count >= 3 → Banner 永久隐藏
```

#### 验收标准

- [ ] 首次使用工具后授权弹窗正确触发
- [ ] 拒绝后 Inbox Banner 展示
- [ ] 三振出局生效
- [ ] Banner 永久隐藏逻辑正确
- [ ] 已授权用户再次进入不弹窗

---

### 1.5.2 大转盘工具 (roulette)

**文件:** `miniprogram/tools/roulette/`  
**当前状态:** manifest.ts 已完成，其余待创建

**核心逻辑 (`roulette.ts`):**
```typescript
class RouletteEngine {
  static spin(options: string[]): RouletteResult {
    const index = Math.floor(Math.random() * options.length);
    return {
      raw_result: `sector_${index + 1}`,
      semantic_result: options[index],  // 如 "火锅"
    };
  }
}
```

**动画策略:**
- Phase 1 简化版：用 worklet 旋转动画 + 指针指向结果扇区
- Phase 1.1 升级 Canvas 2D (如果需要精致旋转效果)

**交互:**
- 进入工具 → 展示选项输入框 (多行 textarea，换行分隔)
- "历史选项一键填入" 功能 (从本地 Storage 读取上次输入)
- 点击"旋转" → 转盘开始旋转 → 减速停止 → 显示结果

#### 验收标准

- [ ] 选项输入正确 (支持换行分隔，最多 12 个选项)
- [ ] 随机结果正确
- [ ] 旋转动画有减速感
- [ ] 历史选项一键填入
- [ ] 结果进入 Inbox

---

### 1.5.3 优缺点对比工具 (pros-cons)

**文件:** `miniprogram/tools/pros-cons/`  
**当前状态:** manifest.ts 已完成，其余待创建

**交互:**
- 输入: 决策标题 + 优点列表 (可添加/删除项) + 缺点列表 (可添加/删除项)
- 每项可设置权重 (1-5 星)
- 点击"分析" → 计算总分 (优点总分 - 缺点总分) → 展示结论
- 底部 Toggle: *"同步至待决清单进行复盘？"* (inboxPolicy='user_choice')

**不使用 Canvas 2D。** 纯 CSS 卡片布局。

#### 验收标准

- [ ] 动态添加/删除优点缺点条目
- [ ] 权重评分计算正确
- [ ] 结论展示 (得分 > 0: "建议执行" / = 0: "两可" / < 0: "建议放弃")
- [ ] Toggle 开关控制是否进 Inbox

---

## Stage 1.6: 导航 + 收尾

### 1.6.1 自定义 Tab Bar

**文件:** `miniprogram/components/custom-tab-bar/custom-tab-bar.ts` + `.wxml` + `.wxss`  
**当前状态:** ts 有骨架，使用 emoji 作为临时图标  
**需实现:**

- [ ] 替换 emoji 为实际 SVG 图标 (`tab-icon-home.svg` 等)
- [ ] 选中态图标 + 正常态图标切换
- [ ] 中间 Quick 按钮凸起效果 (position: absolute, top: -10px, 圆形大按钮，accent 色)
- [ ] InboxStore.unreadCount 绑定 → 复盘 Tab 小红点
- [ ] 页面切换时 `updateActiveTab` 正确高亮

**Quick 按钮行为:**
- 点击 → 拉起半屏面板 (Half-screen Modal)
- 面板内容: 最近使用的 3 个工具 (大图标) + "全部工具" 入口

---

### 1.6.2 快速选择面板 (quick 页)

**文件:** `miniprogram/pages/quick/quick.ts` + `.wxml`  
**当前状态:** 骨架存在  
**需实现:**

```
半屏面板 UI:
┌─────────────────────────────┐
│                             │
│   最近使用                   │
│   [硬币] [骰子] [转盘]      │  ← 大图标按钮
│                             │
│   ───────                   │
│   全部工具                   │
│   硬币 · 骰子 · 转盘 · 优缺点 │  ← 工具列表
│                             │
└─────────────────────────────┘
```

- [ ] 最近使用从本地 Storage 读取 (工具运行后写入)
- [ ] 点击工具跳转对应使用页

---

### 1.6.3 "我的"页面 (me 页)

**文件:** `miniprogram/pages/me/me.ts` + `.wxml`  
**当前状态:** 骨架存在  
**需实现:**

```
页面布局 (杂志风个人档案):

1. 身份卡片
   - 头像 + 昵称 + VIP 标识 (或"升级 VIP"入口)
   - 主标签大字展示

2. VIP 权益区
   - VIP 用户: 到期日 + 管理入口
   - Free 用户: "解锁专业决策引擎" 转化卡片

3. 我的工具箱
   - 显示 N/1 或 N/5 槽位进度
   - 入口 → 编辑管理列表 (Phase 2 完整实现)

4. 设置区
   - 隐私模式切换 (Toggle, Phase 1 UI 展示, Phase 2 激活 deep 模式)
   - 订阅消息管理 → 进入 subscribe-guide 页
   - 关于 MindFlip
   - 用户反馈入口
```

#### 验收标准

- [ ] 用户信息正确展示
- [ ] VIP 标识正确
- [ ] 工具槽位进度条正确
- [ ] 设置项可点击

---

### 1.6.4 新用户首次引导 (Onboarding)

**策略: 直接可用 + 事后教育** (见 [FeatureAnalyze.md § 4.1](../FeatureAnalyze.md#41-新用户首次启动体验-onboarding))

**需实现:**

- 首次使用硬币后 → 底部轻浮层: *"你已经迈出了第一步。24 小时后，我们会问你最终的决定。这，就是复盘的力量。"*
- 不打断操作，3 秒后自动消失
- 使用 `wx.setStorageSync('onboarding_done', true)` 标记已展示

---

### 1.6.5 全局错误处理与 Loading 态

- **网络请求 Loading:** 统一骨架屏样式 (灰色闪烁块)
- **云函数调用失败:** Toast 提示 + 3 秒后自动重试 1 次
- **空状态插画:** Inbox 空、统计空、人格未解锁——三套插画
- **页面无数据:** 不展示空白，统一使用插画 + 引导文案

---

## Stage 1 交付检查清单

### 功能完整性

- [ ] 用户打开小程序 → 微信一键登录 → 首页展示工具卡片
- [ ] 点击硬币 → Canvas 2D 动画 → 结果显示 → 自动进入 Inbox
- [ ] 点击骰子 → Canvas 2D 动画 → 结果显示 → 自动进入 Inbox
- [ ] 点击大转盘 → 输入选项 → 旋转动画 → 结果显示 → 进入 Inbox
- [ ] 点击优缺点 → 输入优缺点 → 计算得分 → (可选) 进入 Inbox
- [ ] 进入复盘 Tab → 待决清单时间线 → 标记"遵循/未遵循+原因"
- [ ] Insights 区域 → 全局统计数据 + 本周人格标签
- [ ] 单工具统计页 → 各维度图表 + 历史记录
- [ ] 首次使用后 → 订阅消息授权弹窗
- [ ] 每天 9:00 → 收到聚合推送 (如有 pending)
- [ ] 首页顶部 → 人格标签预览
- [ ] "我的"页 → 个人信息完整 + 设置入口可用

### 性能标准

- [ ] 首屏 FCP < 1.5s
- [ ] 硬币 Canvas 动画 ≥ 55fps (主流机型)
- [ ] 骰子 Canvas 动画 ≥ 55fps (主流机型)
- [ ] 待决清单 20 条加载 < 300ms
- [ ] 云函数冷启动 < 500ms
- [ ] 低端机 (iPhone 8 / 红米 Note 9) Canvas 动画 ≥ 30fps

### 兼容性

- [ ] iOS 微信最新版 + 前一个主版本
- [ ] Android 微信最新版 + 前一个主版本
- [ ] Canvas 2D 降级方案 (低版本微信不支持 Canvas 时)
- [ ] 不同屏幕尺寸适配 (iPhone SE → iPhone 15 Pro Max)

### 数据安全

- [ ] 用户原始输入参数不写入 decision_logs (阅后即焚)
- [ ] 所有云函数通过 `cloud.getWXContext()` 获取身份
- [ ] 数据库权限仅创建者可读写

---

## 文件变更总清单

### 新创建文件 (stage 1 开发者产出)

```
miniprogram/
├── tools/
│   ├── coin/
│   │   ├── coin.ts              ← 新建
│   │   ├── coin.wxml            ← 新建
│   │   ├── coin.wxss            ← 新建
│   │   ├── coin.json            ← 新建
│   │   ├── coin.canvas.ts       ← 新建 (核心)
│   │   └── coin.stats.wxml      ← 新建 (可选)
│   ├── dice/
│   │   ├── dice.ts              ← 新建
│   │   ├── dice.wxml            ← 新建
│   │   ├── dice.wxss            ← 新建
│   │   ├── dice.json            ← 新建
│   │   ├── dice.canvas.ts       ← 新建 (核心)
│   │   └── dice.stats.wxml      ← 新建 (可选)
│   ├── roulette/
│   │   ├── roulette.ts          ← 新建
│   │   ├── roulette.wxml        ← 新建
│   │   ├── roulette.wxss        ← 新建
│   │   ├── roulette.json        ← 新建
│   │   └── roulette.stats.wxml  ← 新建 (可选)
│   └── pros-cons/
│       ├── pros-cons.ts         ← 新建
│       ├── pros-cons.wxml       ← 新建
│       ├── pros-cons.wxss       ← 新建
│       ├── pros-cons.json       ← 新建
│       └── pros-cons.stats.wxml ← 新建 (可选)
```

### 修改文件 (移除 TODO，接入真实逻辑)

```
cloudfunctions/
├── login/index.js               ← 填充 TODO (code2Session)
├── decision/index.js            ← 从头实现
├── inbox/index.js               ← 从头实现
├── stats/index.js               ← 从头实现
├── personality/index.js         ← 从头实现
├── subscribe/index.js           ← ✅ 已完成 (模板 ID 已确认)
└── scheduler/index.js           ← ✅ 已完成 (三段式逻辑 + 双模板推送)

miniprogram/
├── core/stores/InboxStore.ts     ← 移除 TODO，接入 dataService
├── core/stores/StatsStore.ts     ← 移除 TODO，接入 dataService
├── core/utils/router.ts         ← 补充 tool-stats 路由
├── pages/index/index.ts         ← 接入真实数据
├── pages/index/index.wxml       ← 接入真实数据
├── pages/review/review.ts       ← 完善标记流程
├── pages/review/review.wxml     ← 完善 Insights 布局
├── pages/me/me.ts               ← 填充个人信息
├── pages/me/me.wxml             ← 填充布局
├── pages/tool-run/tool-run.ts   ← 实现动态工具路由
├── pages/tool-run/tool-run.wxml ← 实现通用壳
├── pages/tool-stats/tool-stats.ts  ← 实现统计页
├── pages/tool-stats/tool-stats.wxml ← 实现图表区
├── pages/quick/quick.ts         ← 实现快速面板
├── pages/quick/quick.wxml       ← 实现面板 UI
├── components/action-sheet/     ← 实现标记浮层
├── components/result-flyer/     ← 实现飞入动画
├── components/personality-badge/ ← 实现人格卡片
├── components/subscribe-modal/  ← 实现授权弹窗
├── components/custom-tab-bar/   ← 替换真实图标 + 小红点
└── app.ts                       ← 补充 Onboarding 逻辑
```

---

## 开发顺序建议

```
第 1 周:
  Day 1-2: CloudBase 集合 + 索引创建，login/decision 云函数
  Day 3-4: inbox/stats/personality 云函数，DataService 联调
  Day 5:   coin.ts + coin.canvas.ts (核心动画)

第 2 周:
  Day 1:   coin.wxml/wxss + tool-run 页联调
  Day 2:   dice.ts + dice.canvas.ts + dice.wxml/wxss
  Day 3:   action-sheet + result-flyer 组件
  Day 4:   review 页完善 (Inbox + Insights 初版)
  Day 5:   人格标签组件 + 预热态

第 3 周:
  Day 1-2: subscribe/scheduler 云函数 + subscribe-modal
  Day 3-4: roulette + pros-cons 工具
  Day 5:   单工具统计页

第 4 周:
  Day 1-2: me 页 + 自定义 Tab Bar
  Day 3:   Onboarding + 全局错误处理
  Day 4:   性能测试 + 低端机适配 + 降级方案
  Day 5:   全面验收 + Bug 修复
```

---

*文档版本: 1.0.0 | 最后更新: 2026-06-28*
