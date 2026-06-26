# 决策大师 (MindFlip) — 数据模型设计

> **Baseline:** [FeatureAnalyze.md § 2.1.5](FeatureAnalyze.md#215-决策数据模型-decisionlog), [Architecture.md](Architecture.md)  
> **数据库:** 微信云开发 CloudBase 文档型数据库  
> **适用阶段:** Phase 1 (MVP V1.0)，已预留 Phase 2 字段

---

## 1. 集合总览

| 集合名 | 说明 | 读写模式 | 预估增长 |
|--------|------|:------:|:------:|
| `users` | 用户基础信息 + VIP 权益 | 读高频 / 写低频 | 线性 |
| `decision_logs` | 决策记录 (核心) | 读写双高频 | 线性 (每用户每天 ~5-20 条) |
| `personality_tags` | 人格标签历史快照 | 读中频 / 写极低频 (每周) | 线性 |
| `subscribe_config` | 订阅消息授权状态 | 读中频 / 写低频 | 与用户数 1:1 |
| `tool_templates` | 自定义工具模板 (Phase 2) | 读高频 / 写中频 | 每用户 ≤ 5 条 |
| `tool_snapshots` | 工具分享版本快照 (Phase 2) | 读低频 / 写低频 | 不定 |
| `sku_config` | 订阅商品 SKU 配置 | 只读 | ≤ 10 条 |

> CloudBase 文档型数据库每集合自动包含 `_id` (string) 和 `_openid` (string, 仅创建者可读时的用户身份)，无需手动定义。

---

## 2. 集合详细设计

### 2.1 `users` — 用户信息

```typescript
interface User {
  _id: string;                    // CloudBase 自动生成
  _openid: string;                // 微信 OpenID (CloudBase 自动填充)

  // ═══ 微信身份 ═══
  unionid: string;                // 微信 UnionID (多端互通关键字段)
  nickname: string;               // 微信昵称
  avatar_url: string;             // 微信头像 URL

  // ═══ VIP 权益 ═══
  vip_level: 'free' | 'vip';     // 订阅等级
  vip_expire_at: number | null;   // VIP 到期时间戳 (free 用户为 null)
  vip_since: number | null;       // 首次订阅时间 (用于统计)
  tool_slot_used: number;         // 已用工具槽位数 (默认 0)
  tool_slot_max: number;          // 最大槽位数 (free=1, vip=5)

  // ═══ 隐私设置 ═══
  privacy_mode: 'standard' | 'deep'; // 隐私模式 (Phase 2 deep 模式激活)
  encryption_salt?: string;       // PBKDF2 盐值 (Phase 2 设定 PIN 时生成)

  // ═══ 统计快照 (首页快速展示, 云函数每 30 分钟更新一次) ═══
  stats_snapshot: {
    total_decisions: number;      // 总决策次数
    total_follow_rate: number;    // 总遵循率 (0-100)
    primary_tag?: string;         // 当前主标签
    weekly_decisions: number;     // 本周决策次数
    updated_at: number;           // 快照更新时间戳
  };

  // ═══ 元数据 ═══
  created_at: number;             // 注册时间戳
  updated_at: number;             // 最后更新时间戳
  last_login_at: number;          // 最后登录时间
}
```

**索引策略:**

| 索引字段 | 类型 | 说明 |
|---------|:----:|------|
| `_openid` | 唯一索引 | 自动创建，CloudBase 权限控制用 |
| `unionid` | 普通索引 | 用于未来多端数据互通查询 |
| `vip_level` + `vip_expire_at` | 复合索引 | 查询到期 VIP 用户 (定时任务用) |

**Phase 2 预留字段:**
- `privacy_mode: 'deep'` — 用户开启深度隐私
- `encryption_salt` — PBKDF2 密钥派生盐值
- `tool_slot_max` 可扩展至 10 (Pro 档)

---

### 2.2 `decision_logs` — 决策记录 (核心集合)

```typescript
interface DecisionLog {
  _id: string;                    // CloudBase 自动生成
  _openid: string;                // 微信 OpenID (CloudBase 自动填充)

  // ═══ 工具标识 ═══
  tool_type: 'coin' | 'dice' | 'roulette' | 'pros_cons' | 'custom_schema';
  tool_id: string;                // 工具 ID (与 ToolManifest.id 对应)
  tool_name: string;              // 工具名称 (快照，方便展示)

  // ═══ 决策结果 ═══
  raw_result: string;             // 原始物理结果: "heads" / "tails" / "4" / "sector_2"
  semantic_result: string;        // 语义结果: "正面 — 火锅" / "卖出信号"
  user_memo: string;              // 用户轻备注 (极速组事后补充上下文)

  // ═══ 标记状态 (核心生命周期) ═══
  follow_status: 'pending' | 'followed' | 'not_followed' | 'expired';
  break_reason: string | null;    // 未遵循原因标签 (系统预设枚举，仅 not_followed 时非空)

  // ═══ 时间戳 ═══
  created_at: number;             // 决策产生时间 (ms 时间戳)
  marked_at: number | null;       // 用户标记时间 (pending/expired 时为 null)
  expired_at: number | null;      // 自动过期时间 (status=expired 时记录)

  // ═══ Phase 2 预留字段 ═══
  custom_tool_version?: string;   // 自定义工具版本号 (用于历史记录渲染兼容)
  actionable_advice?: string;     // 自定义工具产出的"执行建议" (如 "买入"/"卖出")
}
```

**`break_reason` 枚举值（系统预设，不可自定义）:**

| 值 | 标签 | 心理画像映射 |
|----|------|-------------|
| `intuition` | 🧠 直觉告诉我另一个更好 | 直觉驱动型 |
| `external_change` | 🌧️ 外部条件变化了 | 务实应变型 |
| `just_testing` | 🔍 我只是试试看 | 工具探索型 |
| `dislike_result` | 😅 结果我不喜欢 | 结果导向型 |
| `still_thinking` | 🤔 我再想想 | 审慎观望型 |

**状态生命周期:**

```
pending ──(用户标记"遵循了")──→ followed
pending ──(用户标记"没遵循")──→ not_followed
pending ──(超过48h未标记)────→ expired
followed / not_followed / expired → 不可再修改
```

**索引策略:**

| 索引字段 | 类型 | 说明 |
|---------|:----:|------|
| `_openid` + `follow_status` + `created_at` | 复合索引 (DESC) | 待决清单查询：该用户 pending 记录按时间倒序 |
| `_openid` + `tool_type` + `created_at` | 复合索引 (DESC) | 单工具统计查询 |
| `_openid` + `follow_status` + `expired_at` | 复合索引 | 定时任务：找出需过期的记录 |
| `created_at` | 普通索引 | 定时任务全局扫描 |

**数据保留策略:**
- 决策记录永久保留（作为用户行为画像基础数据）。
- Phase 1 不考虑自动删除。Phase 3 可增加"用户主动删除"功能。

---

### 2.3 `personality_tags` — 人格标签快照

```typescript
interface PersonalityTag {
  _id: string;                    // CloudBase 自动生成
  _openid: string;                // 微信 OpenID

  // ═══ 标签计算周期 ═══
  period_type: 'weekly' | 'all_time';  // 本周人格 / 总人格
  period_start: number;           // 数据窗口起始时间戳
  period_end: number;             // 数据窗口结束时间戳

  // ═══ 标签结果 ═══
  primary_tag: string;            // 主标签 (如 "绝对理性派")
  primary_tag_icon: string;       // 主标签 emoji (如 "🎯")
  secondary_tags: string[];       // 副标签 (最多 2 个)
  secondary_tag_icons: string[];  // 副标签 emoji

  // ═══ 计算依据 (用于调试和后续算法优化) ═══
  calculation_input: {
    total_decisions: number;      // 窗口内总决策数
    followed_count: number;       // 遵循次数
    not_followed_count: number;   // 未遵循次数
    follow_rate: number;          // 遵循率
    break_reason_distribution: Record<string, number>; // 各原因占比
    tool_diversity: number;       // 使用工具种类数
  };

  // ═══ 元数据 ═══
  calculated_at: number;          // 计算时间戳 (每周五 17:00)
  algorithm_version: string;      // 算法版本号 (便于后续优化时区分)
}
```

**索引策略:**

| 索引字段 | 类型 | 说明 |
|---------|:----:|------|
| `_openid` + `period_type` + `period_end` | 复合索引 (DESC) | 查询用户最新人格标签 |
| `period_end` | 普通索引 | 定时任务：找出需结算的周期 |

**数据保留策略:**
- 每次结算新增一条记录，不覆写历史。
- 首页展示取最新一条 `period_type = 'weekly'`。
- "我的"页展示最新一条 `period_type = 'all_time'`。

---

### 2.4 `subscribe_config` — 订阅消息授权

```typescript
interface SubscribeConfig {
  _id: string;                    // CloudBase 自动生成
  _openid: string;                // 微信 OpenID

  // ═══ 授权状态 ═══
  is_authorized: boolean;         // 是否已授权订阅消息
  authorized_at: number | null;   // 授权时间
  rejected_count: number;         // 被拒次数 (用于三振出局和智能路由)

  // ═══ Banner 状态 ═══
  banner_dismissed: boolean;      // 是否已永久隐藏订阅 Banner
  banner_last_shown_at: number;   // Banner 最后展示时间
  banner_skip_count: number;      // 用户连续进入 Inbox 但未点击 Banner 的次数

  // ═══ 元数据 ═══
  created_at: number;
  updated_at: number;
}
```

**索引策略:**

| 索引字段 | 类型 | 说明 |
|---------|:----:|------|
| `_openid` | 唯一索引 | 每用户仅一条记录 |

**三振出局逻辑:**
- `is_authorized = false` & `rejected_count >= 3` → 不再主动弹出授权，仅显示"自行开启"引导。
- `banner_skip_count >= 3` 或 `banner_dismissed = true` → Banner 永久隐藏。

---

### 2.5 `tool_templates` — 自定义工具模板 (Phase 2)

```typescript
interface ToolTemplate {
  _id: string;                    // CloudBase 自动生成
  _openid: string;                // 创建者 OpenID

  // ═══ 工具身份 ═══
  template_id: string;            // 工具唯一 ID (如 "tpl_abc123")
  name: string;                   // 工具名称
  description: string;            // 工具描述
  category: string;               // 分类标签 (如 "投资" / "生活" / "心理")

  // ═══ Block Protocol 核心 ═══
  block_schema: BlockSchema;      // Block 数组 + 布局信息 (详见 Architecture.md § 4)
  version: number;                // 工具版本号 (编辑递增)

  // ═══ Inbox 行为 ═══
  actionable: boolean;            // 是否产出"执行建议"进入 Inbox

  // ═══ 来源追溯 ═══
  source: 'scratch' | 'template' | 'shared';  // 创建来源
  source_template_id?: string;    // 若从模板克隆，记录源模板 ID
  source_shared_by?: string;      // 若从分享接收，记录分享者 OpenID

  // ═══ 加密 ═══
  is_encrypted: boolean;          // 是否端侧加密存储
  encrypted_data?: string;        // 加密后的 JSON Schema 密文 (隐私模式)
  // 明文版存在 block_schema，密文版存在 encrypted_data，两者互斥

  // ═══ 元数据 ═══
  created_at: number;
  updated_at: number;
  deleted_at: number | null;      // 软删除时间戳
}
```

> Phase 1 不操作此集合。数据模型在此定义是为了确保 `decision_logs.custom_tool_version` 等字段与模板体系对齐。

---

### 2.6 `tool_snapshots` — 工具分享快照 (Phase 2)

```typescript
interface ToolSnapshot {
  _id: string;
  _openid: string;                // 分享者 OpenID

  snapshot_id: string;            // 快照唯一 ID (用于生成分享码)
  source_template_id: string;     // 源工具模板 ID
  template_version: number;       // 分享那一刻的版本号
  block_schema: BlockSchema;      // 版本锁定的完整 Schema (独立副本)

  // ═══ 分享者信息 ═══
  sharer_nickname: string;        // 分享者昵称 (用于尾标展示)
  sharer_avatar: string;          // 分享者头像

  created_at: number;
  expires_at: number | null;      // 分享过期时间 (可选)
}
```

---

### 2.7 `sku_config` — 订阅商品配置

```typescript
interface SkuConfig {
  _id: string;
  sku_id: string;                 // 微信支付商品 SKU ID
  name: string;                   // 商品名称 (如 "月度订阅")
  price: number;                  // 价格 (分, 如 1500 = ¥15.00)
  original_price: number;         // 原价 (用于划线价展示)
  period: 'trial' | 'monthly' | 'yearly';
  is_active: boolean;             // 是否上架 (后台可随时下架)
  trial_limit: 'first_only' | 'none'; // 首月特惠仅限首次购买
  sort_order: number;             // 排序权重
  created_at: number;
  updated_at: number;
}
```

---

## 3. 数据隐私与脱敏规则

### 3.1 三层数据保护

| 数据类别 | 存储策略 | 明文? | 存储位置 |
|---------|---------|:----:|------|
| **工具模板** (JSON Schema) | 标准模式云数据库明文 / 深度模式端侧 AES-256-GCM 加密后密文上云 | 仅标准模式 | `tool_templates` |
| **使用输入** (股价/金额等) | **阅后即焚——不存储。** 仅记 `semantic_result` | N/A | 不存储 |
| **决策记录** (遵循/未遵循) | 明文上云，UnionID 绑定，不参与公开排行 | ✅ | `decision_logs` |

### 3.2 私有数据不上报

- 所有决策数据查询通过 `_openid` 过滤，云端权限策略确保每个用户只能访问自己的数据。
- 统计聚合在云函数中完成，客户端只接收聚合后的结果（如"总遵循率 82%"），不接触其他用户原始数据。
- 人格标签海报中的"本周决策摘要"仅展示聚合统计数据，不含具体决策内容。

---

## 4. 数据一致性保证

| 场景 | 策略 |
|------|------|
| 用户标记决策时网络中断 | 本地先乐观更新 MobX Store + 本地 Storage 缓存标记操作，网络恢复后 DataService 批量同步 |
| 人格标签计算中 | `personality_tags` 的 `algorithm_version` 字段保证不同版本算法结果可区分 |
| 定时任务重复执行 | 云函数幂等设计：标记 `expired` 前检查当前状态，避免覆盖用户手动标记 |
| 端侧加密数据换设备 | `users.encryption_salt` 保留，用户输入 PIN 后重新派生密钥解密 |

---

## 5. 数据迁移与版本演进

### 5.1 Phase 1 → Phase 2

| 变更 | 策略 |
|------|------|
| `tool_type` 新增 `custom_schema` | 枚举扩展，无迁移成本 |
| `decision_logs` 新增 `custom_tool_version` | 新增可选字段，旧记录为 `null` |
| `users.tool_slot_max` 从 `1/5` 扩至 `1/5/10` | 直接修改配置值，无需迁移 |
| 新增 `tool_templates` 集合 | 新集合，无迁移 |
| `privacy_mode: 'deep'` 激活 | 已预留字段，直接使用 |

### 5.2 迁移原则

- 永远只在文档 Schema 末尾追加可选 (`?`) 字段，不删除或重命名已有字段。
- 每 Schema 变更记录在 `CHANGELOG.md` 中。
- 云函数兼容新旧 Schema：读取时对缺失字段提供默认值。
