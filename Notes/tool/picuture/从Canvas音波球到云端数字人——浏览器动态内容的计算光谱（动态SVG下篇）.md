---
title: 从Canvas音波球到云端数字人——浏览器动态内容的计算光谱（动态SVG下篇）
created: 2026-08-26
tags:
  - tool
  - Canvas
  - WebGL
  - digital-human
  - visualization
---

# 从 Canvas 音波球到云端数字人——浏览器动态内容的计算光谱（动态 SVG 下篇）

上篇 [[动态SVG全景——原理、元素分类、生态限制与Lottie等替代方案对比]] 讲清了 SVG 动画的能力与边界：动画预先写死在文档里，浏览器照"谱"演奏。但打开一个真实的语音 Agent 产品页面（Microsoft Foundry 的 Voice Live Playground），用 Inspector 逐层审查，会发现两个明显超出 SVG 边界的动态元素：跟随语音起伏的音波球，和会说话的数字人。这两个案例恰好把"浏览器里的动态内容"补成一条完整光谱——**画面的计算发生在哪里，由内容复杂度与实时性来源决定**。

## 一、音波球：一个空标签里的秘密

在 Foundry 页面上审查那个紫色音波球，DOM 里对应的元素是：

```html
<canvas class="_orbCanvas_1lwno_20" height="400" width="400"></canvas>
```

一个**空的** `<canvas>` 标签——没有任何子元素，但悬停预览里却是一个画好的、中间有波浪线的紫色球体。这就是 Canvas 与 SVG 最根本的区别：SVG 的每个圆、每条线都是 Inspector 里可展开的 DOM 节点；Canvas 的图形**不在文档里**，而在一块由 JavaScript 反复涂改的位图内存里。

### Canvas 本质：一个占位符

`<canvas>` 在 HTML 文档中的全部职责只有三件事：

1. **占一块位置**——参与文档布局，CSS 决定摆放与显示尺寸；
2. **申请一块像素内存**——`width`/`height` 属性声明缓冲区分辨率；
3. **交出控制权**——`getContext('2d')` 或 `getContext('webgl')` 把"画笔"交给 JS，从此文档系统不再过问内容。

规范甚至把 `<canvas>` 开闭标签之间的内容定义为 fallback（不支持时的后备文案）——标签自身不承载任何实际内容。浏览器的视角是："这块矩形区域的内容归 JS 管，我只负责每帧把它的缓冲区贴到屏幕上。"

细节佐证（都能在 Inspector 里观察到）：

- HTML 写 `width="400" height="400"`，CSS 却是 `width: 200px; height: 200px`——前者是**像素缓冲区分辨率**，后者是显示尺寸，2 倍关系为了 Retina 屏不糊。这说明 Canvas 本质是位图，要靠超采样对抗高分屏，而 SVG 矢量天然不需要；
- 外层 wrapper 标了 `aria-hidden="true"`——Canvas 对屏幕阅读器是黑盒（不像 SVG 的 `<text>` 可被读出），纯装饰性可视化直接对无障碍树隐藏；
- 预览里的透明棋盘格说明 JS 只画了球体，缓冲区其余部分保持透明。

### 完全由 JS 驱动：四环节链条

Canvas 没有任何声明式绘图/动画能力——没有 JS，它永远是一块空白板。音波球的驱动链条由 JS 承担全部四个环节：

```
① 数据源              ② 计算               ③ 绘制                ④ 帧循环
Web Audio API    →    把振幅映射成       →   ctx.clearRect()    →  requestAnimationFrame
AnalyserNode          波浪线的控制点         ctx.arc/fill 等         (~60 次/秒回调)
(实时音频振幅)         (几何计算)            (涂像素)               (驱动下一帧)
```

核心是 `requestAnimationFrame`：浏览器每次屏幕刷新前调用 JS 回调，回调里"擦掉整帧 → 重算 → 重画"。**没有任何东西在"自己动"，是 JS 在每秒画 60 张静态图**——与电影放映机同理。

### 为什么音波球不用 SVG

1. **数据是实时的**。音波球要跟随麦克风/TTS 的音频振幅实时变形，数据来自 Web Audio API 每帧给出的频谱数组。SMIL/CSS 只能播放预先写死的关键帧，无法响应实时数据流；
2. **渲染模式不同**。SVG 是保留模式（retained mode）——每个图形是 DOM 节点，浏览器帮你管理；Canvas 是立即模式（immediate mode）——就是一块像素缓冲区。对"整个画面每帧都变"的场景（音频可视化、粒子、游戏），立即模式没有 DOM diff 开销，效率高得多;
3. **性能上限**。更炫的版本（如 ChatGPT 语音模式的流体球）再上一层 WebGL shader——同样跑在 `<canvas>` 标签上，把"涂像素"下放给 GPU。

即使都用 JS，两者分工也不同：JS 驱动 SVG 改的是"描述"（把 `cx` 从 100 改成 105），实际画像素的还是浏览器；JS 驱动 Canvas 时，**你自己就是渲染器**。极致控制力与性能的代价是一切自理：没有事件命中检测、没有无障碍语义、没有可保存的图形文档。

### 文件身份：能保存成"网页"，不能保存成"图"

Canvas 作品可以保存为单个 HTML 文件（`<canvas>` + JS）到处分发，浏览器打开动画照常运行——因为浏览器本身就是 JS 运行时。但它与 `.svg` 的"单文件"有本质区别：

| | `.svg` 文件 | `.html`（canvas + JS） |
|---|---|---|
| 文件身份 | **图片**（`image/svg+xml`） | **网页 / 程序**（`text/html`） |
| 浏览器直接打开 | ✅ 动画正常 | ✅ 动画正常（JS 运行） |
| 被当图片引用（`<img>`、Markdown `![]()`） | ✅（JS 被禁但 SMIL/CSS 动画保留） | ❌ HTML 不是图片格式，无处接受 |
| Obsidian / GitHub 嵌入 | ✅ | ❌（GitHub 对仓库内 HTML 只显示源码） |

SVG 的独特之处正是**双重身份兼得**：既是可直接打开的文档，又是能嵌进任何地方、嵌入后动画还活着的图片。Canvas 内容要离开"运行着 JS 的浏览器"去分发，只有两条出路，且都降级为位图：`canvas.toDataURL('image/png')` 导静态帧（动画丢失），或 `canvas.captureStream()` + `MediaRecorder` 录成视频。

## 二、数字人：连本地渲染都放弃了

同一个页面里的数字人（Azure TTS Avatar 的预置形象 Lisa），Inspector 里看到的是：

```html
<img class="_avatarImage_tyiiz_187" alt="Lisa-casual-sitting"
     src="https://ai.azure.com/speechassetscache/avatar/lisa/lisa-casual-sitting-transparent-bg.png">
```

一张 1920×1080 的透明背景 PNG。**它自己永远不会动**——这只是会话开始前的静态占位照片。真正说话时前端会"偷梁换柱"：

```
会话前：<img src="lisa-casual-sitting-….png">   ← 静态占位
会话中：<video> + WebRTC 实时流                  ← 真正在动的东西
```

### 驱动链条：嘴唇和手臂是在云端被"渲染"出来的

```
① LLM 生成回复文本
② TTS 合成语音，同时产出 viseme 时间轴（音素 → 口型的映射序列）
③ 云端神经视频合成：以 Lisa 的形象模型为底，按 viseme 逐帧生成
   嘴唇/下颌/面部肌肉画面，叠加预制的身体姿态与手势片段
④ 编码成实时视频流，经 WebRTC 推到浏览器
⑤ 浏览器 <video> 播放——对前端来说就是一路"视频通话"
```

关键认知：**嘴型和手势不是在浏览器里被驱动的，浏览器只是收看一路云端实时渲染的视频**。所有生成计算发生在服务端的神经网络里（模型从真人录制素材训练而来，可按任意语音合成对应口型）。照片级人脸的逐帧生成，本地根本算不动，于是干脆把渲染整体搬上云，浏览器退化成"显示器"。

### 数字人的三条技术路线

| 路线 | 原理 | 嘴型/动作驱动方式 | 代表 |
|---|---|---|---|
| **云端视频合成** | 服务端神经网络逐帧生成视频，WebRTC 推流 | 服务端：viseme 时间轴 → 生成式模型渲染口型；手势按语义从预制动作库插入 | Azure TTS Avatar、HeyGen、D-ID |
| **客户端 3D 模型** | 浏览器 WebGL/three.js 加载 3D 人物 | 客户端 JS：viseme 事件实时驱动 blendshape（脸部形变权重）与骨骼动画 | Ready Player Me + three.js、Unity WebGL |
| **客户端 2D 骨骼**（"纸片人"） | 一张立绘拆成分层部件（嘴/眼/手臂），网格变形 | 客户端：音频振幅/viseme 驱动部件旋转与形变 | Live2D（VTuber 主流方案） |

注意第二、三条路线的渲染载体又回到了 `<canvas>`（WebGL）：浏览器里的 3D 数字人就是"JS 每帧驱动 GPU 重绘画布"，与音波球同一原理，只是画的内容从波浪线换成了带骨骼的人物模型。

## 三、完整光谱：计算发生在哪里

同一个产品页面里挖出的三种动态元素，加上上篇的内容，构成浏览器动态内容的完整谱系：

| 层级 | 案例 | 内容存在哪 | 谁在计算 | 实时性来源 |
|---|---|---|---|---|
| **文档自带动画** | 流程图/时间线（动态 SVG） | 文件里（几何描述 + 动画声明） | 浏览器渲染引擎 | 无——动画预排练 |
| **本地 JS 改文档** | D3/ECharts 图表（SVG + JS） | DOM 里，JS 按数据更新 | JS 改描述，浏览器画 | 离散数据更新 |
| **本地 JS 涂像素** | 音波球、粒子、游戏（Canvas 2D/WebGL） | 像素缓冲区，每帧重画 | JS/GPU 自己当渲染器 | 本地实时数据流（音频振幅、手势） |
| **云端渲染推流** | 数字人（WebRTC + `<video>`) | 根本不在本地——是一路视频 | 云端 GPU 集群（神经网络） | 云端生成，本地只解码 |

规律是同一条：**内容复杂度 × 实时性来源，决定画面的计算发生在哪里**——文档内（SVG）→ 本地 JS/GPU（Canvas）→ 云端 GPU 集群（视频流）。复杂度每上一个台阶，内容就离"文件"更远一步：SVG 是乐谱（内容即文档，谁拿到都能演奏）；Canvas 是舞台（文档只搭台，演出全靠 JS 当场表演，散场不留痕）；数字人连舞台都不要了，直接给你转播一场云端的演出。

回到知识库场景的选型口诀，现在可以补完整：

- 动画能提前写死 → **SVG（SMIL/CSS）**，单文件、可嵌入、可 git diff、LLM 可生成；
- 图形由数据生成、更新离散 → **SVG + JS**（图表库），只活在网页里；
- 每帧全画面重绘、本地实时数据驱动 → **Canvas / WebGL**，保存分发即降级为位图；
- 照片级、生成式内容 → **云端渲染 + 视频流**，浏览器只是显示器。

**关联阅读**：
- 上篇：[[动态SVG全景——原理、元素分类、生态限制与Lottie等替代方案对比]]
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN Web Audio API：Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)（音波可视化官方教程）
- [Azure AI Speech：Text to speech avatar](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/what-is-text-to-speech-avatar)（云端数字人架构）
