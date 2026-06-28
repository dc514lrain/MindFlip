# 决策大师 (MindFlip) — 接口设计文档

> **Baseline:** [Architecture.md](Architecture.md), [DataModel.md](DataModel.md)  
> **后端:** 微信云开发 CloudBase 云函数  
> **适用阶段:** Phase 1 (MVP V1.0)

---

## 1. 接口规范总则

### 1.1 调用方式

所有客户端到云函数的调用统一通过 `DataService` 防腐层：

```typescript
// ❌ 禁止在页面/组件中直接调用
wx.cloud.callFunction({ name: 'decision', data: { ... } });

// ✅ 必须通过 DataService
await DataService.saveDecision(decision);
```

### 1.2 通用响应格式

```typescript
interface CloudResponse<T> {
  code: number;          // 业务状态码 (见 §6 错误码)
  message: string;       // 人类可读的描述信息
  data: T | null;        // 业务数据负载
  server_time: number;   // 服务器时间戳
}
```

### 1.3 鉴权模式

所有云函数通过 `cloud.getWXContext()` 获取调用者身份：

```javascript
// 云函数入口标准写法
exports.main = async (event, context) => {
  const { OPENID, UNIONID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: 401, message: '未登录', data: null };
  }
  // ...业务逻辑，所有数据库操作以 OPENID 为过滤条件
};
```

客户端不传递 `openid` 参数，由云函数从上下文提取，防止身份伪造。

---

## 2. 云函数清单与接口定义

### 2.1 `login` — 微信登录

| 属性 | 值 |
|------|-----|
| 调用时机 | 小程序每次 `onLaunch`，本地无有效 token 时 |
| 超时 | 3s |
| 内存 | 256MB |

**入参:**
```typescript
interface LoginRequest {
  code: string;   // wx.login() 返回的临时 code
}
```

**出参:**
```typescript
interface LoginResponse {
  token: string;              // 自定义登录态 token (存入本地 Storage)
  user: {
    openid: string;
    unionid: string;
    nickname: string;
    avatar_url: string;
    vip_level: 'free' | 'vip';
    vip_expire_at: number | null;
    tool_slot_used: number;
    tool_slot_max: number;
    privacy_mode: 'standard' | 'deep';
    stats_snapshot: UserStatsSnapshot;
  };
  is_new_user: boolean;       // 是否首次注册
}
```

**业务逻辑:**
1. 调用 `cloud.openapi.auth.code2Session` 换取 `openid` / `unionid` / `session_key`。
2. 查询 `users` 集合是否存在该 `openid`。
3. 若不存在 → 创建新用户记录，`is_new_user = true`。
4. 若存在 → 更新 `last_login_at`，返回已有信息。
5. 生成自定义 token，写入本地 Storage。

---

### 2.2 `decision` — 决策记录 CRUD

| 属性 | 值 |
|------|-----|
| 调用时机 | 工具运行后自动调用 |
| 超时 | 3s |
| 内存 | 256MB |

#### 2.2.1 保存决策记录

```typescript
// 入参
interface SaveDecisionRequest {
  action: 'create';
  tool_type: 'coin' | 'dice' | 'roulette' | 'pros_cons';
  raw_result: string;           // "heads" / "4" / "sector_2"
  semantic_result: string;      // "正面 — 火锅"
  user_memo?: string;           // 用户轻备注（选填）
}

// 出参
interface SaveDecisionResponse {
  decision_id: string;
  created_at: number;
}
```

**业务规则:**
- `follow_status` 初始值固定为 `'pending'`。
- `tool_id` 与 `tool_type` 一致（Phase 1 内置工具）。
- `semantic_result` 最大 200 字符。
- `user_memo` 最大 100 字符。

#### 2.2.2 批量同步决策 (离线恢复用)

```typescript
interface SyncDecisionsRequest {
  action: 'sync';
  decisions: SaveDecisionRequest[];  // 最多 20 条
}
```

> 用于本地乐观创建后网络恢复时的批量同步。云函数端做去重（基于 `_id`）。

---

### 2.3 `inbox` — 待决清单

| 属性 | 值 |
|------|-----|
| 调用时机 | 进入复盘页 / 标记操作 |
| 超时 | 3s |
| 内存 | 256MB |

#### 2.3.1 查询待决列表

```typescript
interface QueryInboxRequest {
  action: 'list';
  page_size?: number;     // 每页条数，默认 20，最大 50
  page_token?: string;    // 分页游标 (上一页最后一条的 _id)
}

interface QueryInboxResponse {
  items: DecisionLog[];
  next_token: string | null;  // 下一页游标，null 表示无更多
  total: number;              // 当前 pending 总数
}
```

**查询条件:**
- `follow_status = 'pending'`
- `created_at >= now() - 48h`
- 按 `created_at DESC` 排序

#### 2.3.2 标记决策

```typescript
interface MarkDecisionRequest {
  action: 'mark';
  decision_id: string;
  follow_status: 'followed' | 'not_followed';
  break_reason?: string;  // 仅 not_followed 时必填，须为系统枚举值
}

interface MarkDecisionResponse {
  marked_at: number;
  // 返回标记是否触发人格标签解锁 (第10次标记时)
  personality_unlocked?: boolean;
  primary_tag?: string;   // 若解锁，返回首次生成的主标签
}
```

**业务规则:**
- 已标记或已过期的记录不可再标记（幂等校验）。
- `break_reason` 必须在系统枚举值范围内，云函数做白名单校验：

```javascript
const VALID_BREAK_REASONS = [
  'intuition', 'external_change', 'just_testing',
  'dislike_result', 'still_thinking',
];
```

- 标记成功后，异步检查是否需要触发人格标签计算（累计标记 ≥ 10 次时触发）。

#### 2.3.3 获取未读计数

```typescript
interface UnreadCountRequest {
  action: 'unread';
}

interface UnreadCountResponse {
  count: number;  // 用于首页/复盘 Tab 小红点
}
```

---

### 2.4 `stats` — 统计数据

| 属性 | 值 |
|------|-----|
| 调用时机 | 进入复盘页 Insights / 单工具统计页 |
| 超时 | 5s |
| 内存 | 512MB |

#### 2.4.1 全局统计概览

```typescript
interface GlobalStatsRequest {
  scope: 'global';
}

interface GlobalStatsResponse {
  total_decisions: number;        // 总决策次数
  total_follow_rate: number;      // 总遵循率 (0-100)
  tool_distribution: {            // 工具使用分布
    coin: number;
    dice: number;
    roulette: number;
    pros_cons: number;
  };
  follow_breakdown: {             // 遵循状态分布
    followed: number;
    not_followed: number;
    pending: number;
    expired: number;
  };
  break_reason_distribution: Record<string, number>;  // 未遵循原因分布
  recent_timeline: DecisionLog[];  // 最近 20 条历史记录
}
```

#### 2.4.2 单工具统计

```typescript
interface ToolStatsRequest {
  scope: 'tool';
  tool_id: string;    // 如 "coin"
}

interface ToolStatsResponse {
  tool_id: string;
  tool_name: string;
  total_uses: number;             // 使用次数
  time_heatmap: number[][];       // 7×24 热力图矩阵 (7天×24小时)
  result_distribution: Record<string, number>;  // 结果分布
  follow_rate: number;
  break_reason_distribution: Record<string, number>;
  history: DecisionLog[];         // 该工具的历史记录 (分页)
}
```

**热力图数据结构说明:**
```typescript
// time_heatmap[day][hour] = 该时段决策次数
// day: 0=周一 ... 6=周日, hour: 0-23
// 前端用此数据渲染热力图组件
```

---

### 2.5 `personality` — 人格标签

| 属性 | 值 |
|------|-----|
| 调用时机 | 用户标记第 10 次后自动触发 / 每周五定时结算 |
| 超时 | 5s |
| 内存 | 512MB |

#### 2.5.1 获取当前人格标签

```typescript
interface GetPersonalityRequest {
  period?: 'weekly' | 'all_time';  // 默认 'weekly'
}

interface GetPersonalityResponse {
  tags: {
    primary: { name: string; icon: string };       // 主标签
    secondary: { name: string; icon: string }[];   // 副标签 (最多2个)
  } | null;                       // null 表示尚未解锁 (标记不足 10 次)
  preheat_progress: {
    current: number;              // 当前标记次数 (0-9)
    required: number;             // 解锁所需次数 (固定 10)
    next_milestone_msg: string;   // 如 "还差 6 次即可生成专属人格档案"
  };
  stats_basis: {                  // 标签计算依据
    follow_rate: number;
    dominant_break_reason: string;
    top_tool: string;
  };
  calculated_at: number | null;   // 计算时间，null 表示未解锁
}
```

#### 2.5.2 强制重新计算 (内部 / 管理用)

```typescript
interface RecalculateRequest {
  action: 'recalculate';
  algorithm_version?: string;  // 手动指定算法版本
}
```

**标签计算规则 (MVP 版 IF-ELSE):**

```javascript
// MVP 阶段标签判定逻辑（云函数中实现）
function computePrimaryTag(stats) {
  if (stats.follow_rate > 0.9) return { name: '绝对理性派', icon: '🎯' };
  if (stats.follow_rate < 0.3) return { name: '逆向叛逆者', icon: '🔄' };
  if (stats.top_tool === 'coin' && stats.follow_rate > 0.7) return { name: '天意顺从者', icon: '🙏' };
  if (stats.dominant_break_reason === 'intuition') return { name: '直觉驱动型', icon: '🧠' };
  if (stats.dominant_break_reason === 'just_testing') return { name: '工具探索型', icon: '🧪' };
  if (stats.dominant_break_reason === 'external_change') return { name: '务实应变型', icon: '🌧️' };
  if (stats.dominant_break_reason === 'still_thinking') return { name: '审慎观望型', icon: '⏳' };
  return { name: '理性决策者', icon: '⚖️' };  // fallback
}
```

> **扩展预留:** 标签判定规则放在独立函数文件中，后续引入 GDMS 量表或 ML 聚类时只需替换此函数。

---

### 2.6 `subscribe` — 订阅消息

| 属性 | 值 |
|------|-----|
| 调用时机 | 定时任务触发 / 用户更新授权状态 |
| 超时 | 10s |
| 内存 | 256MB |

#### 2.6.1 更新授权状态

```typescript
interface UpdateSubscribeRequest {
  action: 'update_auth';
  is_authorized: boolean;
}

// 无业务数据返回，仅 code/message
```

**业务逻辑:**
- `is_authorized = true` → 重置 `rejected_count = 0`, `banner_skip_count = 0`。
- `is_authorized = false` → `rejected_count += 1`, 检查是否触发三振出局。

#### 2.6.2 发送推送 (由 `scheduler` 云函数内部调用)

```typescript
// 不直接暴露给客户端。由 scheduler 定时触发器调用。
// 根据 template_type 自动选择模板和字段映射

// ═══ 模板 1: 待办事项提醒 ═══
// 模板 ID: 00_yc3if3s1BFTytpy49f2P8_tElEc3DibxcNzN5d88
// 用途: 24h 决策复盘聚合推送
interface SendInboxPush {
  action: 'send_push';
  template_type: 'inbox';
  touser: string;                     // OpenID
  count: number;                      // pending 数量
  page: 'pages/review/review';
  data: {
    thing1: { value: string };       // 待办名称: "决策复盘提醒"
    number2: { value: number };      // 待办事项数量: count
    thing3: { value: string };       // 备注: "点击完成复盘标记"
  };
}

// ═══ 模板 2: 测评报告生成通知 ═══
// 模板 ID: EVk9xTAqm-Fb8Sp_VQTv55ZypUcEpAGJxq7rJOiBLSM
// 用途: 每周五人格周刊出刊通知
interface SendWeeklyPush {
  action: 'send_push';
  template_type: 'weekly';
  touser: string;                     // OpenID
  tag_name: string;                   // 人格标签名称 (如 "绝对理性派")
  page: 'pages/review/review';
  data: {
    thing1: { value: string };       // 测评项目: "个人决策行为周刊"
    phrase2: { value: string };      // 测评结果: tag_name
    thing3: { value: string };       // 备注: "点击查看本周完整报告"
  };
}
```

---

### 2.7 `scheduler` — 定时任务

| 属性 | 值 |
|------|-----|
| 触发方式 | 定时触发器 (每天 9:00) |
| 超时 | 30s |
| 内存 | 256MB |

**执行流程:**

```
1. 24h 复盘推送 (模板 1: 待办事项提醒):
   - 查询 decision_logs: follow_status='pending', 24h <= (now-created_at) < 48h
   - 按 _openid 聚合
   - 过滤: 跳过 subscribe_config.is_authorized = false 的用户
   - 逐用户推送，字段映射: thing1='决策复盘提醒', number2=count, thing3='点击完成复盘标记'

2. 48h 过期自动标记:
   - 查询 decision_logs: follow_status='pending', (now-created_at) >= 48h
   → 批量更新 status='expired', expired_at=now

3. 每周五人格周刊推送 (模板 2: 测评报告生成通知):
   - 仅在 d.getDay() === 5 时执行
   → 调用 personality 云函数计算 weekly 标签
   → 向已授权用户推送，字段映射: thing1='个人决策行为周刊', phrase2=tag_name, thing3='点击查看本周完整报告'
```

**注意:** 微信订阅消息发送需小程序的类目资质审核通过。模板文案必须使用"服务通知"类目的标准模板，禁止包含营销内容。

---

## 3. 工具扩展接口支持

> **重要：** 工具层的接口设计采用 `tool_type` + `tool_id` 双标识架构，确保新增工具时无需修改云函数核心逻辑。

### 3.1 决策记录的通用性设计

`decision` 云函数 `create` 接口中，`tool_type` 和 `tool_id` 是开放字段：

```typescript
// decision 云函数不维护工具类型的硬编码白名单
// 任何 tool_type / tool_id 都接受写入
// 前端 ToolRegistry 负责约束合法工具类型
```

**这确保了:**
- Phase 1 新增内置工具 → 只需在前端 `tools/` 下创建模块 + 注册 manifest，云函数零改动。
- Phase 2 上线自定义工具 → `tool_type: 'custom_schema'` 直接可用，云函数零改动。

### 3.2 统计接口的工具适配

`stats` 云函数的单工具统计接口接受任意 `tool_id`，自动按该工具过滤 `decision_logs`。新增工具时统计接口自动覆盖，无需修改云函数。

**唯一需要同步更新的场景:**
- 全局统计的 `tool_distribution` (各工具使用分布) 返回的是已有数据的动态聚合——新工具上线后，有了使用记录，这个分布会自动包含新工具。
- 如果需要在后端对这个分布做类型约束，只需在云函数中维护一个工具白名单常量 (从 CloudBase `tools_meta` 配置集合读取)，而非硬编码。

### 3.3 推荐：创建 `tools_meta` 配置集合

为彻底解耦，建议在 CloudBase 中创建配置集合 `tools_meta`：

```typescript
interface ToolMeta {
  tool_id: string;         // "coin" / "dice" / "roulette" / "pros_cons"
  tool_name: string;       // 显示名
  group: string;           // "instant" | "decision"
  version: number;         // 工具版本
  is_active: boolean;      // 是否启用 (可随时下线)
}
```

**收益:**
- 新增工具时，在 `tools_meta` 插入一条记录 + 前端创建模块 = 完成。
- 云函数统计/列表接口直接从此集合读取工具清单，不再硬编码。
- 工具下线只需 `is_active = false`，无需发版。

---

## 4. 接口调用频次约束

| 接口 | 调用方 | 约束 |
|------|--------|------|
| `login` | 小程序启动 | 每次 `onLaunch` 最多 1 次 |
| `decision.create` | 工具运行后 | 无限制（每次工具使用调用 1 次） |
| `decision.sync` | 离线恢复 | 每次最多 20 条，去重写 |
| `inbox.list` | 复盘页滚动 | 每页 20 条，建议预加载 2 页 |
| `inbox.mark` | 用户点击按钮 | 每条决策标记 1 次，幂等 |
| `inbox.unread` | Tab 切换 / 首页 onShow | 建议 10s 节流 |
| `stats.global` | 复盘页 Insights | 进入页面查 1 次，下拉刷新 |
| `stats.tool` | 单工具统计页 | 进入页面查 1 次 |
| `personality.get` | 首页 / 我的页 | 进入页面查 1 次，本地缓存 1h |
| `subscribe.update_auth` | 授权弹窗确认 | 每次授权交互 1 次 |
| `scheduler` | 定时触发器 | 每天 1 次 |

---

## 5. 客户端 DataService 接口签名

```typescript
// core/services/DataService.ts
// ═══ 以下是 DataService 暴露给前端的所有方法签名 ═══

class DataService {
  // ── 用户 ──
  login(code: string): Promise<CloudResponse<LoginResponse>>;
  getUserProfile(): Promise<CloudResponse<User>>;

  // ── 决策记录 ──
  saveDecision(req: SaveDecisionRequest): Promise<CloudResponse<SaveDecisionResponse>>;
  syncDecisions(req: SyncDecisionsRequest): Promise<CloudResponse<void>>;

  // ── 待决清单 ──
  queryInbox(pageSize?: number, pageToken?: string): Promise<CloudResponse<QueryInboxResponse>>;
  markDecision(req: MarkDecisionRequest): Promise<CloudResponse<MarkDecisionResponse>>;
  getUnreadCount(): Promise<CloudResponse<UnreadCountResponse>>;

  // ── 统计 ──
  getGlobalStats(): Promise<CloudResponse<GlobalStatsResponse>>;
  getToolStats(toolId: string): Promise<CloudResponse<ToolStatsResponse>>;

  // ── 人格标签 ──
  getPersonality(period?: 'weekly' | 'all_time'): Promise<CloudResponse<GetPersonalityResponse>>;

  // ── 订阅消息 ──
  updateSubscribeAuth(isAuthorized: boolean): Promise<CloudResponse<void>>;

  // ── 本地缓存 ──
  cacheUser(user: User): void;
  getCachedUser(): User | null;
  cachePersonality(personality: GetPersonalityResponse, ttlMs: number): void;
  getCachedPersonality(): GetPersonalityResponse | null;
}
```

---

## 6. 错误码体系

| 状态码 | 含义 | 前端处理 |
|:------|------|---------|
| `0` | 成功 | — |
| `401` | 未登录 / 登录态过期 | 重新触发 `login()` |
| `403` | 权限不足 (如 Free 用户调用 VIP 接口) | 展示升级引导弹窗 |
| `404` | 资源不存在 | 静默忽略或提示"已删除" |
| `409` | 数据冲突 (如重复标记) | 刷新本地状态 |
| `422` | 参数校验失败 | Toast 提示具体错误信息 |
| `429` | 请求过于频繁 | 3s 后自动重试 |
| `500` | 服务器内部错误 | "网络波动，请稍后再试" Toast |
| `503` | 云函数冷启动超时 | 2s 后自动重试 1 次 |
| `1001` | 订阅消息模板不存在 | 内部告警，用户无感知 |
| `1002` | 订阅消息用户未授权 | 引导开启授权 (Banner/弹窗) |
| `1003` | 订阅消息已达日限额 | 次日自动恢复 |

**前端统一错误处理 (DataService 内部拦截):**

```typescript
// DataService 中对云函数返回做统一处理
async function handleResponse<T>(res: CloudResponse<T>): Promise<T> {
  if (res.code === 0) return res.data!;
  if (res.code === 401) { /* trigger re-login */ }
  if (res.code === 403) { /* show VIP upsell */ }
  if (res.code === 422) { wx.showToast({ title: res.message, icon: 'none' }); }
  if (res.code >= 500) { wx.showToast({ title: '网络波动，请稍后再试', icon: 'none' }); }
  throw new DataServiceError(res.code, res.message);
}
```

---

## 7. 新增工具 Checklist (接口视角)

当需要新增一个内置决策工具（如"决策树"）或后续接入自定义工具时，从后端接口的角度，需要检查以下项：

| # | 检查项 | 说明 |
|:--|------|------|
| 1 | `tool_type` 值确定 | 新工具的唯一类型标识，如 `"decision_tree"`。Phase 2 自定义工具统一用 `"custom_schema"` |
| 2 | `tools_meta` 配置集合 | 插入一条 `{ tool_id: "decision_tree", ... }` 记录 (若已创建此集合) |
| 3 | `decision.create` 接口 | **无需修改。** `tool_type` 字段为开放字符串，任意值均可写入 |
| 4 | `stats.tool` 接口 | **无需修改。** `tool_id` 为参数，自动按该工具过滤聚合 |
| 5 | `stats.global` → `tool_distribution` | **无需修改。** 数据动态聚合，新工具有记录后自动出现 |
| 6 | `inbox.list` 接口 | **无需修改。** 不按工具类型过滤 |
| 7 | `personality` → `top_tool` | 若新工具可能成为用户最常用工具，需在标签文案中考虑展示。**MVP 阶段用通用 fallback，不需要修改** |
| 8 | 前端 `ToolRegistry` | 编写 `manifest.ts` + `app.ts` import 激活。详见 [Architecture.md § 4](Architecture.md#4-工具注册中心-tool-registry--核心解耦设计) |
| 9 | `app.json` 路由 | 若工具有独立页面则注册路由 |
| 10 | 数据库权限 | 若新工具产生新集合，设置 `_openid` 权限策略 |

> **核心原则：新增工具时，后端云函数 99% 情况下无需修改。** 所有工具特定逻辑（UI、交互、随机算法）均在前端 `tools/<tool-id>/` 模块内完成。云函数只做通用的数据持久化和聚合统计。

---

## 8. Postman / 云函数调试入口

云函数本地调试:

```bash
# 安装 cloudbase-cli
npm install -g @cloudbase/cli

# 本地调用云函数
tcb fn invoke login --params '{"code":"test_code_xxx"}'

# 查看云函数日志
tcb fn log login --limit 20
```

微信开发者工具 → 云开发控制台 → 云函数 → 选择函数 → "测试" 选项卡，可直接填写 JSON 参数进行云端测试。
