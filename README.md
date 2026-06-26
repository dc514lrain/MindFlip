# 决策大师 (MindFlip) — 初始化完成

## 项目概述

MindFlip 是一款基于微信小程序的决策辅助工具，将随机性作为理性决策的盟友，帮助用户在纠结时刻做出选择。

## 技术栈

- **渲染引擎**: Skyline (3.x+)
- **组件框架**: Glass-Easel
- **语言**: TypeScript 5.x strict
- **状态管理**: mobx-miniprogram 6.x
- **后端**: 微信云开发 CloudBase

## 目录结构

```
MindFlip/
├── miniprogram/                 # 小程序源码根目录
│   ├── app.ts / app.json / app.wxss   # 入口文件
│   ├── core/                   # 核心框架层
│   │   ├── services/DataService.ts      # 防腐层
│   │   ├── stores/                        # MobX Store (AppStore/InboxStore/StatsStore)
│   │   ├── registry/                      # ToolRegistry / ToolManifest
│   │   └── utils/                        # 工具函数
│   ├── tools/                  # 决策工具层
│   │   ├── _base/             # 工具基类 + 共享组件
│   │   ├── coin/              # 硬币
│   │   ├── dice/             # 骰子
│   │   ├── roulette/          # 大转盘
│   │   └── pros-cons/        # 优缺点对比
│   ├── pages/                # 页面层
│   │   ├── index/            # 首页
│   │   ├── review/            # 复盘
│   │   ├── me/               # 我的
│   │   ├── quick/            # 快速选择
│   │   ├── tool-run/         # 工具运行态
│   │   ├── tool-stats/       # 工具统计
│   │   └── subscribe-guide/  # 订阅消息引导
│   ├── components/           # 全局共享组件
│   ├── styles/               # 全局样式
│   └── assets/               # 静态资源
├── cloudfunctions/            # 云函数
│   ├── login/                # 登录
│   ├── decision/             # 决策记录
│   ├── inbox/                # 待决清单
│   ├── stats/                # 统计
│   ├── personality/          # 人格标签
│   ├── subscribe/            # 订阅消息
│   └── scheduler/            # 定时任务
├── doc/                       # 技术文档
└── package.json / tsconfig.json / project.config.json
```

## 快速开始

1. 在微信开发者工具中打开项目根目录
2. 选择"小程序"项目类型，填入 AppID: `wxf80d3193e000946f`
3. 开通云开发，创建环境（env: `mindflip-dev`）
4. 安装依赖: `npm install`
5. 部署云函数: 右键每个 `cloudfunctions/` 下的函数 → 上传并部署
6. 在开发者工具中预览/真机调试

## 下一步

1. 替换 `assets/icons/` 中的 SVG 图标为实际设计资源
2. 完善云函数中的微信 API 调用（`login` 云函数的 `code2Session`）
3. 在 CloudBase 控制台创建数据库集合和索引
4. 配置微信订阅消息模板 ID
5. 实现具体业务逻辑代码

---

## 完整资源清单（代码之外所需素材）

### 一、图标资源 (`miniprogram/assets/icons/`)

| 文件名 | 用途 | 规格要求 |
|--------|------|---------|
| `coin.svg` | 硬币工具图标 | 48×48dp，SVG 格式，支持 PNG fallback |
| `dice.svg` | 骰子工具图标 | 48×48dp，SVG 格式 |
| `roulette.svg` | 大转盘工具图标 | 48×48dp，SVG 格式 |
| `pros-cons.svg` | 优缺点对比工具图标 | 48×48dp，SVG 格式 |
| `default-avatar.svg` | 用户默认头像占位 | 120×120px，圆形设计 |
| `tab-icon-home.svg` | TabBar 首页图标 | 48×48dp，正常态 + 选中态各一套 |
| `tab-icon-review.svg` | TabBar 复盘图标 | 48×48dp，正常态 + 选中态各一套 |
| `tab-icon-me.svg` | TabBar 我的图标 | 48×48dp，正常态 + 选中态各一套 |
| `tool-run-bg.svg` | 工具运行页背景图（可选） | 750×1334px (iPhone 6 屏幕宽度) |

### 二、Canvas 2D 动画纹理资源（硬币、骰子）

#### 硬币动画素材 (`miniprogram/assets/coin/`)

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `coin_heads.png` | 硬币正面 PNG 纹理 | 256×256px，PNG-24，带透明通道，≤ 50KB |
| `coin_tails.png` | 硬币反面 PNG 纹理 | 256×256px，PNG-24，带透明通道，≤ 50KB |
| `coin_side.png` | 硬币侧面边缘纹理（3D 旋转用） | 256×256px，PNG-24，带透明通道 |
| `coin_shadow.png` | 硬币投影 PNG | 256×256px，PNG-8 灰度，≤ 10KB |
| `coin_glow.png` | 结果揭晓光晕效果 PNG | 512×512px，径向渐变 PNG，≤ 30KB |

#### 骰子动画素材 (`miniprogram/assets/dice/`)

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `dice_face_1.png` | 骰子 1 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_face_2.png` | 骰子 2 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_face_3.png` | 骰子 3 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_face_4.png` | 骰子 4 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_face_5.png` | 骰子 5 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_face_6.png` | 骰子 6 点面 PNG 纹理 | 256×256px，PNG-24，带透明通道 |
| `dice_shadow.png` | 骰子落地投影 PNG | 256×256px，PNG-8 灰度 |
| `dice_particle.png` | 骰子碰撞粒子特效 PNG | 128×128px，PNG 序列帧，≤ 20KB |

#### 大转盘动画素材 (`miniprogram/assets/roulette/`)

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `roulette_wheel.png` | 转盘底图（带扇区分割线） | 600×600px，PNG-24，或 Canvas 实时绘制 |
| `roulette_pointer.png` | 转盘指针 PNG | 100×200px，PNG-24，带透明通道 |
| `roulette_center.png` | 转盘中心装饰 PNG | 80×80px，PNG-24，带透明通道 |
| `roulette_tick.png` | 转盘停靠音效（可选） | MP3/WAV，小于 50KB |

### 三、UI 视觉素材

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `logo.svg` | App Logo 品牌标识 | 矢量 SVG + 256×256 PNG fallback |
| `splash_screen.svg` | 启动页背景图 | 750×1334px，PNG-24 |
| `empty_inbox.svg` | 待决清单为空插画 | 400×400px，PNG-24，≤ 100KB |
| `empty_stats.svg` | 统计页为空插画 | 400×400px，PNG-24，≤ 100KB |
| `personality_unlock.svg` | 人格标签解锁庆祝插画 | 600×600px，PNG-24，≤ 150KB |
| `vip_banner.svg` | VIP 升级 Banner 图 | 750×300px，PNG-24 |

### 四、字体资源 (`miniprogram/assets/fonts/`)

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `EditorialFont-Regular.woff2` | 杂志风正文字体 | WOFF2 格式，≤ 100KB |
| `EditorialFont-Bold.woff2` | 杂志风粗体 | WOFF2 格式，≤ 100KB |

> **注意**: 微信小程序对字体加载有特殊限制，Phase 1 建议使用系统字体栈，不引入自定义字体文件以减少包体积。字体文件如需引入请转为 TTF 格式并在 app.wxss 中使用 `@font-face` 引入（总大小建议 ≤ 200KB）。

### 五、工具模板预览缩略图 (`miniprogram/assets/templates/`)

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `coin_preview.png` | 硬币工具首页预览缩略图 | 375×300px，PNG-24，Free 用户展示用 |
| `dice_preview.png` | 骰子工具首页预览缩略图 | 375×300px，PNG-24 |
| `roulette_preview.png` | 大转盘工具首页预览缩略图 | 375×300px，PNG-24 |
| `pros_cons_preview.png` | 优缺点对比首页预览缩略图 | 375×300px，PNG-24 |

### 六、背景纹理素材

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `bg_noise.svg` | 全局页面背景噪点纹理（可选） | 平铺 SVG，≤ 5KB |
| `card_shadow.png` | 卡片投影阴影 PNG（可选） | 10×10px，平铺重复 |

### 七、社交/分享素材

| 文件名 | 用途 | 规格 |
|--------|------|------|
| `share_poster_bg.png` | 分享海报背景图 | 750×1200px，PNG-24 |
| `personality_poster_template.png` | 人格标签海报模板 | 750×1200px，PNG-24，Phase 2 |

### 八、第三方库（非 npm，微信小程序专用）

| 资源名 | 来源 | 用途 |
|--------|------|------|
| mobx-miniprogram | npm install | 状态管理 |
| mobx-miniprogram-bindings | npm install | Store 与页面绑定 |
| miniprogram-api-typings | npm install | TypeScript 类型声明 |
| wx-canvas-dpr-shim | 自定义/可选 | 解决高分屏 Canvas 渲染模糊 |

### 九、微信云开发资源

| 资源名 | 用途 |
|--------|------|
| CloudBase 环境 (mindflip-dev) | 云函数、数据库、云存储 |
| `users` 集合 | 用户信息存储 |
| `decision_logs` 集合 | 决策记录存储 |
| `personality_tags` 集合 | 人格标签快照 |
| `subscribe_config` 集合 | 订阅消息配置 |
| `tools_meta` 集合（推荐创建） | 工具元数据配置 |
| 订阅消息模板 ID | 微信后台申请，每天 9:00 推送模板 |
| 云存储 Bucket | 海报、用户头像存储 |

### 十、动画音效资源（可选，提升体验）

| 文件名 | 触发场景 | 规格 |
|--------|---------|------|
| `coin_flip.mp3` | 硬币离手音效 | MP3，≤ 50KB，时长 ≤ 0.5s |
| `coin_land.mp3` | 硬币落地音效 | MP3，≤ 50KB，时长 ≤ 0.3s |
| `dice_roll.mp3` | 骰子滚动音效 | MP3，≤ 50KB，时长 ≤ 1s |
| `dice_impact.mp3` | 骰子撞击音效 | MP3，≤ 30KB，时长 ≤ 0.2s |
| `roulette_spin.mp3` | 转盘旋转音效 | MP3，≤ 100KB，时长 ≤ 3s |
| `roulette_tick.mp3` | 转盘格子跳动音效 | MP3，≤ 20KB，时长 ≤ 0.1s |
| `roulette_stop.mp3` | 转盘停靠音效 | MP3，≤ 30KB，时长 ≤ 0.3s |
| `success_chime.mp3` | 操作成功提示音 | MP3，≤ 20KB，时长 ≤ 0.5s |

> **注意**: 音效为可选资源，Phase 1 可通过 `triggerHaptic()` 触觉反馈替代音效，无需音频文件。

---

## 资源获取建议

1. **图标**: 使用 Figma / Sketch 设计，统一 48×48dp 基准，以 SVG 导出为主，必要时提供 PNG @2x/@3x
2. **Canvas 动画纹理**: 硬币正反面建议手绘或使用专业工具制作，确保 3D 透视感；骰子六面保持一致的视觉风格
3. **插画**: 使用 Midjourney / DALL-E 生成概念图，再由设计师精修
4. **音效**: 使用 freesound.org 免版权音效，格式转换为 MP3
5. **字体**: 如需杂志风字体，推荐使用思源宋体（Noto Serif SC）或站酷高端黑

---

*文档版本: 1.0.0 | 最后更新: 2026-06-27*
