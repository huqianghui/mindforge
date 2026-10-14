---
title: "Frame-Driven Rendering"
created: "2026-10-14"
updated: "2026-10-14"
tags:
  - wiki
  - concept
  - rendering
  - animation
  - programmatic-video
aliases:
  - "帧号驱动渲染"
  - "帧号驱动动画"
  - "frame-based rendering"
related:
  - "[[clock-driven-rendering]]"
  - "[[compute-locus-spectrum]]"
---

# Frame-Driven Rendering（帧号驱动渲染）

## 摘要

帧号驱动渲染是以**帧号**为时间源计算每一帧画面的方式：动画进度 =（帧号 ÷ fps）÷ 动画时长。它不读系统时钟，引擎请求第 N 帧时，画面直接定位到视频时间 N/fps 应有的状态——这一帧截图花 0.2 秒还是 2 秒都不影响结果。整段视频因此可以理解为一个**从帧号到画面的纯函数**，类似定格动画：两次拍摄之间可以从容调整，但每一格的位移严格按分镜。

它是**离线渲染**（视频导出、电影特效、Blender 渲染）的时间源，与面向实时场景的 [[clock-driven-rendering]] 相对。Remotion 让开发者直接以帧号编写动画（`useCurrentFrame()` + `interpolate()` / `spring()`），HyperFrames 则先暂停各动画库的时钟、再由 adapter 按帧 seek。由"任意帧可独立计算"推出两项工程性质：可拆帧段**并行渲染**，以及**确定性**（同一输入同一输出，可用于 CI 与回归测试）。代价是约束外溢：实时交互状态、按真实时间播放的 API、异步加载的资源都必须先改造成"给定帧号能算出状态"。

## Claims

### Claim: 实时渲染与离线渲染对"正确"的定义不同，决定了各自的时间源——实时要时长正确用时钟，离线要每帧正确用帧号

- **来源**：[[Remotion系列01：Agent-Skills与帧号驱动渲染]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.8
- **状态**：active

> 视频播放始终以帧和 fps 为单位，分歧只在**生成**阶段每一帧依据什么时间来计算。实时渲染（网页、App、游戏）要求动画在真实时间中的时长正确，适用系统时钟；离线渲染（电影特效、Blender、视频导出）要求每一帧画面正确、计算耗时不限，适用帧号。帧号驱动的公式是：进度 =（帧号 ÷ fps）÷ 动画时长。Remotion 中组件通过 `useCurrentFrame()` 取帧号，再用 `interpolate()`（数值映射）或 `spring()`（按帧号算出的弹簧物理，可超调）计算这一帧的属性值，因此"视频 = 帧号 → 画面的函数"。

### Claim: 任意帧可独立计算推出两项工程性质——帧段并行渲染与确定性输出

- **来源**：[[Remotion系列01：Agent-Skills与帧号驱动渲染]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.8
- **状态**：active

> 每一帧只依赖帧号（和输入参数），不依赖前一帧何时生成，所以可以把不同帧段分配给多台机器并行渲染——Remotion Lambda 与 `@hyperframes/aws-lambda` 都基于这一性质；时钟驱动的动画必须从头顺序播放，无法拆分。同一性质也给出确定性（HyperFrames 文档："same input, same frames, same output"），使渲染结果可以进入 CI 与回归测试。

### Claim: 时钟驱动的库可以被收编为帧号驱动——前提是库内部本就是"给定时间点算画面"，两条收编范式是原生帧号 API 与暂停时钟后按帧 seek

- **来源**：[[Remotion系列01：Agent-Skills与帧号驱动渲染]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.75
- **状态**：active

> GSAP、Lottie、Three.js 内部都是"根据给定时间点计算画面"，该时间点既可取自系统时钟，也可由外部指定，这是收编可行的原因。**Remotion 范式**：自有帧号 API + 主流库官方集成包——`@remotion/gsap` 内部创建暂停的时间轴按当前帧 seek，`@remotion/lottie` 按帧号控制，`@remotion/three` 基于 R3F 的 `<ThreeCanvas />` 让 `useCurrentFrame()` 在三维画布内可用（动画应以帧号计算而非写在 `useFrame()`）；其余库需自写"帧号 → seek"衔接。**HyperFrames 范式**：不规定动画写法，adapter 层统一接管各库时间轴——GSAP 时间轴以 `paused: true` 创建并注册到 `window.__timelines`，Lottie 实例注册到 `window.__hfLottie`，GPU adapter 监听 `hf-seek` 事件按 seek 时间重绘，自定义运行时实现 `FrameAdapter`（`getDurationFrames()` / `seekFrame()`）。后者与"面向 agent"的定位一致：LLM 本就熟悉 GSAP 与 CSS 常规写法，无需掌握帧号编程模型。证据边界：依据官方文档与运行时类型定义，adapter 对各库的支持完整度未实测。

### Claim: 帧号驱动的约束会外溢到交互、真实时间 API 与异步资源三处——交互状态不能直接导出，按真实时间播放的 API 要改成逐帧算状态，异步资源要显式阻塞导出截图

- **来源**：[[Remotion系列03：从洛杉矶飞到上海]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.75
- **状态**：active

> ① **交互**：实时交互产生的状态无法直接导出为固定视频，常见做法是交互版只在网页播放，需要导出时把用户操作记录为参数、再做一次参数化渲染（系列01）。② **真实时间 API**：不能让地图自己按真实时钟播放 `flyTo()`，每帧先由帧号算出路线进度、相机中心与 zoom，再把截取的路线与相机状态交给地图绘制；CSS `transition` 同理不应使用（系列02/03）。③ **异步资源**：地图瓦片、3D 模型加载未就绪时截图会缺内容，导出时用 `delayRender` 与地图 idle 同步；但 `delayRender` 只约束导出截图，**不会暂停 Studio 预览播放**，预览跳帧后短暂缺瓦片属正常（系列03 实操）。三处的共同点：凡是"状态由真实时间或外部事件推进"的环节，都要先改造成"给定帧号能算出状态"。

## 冲突与演进

- 2026-10-14：建页。Remotion 系列01~03（2026-10-13 成文）提供素材：系列01 深入定义（公式、实时/离线对照表、并行与确定性推论、两框架的收编方式），系列02 以五层功能把帧号 API 落到上手路径，系列03 在真实地图 + 3D 地标案例中实证约束外溢。按用户裁决与 [[clock-driven-rendering]] 分为两个原子概念，工具与工作流另立方法页 [[programmatic-video]]。

## 关联概念

- [[clock-driven-rendering]] — `contrasts` 同一个"给定时间点算画面"的库，时间点由外部帧号指定还是取自系统时钟；离线要每帧正确、实时要时长正确
- [[compute-locus-spectrum]] — `extends` 为计算位置光谱补上"时间源"这一维：同在本地 GPU 涂像素，实时播放用时钟、离线导出用帧号

## 来源日记

- [[2026-10-13-周二]] — Remotion 系列01~03 成文（hyperframe 对比 Remotion 任务）
- [[Remotion系列01：Agent-Skills与帧号驱动渲染]] — 帧号驱动定义、实时 vs 离线对照、并行与确定性、两框架动画库收编方式
- [[Remotion系列02：快速上手]] — 五层功能中的时间层与动画计算层（`useCurrentFrame` / `interpolate` / `spring`）
- [[Remotion系列03：从洛杉矶飞到上海]] — 地图相机逐帧计算、`delayRender` 只约束导出不暂停预览
