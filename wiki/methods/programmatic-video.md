---
title: "Programmatic Video"
aliases:
  - "程序化视频"
  - "用代码生成视频"
  - "Remotion / HyperFrames 工作流"
created: "2026-10-14"
updated: "2026-10-14"
tags:
  - wiki
  - method
  - programmatic-video
  - remotion
  - hyperframes
  - codex
method_type: "workflow"
related_concepts:
  - "[[frame-driven-rendering]]"
  - "[[clock-driven-rendering]]"
  - "[[compute-locus-spectrum]]"
  - "[[feedback-loop]]"
related_methods: []
---

# Programmatic Video（程序化视频）

## 摘要

程序化视频是**用代码描述画面、由渲染引擎逐帧导出视频**的生产方式，适合模板化、数据驱动和批量生产：同一套版式替换文案与素材即可产出成百上千条视频。coding agent 普及后它多了一个用途——agent 根据自然语言需求直接编写视频工程。当前两条主流开源路线是 **Remotion**（React 组件描述画面，生态成熟）与 **HyperFrames**（HeyGen 开源，纯 HTML/CSS/JS + 数据属性，"Built for agents"）。两者渲染原理相近（无头浏览器逐帧截图 + FFmpeg 编码），差异在编写方式、动画库接入方式与嵌入式播放能力。

本页把工具选型与一条可复现的 agent 工作流放在一起：选型 → 起项目 → 用帧和顺序写分镜 → 按五层功能实现 → 内置浏览器预览闭环 → 选渲染位置导出 → 后处理嵌入。整条工作流的理论前提是 [[frame-driven-rendering]]：导出时画面只能由帧号决定，这也解释了各框架的 API 设计、动画库接入方式，以及交互状态为何不能直接导出。

## 适用条件

- **前置依赖**：Node.js；Remotion 需要 React 基础（JSX、组件、props），HyperFrames 有网页开发基础即可；agent 侧安装对应 Plugin 或 Agent Skills
- **适用场景**：模板化 / 参数化 / 批量视频；数据可视化动画；需要进 Git 做版本管理与评审的视频工程；由 agent 生成并迭代的视频
- **不适用场景**：交互是主体、无需导出视频（直接用 GSAP、Framer Motion 等网页动画方案）；高画质离线三维动画（交给 Blender 等 DCC）；4 人以上组织未取得 Remotion Company License 的商用场景

## 步骤

### Step 1: 选框架

- **输入**：团队技术栈、是否以 agent 生成为主、是否需要嵌入网页播放与实时交互
- **操作**：按下方决策点选 Remotion 或 HyperFrames；先把"交互式视频"拆成参数化与实时交互两类再判断
- **输出**：框架选择
- **判断标准**：能说清需求属于参数化还是实时交互，以及宿主页面是否为 React

### Step 2: 起项目与装 agent 能力

- **输入**：框架选择
- **操作**：Remotion 用 `npx create-video@latest`（或 `bun create video`）建项目、`npx skills add remotion-dev/skills` 装 skills；Codex 中直接装 Remotion Plugin（已含 skills），输入 `$remotion` 描述需求即可代建。HyperFrames 用 `npx skills add heygen-com/hyperframes` + `hyperframes` CLI。**所有 `@remotion/*` 包统一固定到同一稳定版本并保留 lockfile**
- **输出**：可启动的项目
- **判断标准**：`npm run dev` 能打开 Studio，示例 composition 可播放

### Step 3: 用帧和顺序写分镜

- **输入**：自然语言需求
- **操作**：写成"时间区间 → 镜头与内容 → 用什么控制"的分镜表；给 agent 的提示写时长、先后顺序与节奏（"标题 0.5 秒内弹入，1 秒后副标题淡入"），并显式要求"所有动画由帧号决定"
- **输出**：分镜表与提示
- **判断标准**：每段都有起止时间与可计算的控制量，没有"更有动感"这类不可执行描述

### Step 4: 按五层功能实现

- **输入**：分镜表
- **操作**：① 视频定义 `<Composition>`（宽高、fps、`durationInFrames`）；② 时间 `useCurrentFrame()` / `useVideoConfig()`；③ 动画计算 `interpolate()` / `spring()` / `Easing`；④ 场景编排 `<Sequence>` / `<Series>` / `<TransitionSeries>`；⑤ 绘制 CSS / SVG / Canvas，主体是 3D 或大规模粒子时才上 WebGL / WebGPU。外部动画库走官方集成包（`@remotion/gsap` / `lottie` / `three`）或 adapter，不用 CSS transition
- **输出**：可预览的 composition
- **判断标准**：任意拖动时间轴到某一帧，画面与分镜一致（不依赖从头播放）

### Step 5: 内置浏览器预览闭环

- **输入**：可预览的 composition
- **操作**：在 Codex Desktop 内置浏览器打开本地 Studio（`npm run dev -- --no-open` 避免唤起系统浏览器），让 agent 检查节奏、布局、转场，发现问题就改代码再看；先做出能预览的版本，再用具体画面判断问题
- **输出**：通过视觉检查的版本
- **判断标准**：用具体帧描述的问题已逐条修完；关键段落已抽帧确认

### Step 6: 选渲染位置并导出

- **输入**：定稿 composition
- **操作**：单次导出用 Studio；批量与自动化用 CLI `npx remotion render`（指定 Composition ID 与输出路径）、`@remotion/renderer` 或 Lambda；需要让用户在网页内直接生成视频时才走客户端渲染（`@remotion/web-renderer`，WebCodecs）。用到 Three.js 时 GL 选项设为 `angle`。先导出末段几秒验证难点（3D、地图），再导出全片
- **输出**：视频文件
- **判断标准**：用 ffprobe 核对编码、分辨率、fps、帧数与时长，全片解码无错误

### Step 7: 后处理与嵌入

- **输入**：MP4
- **操作**：文章内直接展示用 animated WebP（`-loop 0` 无限循环），附 MP4 清晰版链接；允许 HTML 的平台可用 `<video autoplay muted loop playsinline>`
- **输出**：可嵌入的动图与视频
- **判断标准**：目标平台（GitHub / Obsidian）实际能自动播放

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 团队熟悉 React，需要成熟生态与有文档保障的实时交互嵌入 | Remotion | `inputProps` 实时传入是正式支持的用法 |
| 以 agent 生成为主，希望复用 HTML / GSAP / CSS 常规写法 | HyperFrames | LLM 生成 HTML 比生成框架组件稳定，adapter 接管时间轴、无需学帧号模型 |
| 宿主不是 React 应用，只需嵌入播放由页面控制 | HyperFrames | `<hyperframes-player>` Web Component 不绑定框架 |
| 用户输入后生成定制视频（参数化） | 两者均可 | 视频本身不可交互，按编写与部署偏好选 |
| 交互是主体、无需导出 | 网页动画方案 | 视频框架的帧号约束对纯交互是负担 |
| 批量、自动化、对外视频服务 | 服务端渲染（CLI / Node API / Lambda） | 功能完整、可并行拆帧段 |
| 网页内让用户直接生成、无服务器 | 客户端渲染（WebCodecs） | 无需服务器，但仅支持部分 HTML 元素 |
| 动图体积 | animated WebP 优先于 GIF | 地图类细节多的画面，GIF 约 35MB、WebP 约 6MB 且画质更好 |

## Claims

### Claim: Remotion 与 HyperFrames 的差异在编写方式、动画库接入与嵌入播放器，不在渲染原理——前者让开发者写帧号，后者让 adapter 收编常规写法

- **来源**：[[Remotion系列01：Agent-Skills与帧号驱动渲染]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.75
- **状态**：active

> 两者产物都是视频文件，渲染都是无头浏览器逐帧截图 + FFmpeg（Remotion 用无头 Chromium，HyperFrames 用基于 Puppeteer 的可 seek 页面捕获引擎），分布式渲染各有 Lambda 方案。Remotion 是"视频是帧号的函数"的 React 组件，自带帧号动画 API；HyperFrames 的 composition 是带数据属性的 HTML 文件，无需构建即可在浏览器预览，不规定动画写法。两套 skills 都遵循 Agent Skills 开放标准，可同时安装给 Claude Code、Codex、Cursor 等 agent。证据：两者官方文档与仓库说明（2026-10-13），未做同任务对照实测。

### Claim: "交互式视频"要先拆成参数化与实时交互两类——视频文件本身不能响应输入，实时交互本质是"以视频形态呈现的网页"，靠嵌入式播放器实现

- **来源**：[[Remotion系列01：Agent-Skills与帧号驱动渲染]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.75
- **状态**：active

> 参数化视频：用户先提交输入，系统据此生成定制视频，视频不可交互（Remotion `inputProps` + 服务端批量渲染，HyperFrames 数据驱动生成 HTML，能力相当）。实时交互：画面随操作即时变化，必须在浏览器实时运行。播放器对比——Remotion Player 是 React 组件，composition 直接渲染在宿主页面，`inputProps` 实时传入有文档保障；HyperFrames Player 是 Web Component，composition 在 Shadow DOM 内的沙箱 iframe 中运行，宿主不限框架，有 `play/pause/seek`、区间播放与 `disable-click-to-play`，但传入用户输入的 `setRuntimeData()` 文档只列名称、无参数与示例，跨域只能用播放器 API。结论：由宿主控制播放两者都行（HyperFrames 更轻）；用户输入实时改画面 Remotion 更确定；交互状态都无法直接导出，需记录为参数再做一次参数化渲染。

### Claim: PPT 是在时间轴上配置动画，程序化视频是用代码定义画面随帧号变化的规律——由此得到数据驱动、参数化复用、AI 可生成、可版本管理四项优势

- **来源**：[[Remotion系列02：快速上手]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.7
- **状态**：active

> 概念可直接映射：飞入/浮入 → `translateX/Y`，放大 → `scale`，淡入 → `opacity`，持续/开始时间 → 帧区间（`durationInFrames`、`from`），平滑开始结束 → `Easing`，弹跳 → `spring()`，动画顺序 → `<Sequence>`，幻灯片切换 → `<TransitionSeries>`。区别在本质：100 根柱子的图表一个循环即可依次错开入场；同一模板换文案数据配色批量产出；动画就是代码，agent 可直接生成、修改、复查；工程进 Git 改动可追溯可评审。易混点：CSS `transition` 按真实时间过渡不应使用，场景转场由 `@remotion/transitions` 实现。

### Claim: 渲染要分三个维度看——图形技术、渲染位置、输出方式；WebGL/WebGPU 不等于客户端渲染，在浏览器界面里点渲染也不等于客户端渲染

- **来源**：[[Remotion系列02：快速上手]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.8
- **状态**：active

> 图形技术回答"画面怎么画"（DOM/CSS、SVG、Canvas 2D、WebGL、WebGPU）；渲染位置回答"在哪里算出每一帧"（用户浏览器 vs 本机/服务器/云函数）；输出方式回答"如何编码"（Studio、CLI、Node API、Lambda）。服务端渲染时 Chromium 同样能用 WebGL 绘制，只是硬件加速取决于运行环境。服务端用 FFmpeg 编码、功能完整；客户端用 WebCodecs、无需服务器但仅支持部分 HTML 元素。系列03 实证：在内置浏览器的 Studio 里点 **Render on the server**，实际渲染位置是本机 Node.js + 无头 Chromium，属于服务端路径——不能因为"在浏览器里点击"就称为客户端渲染。普通文字、图片、图表、转场用 React + CSS 即可，只有 3D 场景或大规模粒子才值得引入 WebGL/WebGPU。

### Claim: 写动画前先判断变化来自物体运动、相机运动还是场景切换——空间关系错了，动画再流畅也破坏叙事

- **来源**：[[Remotion系列03：从洛杉矶飞到上海]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.6
- **状态**：active

> 地图旅行案例最初让地图淡出、再让独立的东方明珠模型逐段"长出来"，看起来有动画却破坏了地理叙事——塔本来就一直在那里。最终把模型固定在地图坐标上，把"物体入场"改成"镜头靠近"：模型尺寸不随帧号变化，每帧只更新地图相机，塔自然从远处的小物体变成可辨认的建筑。同理，主片没有用 `<Sequence>` 换场，而是在同一地图场景里移动相机保持空间连续——五层功能不是每层都要用满，按叙事需要取舍。单案例经验，置信度按单次实操计。

### Claim: Remotion 不是 MIT 许可——个人与 3 人以内公司免费商用，4 人以上组织需 Company License

- **来源**：[[Remotion系列02：快速上手]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.8
- **状态**：active

> Company License 分按席位计费的 Remotion for Creators（本地编码与 prompt 制作视频）与按渲染次数计费的 Remotion for Automators（视频编辑器、prompt-to-video 等自动化产品），另有 Enterprise License；HyperFrames 为 Apache 2.0。选型时授权是硬约束而非偏好项。价格与条款以官方授权页为准。

## 实践记录

### Practice: 2026-10-13 — 洛杉矶→纽约→上海地图旅行视频（Codex + Remotion）

- **应用场景**：36 秒 1920×1080 / 30fps 主片：洛杉矶拉远 → LA→NY 航线延伸、镜头跟随线头 → NY→上海沿大圆路线 → 鸟瞰逐步靠近陆家嘴看到完整东方明珠。技术组合：MapLibre GL JS 绘地图与路线 + OpenFreeMap 暗色矢量瓦片 + Turf 大圆路线与按距离截取 + Blender Python 脚本建风格化地标导出 GLB + MapLibre custom 3D layer 与 Three.js 共享 WebGL context；独立模型预览用 `@remotion/three`
- **实际结果**：成功。导出 H.264、1080 帧、全片解码无错；文章用 animated WebP（900px、12fps、432 帧、无限循环，约 6MB）
- **偏差与调整**：① 初始化装到的预发布版缺所用 API → 各 `@remotion/*` 统一固定到同一稳定版本；② MapLibre worker 加载失败 → 从已安装包提供配套 worker 与共享模块，不能只复制一个 worker 文件；③ 某底图服务要求 API key → 换无需 key 的 OpenFreeMap（MapLibre 本身不要 key，要不要取决于底图服务；无需 key ≠ 离线，渲染时仍需联网）；④ 上海画面找不到塔 → 跨日期变更线后终点经度表示为另一个世界副本，路线、相机经度与模型必须在同一副本；⑤ 地图到塔的转场不自然 → 取消换场与"生长"，塔固定在地图上；⑥ Studio 跳帧后短暂缺瓦片 → 导出用 `delayRender` 与地图 idle 同步（它不暂停预览）；⑦ GIF 约 35MB → 改 animated WebP
- **经验教训**：先用末段 2 秒验证最难的 3D + 地图，再导出全片；Blender 负责可编辑资产、浏览器负责主片渲染——3D 画面实时光栅化而非离线渲染；不要求一次提示完成一切，先出能预览的版本再按画面修正
- **置信度影响**：Step 5 预览闭环、Step 6 先验难段再出全片获首次实证；"空间关系先于动画手段" Claim 以此为唯一来源（0.6）

## 关联概念

- [[frame-driven-rendering]] — `uses` 整条工作流以帧号为唯一时间源：分镜按帧区间写、动画按帧号算、导出可并行且确定
- [[compute-locus-spectrum]] — `uses` 用计算位置判据决定渲染位置（服务端 vs 客户端）与图形技术（CSS 足够 vs 上 WebGL/WebGPU），并区分 Blender 离线资产与浏览器实时光栅化
- [[feedback-loop]] — `implements` "agent 写代码 → 内置浏览器播放 → 按画面发现问题 → 改代码"是反馈闭环在视频生产域的实例

## 关联方法

## 来源

- [[2026-10-13-周二]] — Remotion 系列01~03 成文（hyperframe 对比 Remotion 任务）
- [[Remotion系列01：Agent-Skills与帧号驱动渲染]] — 两条路线对比、交互式视频两类需求与播放器对比、动画库接入表、选型小结
- [[Remotion系列02：快速上手]] — Codex 三步上手与内置浏览器闭环、PPT 对照、五层功能、渲染三维度、授权
- [[Remotion系列03：从洛杉矶飞到上海]] — 分镜表、技术组合、Blender 配合、问题与处理、导出与嵌入
