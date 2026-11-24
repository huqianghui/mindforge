---
title: Media Generation 系列 03：视频模型的测试方案
created: 2026-11-24
description: 给 Foundry 上五个视频 endpoint 设计的一套小型测试。先发最小请求确认路由，再用同一条雨夜人物 Prompt 拉齐基线并验证 Fast→Pro、Turbo→Max 的草稿到成片迁移，然后分项测原生语音、长镜头与 4K、音轨驱动、多主体参考和动作迁移；每次生成按同一组字段记录，计时把推理、提交到完成、端到端分开，按每条可用视频的成本比较。实测结果待补。
tags:
  - media-generation
  - video-generation
  - evaluation
  - prompt
  - microsoft-foundry
  - fal
---

# Media Generation 系列 03：视频模型的测试方案

> 系列导航：[系列 01：Foundry 上的视频模型为什么经过 fal](Media-Generation系列01：Foundry上的视频模型为什么经过fal.md) ｜ [系列 02：五个视频 endpoint 对比](Media-Generation系列02：五个视频endpoint对比.md) ｜ 本篇

上一篇按文档列了一组场景假设：H3 Max Turbo 适合低成本批量出片、LTX Fast 适合长镜头和 4K、H3 Max 适合参考驱动、Kling 适合人物表演。这些都只是定位，要自己跑一遍样片才知道哪条成立。

这一篇是测试方案本身：测什么、怎么测、记什么。设计的原则只有两条——**先用相同输入比基础能力，再用各自独有的接口测上限**；以及**每个结论都只在它的参数条件下成立**。

> [!NOTE]
> 本篇写于测试开始之前，下面的 Prompt、参数和记录字段是方案，"实测记录"一节暂时留空。测试会用脚本批量跑，结果出来后补进本篇。

## 四轮推进

![测试分四轮推进|900](../../asset/media-gen-test-rounds-2026-11-24.svg)

**第 0 轮确认接口。** 四个 deployment 已经是 Succeeded，但还没有逐个发过请求。每个路由先发一次最小请求（480P / 720p、最短时长），记下 HTTP 状态和完整响应体。要确认的有三件事：带 `v1` 和不带 `v1` 的路由哪个可用；Kling 的图生视频路由能不能绕过 Playground 的提示直接调通；结果响应里有没有 `timings` 字段。

**第 1 轮跑 Test 01 和 07**，五个 endpoint 用同一条 Prompt，把基线先拉齐。参数尽量对齐：LTX 6 秒 1080p，H3 6 秒 1080P，Kling 6 秒、分辨率按返回值记。分辨率不齐时，结论里写明可比的范围。同一轮顺带跑 Test 07，复用这条 Prompt 做同族的草稿到成片迁移。

**第 2 轮测音频和镜头**（Test 02、03），**第 3 轮测参考驱动**（Test 04–06）。前面几轮跑完再进下一轮，避免一次把所有组合铺开，2 RPM 的配额也不允许这样做。

## 测试矩阵

![测试矩阵|900](../../asset/media-gen-test-matrix-2026-11-24.svg)

矩阵按 Foundry 当前开放的路由划分。只在 fal 原生平台上有的能力（LTX 的 Audio-to-Video、H3 Max Turbo 的 R2V、Kling 的 `elements`）标成"条件"，要测就单独记平台，不和 Foundry 的结果放在同一张表里比较。

## 测试用例

Prompt 都用英文写。每条都写清楚要看什么，评分时按这几点逐项看。

### Test 01：雨夜人物（共同基线）

```text
A cinematic photorealistic shot of a young woman wearing a long red coat walking slowly through a rainy Tokyo street at night.
Neon signs reflect on the wet pavement. Cars pass in the background, creating subtle motion blur. The woman holds a transparent umbrella and turns her head slightly toward the camera while continuing to walk.
The camera starts with a medium-wide tracking shot, slowly moves closer, and ends with a cinematic close-up of her face.
Natural human walking motion, realistic facial expressions, physically accurate reflections, detailed fabric movement, consistent character appearance throughout the video.
Professional cinematography, shallow depth of field, realistic lighting, 35mm film look.
No scene cuts, no sudden camera movements, no distorted anatomy.
```

看五件事：脚步是否自然；转头时脸有没有变形；红外套从头到尾是否一致；雨伞、雨滴和地面反射是否符合物理；镜头推进是否平滑。

### Test 02：宇航员对白（原生语音）

```text
A cinematic science fiction scene inside a futuristic spaceship.
An astronaut walks through a narrow metallic corridor. Red emergency lights flash intermittently. The camera follows behind the astronaut, then smoothly moves around to reveal the astronaut's helmet and a damaged control panel.
The astronaut stops, looks at the panel, and says in a calm but concerned voice: "We have a problem. The reactor is losing power."
Include synchronized dialogue, realistic voice performance, subtle spaceship engine ambience, warning alarms, and metallic footsteps.
Highly realistic cinematic lighting, detailed reflections on the helmet visor, natural body movement, professional science fiction cinematography.
Maintain consistent character appearance and spatial continuity.
```

看语音是否清晰可懂、口型是否对得上、环境音和场景是否匹配、绕行镜头里人和空间是否连续。这条是单镜头 Prompt，测的是镜头连续性；Kling 的多镜头要另用 `multi_prompt` 参数单独跑一组，不把一次连续镜头当成多镜头能力来评。Kling 的语音只支持中英文，可以再加一组中文对白。

### Test 03：海岛航拍（长镜头与相机运动）

```text
A breathtaking cinematic aerial shot of a tropical island surrounded by crystal-clear turquoise water.
The camera begins high above the ocean, slowly descends toward a dramatic green cliff with a large waterfall. It then performs a smooth forward dolly movement, flying past the waterfall and revealing a hidden lagoon surrounded by dense tropical forest.
The waterfall flows continuously, ocean waves move naturally, palm trees sway gently in the wind, and sunlight creates realistic reflections on the water.
One continuous camera movement, realistic drone cinematography, natural motion, high environmental detail, consistent geography and lighting throughout the entire shot.
```

先在共同档位（10 秒 1080p 左右）五个一起比。LTX Fast 的两个上限分开测：一组 2160p / 10 秒，一组 1080p / 24 fps / 20 秒。看长镜头后半段有没有地形漂移、光照跳变、瀑布水流断续。

### Test 04：鼓点音频（音轨驱动画面）

准备一段 10 秒左右的真实鼓点音频，用 H3 Max R2V 的 `target_audio_url` 传入。

```text
A cinematic performance video of a professional drummer playing an energetic drum solo on a dark concert stage.
The drummer's arm movements, drumstick impacts, cymbal vibrations, and body movements should precisely follow the rhythm and timing of the provided audio.
The camera alternates naturally between a medium shot of the drummer and close-ups of the drumsticks hitting the snare and cymbals.
Dramatic concert lighting, realistic physical interactions, synchronized motion, detailed instrument textures, professional music video cinematography.
```

`target_audio_url` 的定义是把这段音轨钉进输出（重采样为 32 kHz 立体声，长截短补），它不一定会让画面去卡节奏——鼓棒落点和鼓点能不能对上，正是这条要观察的。`duration` 至少 2 秒，且不能同时传参考音频。LTX 的独立 Audio-to-Video 只在 fal 原生平台，作为可选对照。

### Test 05：人 + 狗（多主体身份一致）

准备两张参考图：Image 1 是一位女性，Image 2 是一只金毛。两张都放进 `reference_image_urls`，不要放进 `image_url`。

```text
Create a photorealistic cinematic video featuring the woman from Image 1 and the golden retriever from Image 2.
The woman is walking along a seaside promenade at sunset, holding a leash while the golden retriever walks happily beside her.
Preserve the woman's facial identity, hairstyle, clothing appearance, and the dog's breed, fur color, and physical characteristics from the reference images.
The dog occasionally looks up at the woman and wags its tail. The woman smiles naturally and gently looks down at the dog.
The camera follows them from a side angle, then slowly moves to a front-facing tracking shot.
Natural human and animal movement, consistent character identity, realistic fur physics, warm cinematic sunset lighting.
Do not change the identity or appearance of either subject.
```

看两个主体能否同时出现、脸和狗的毛色体型是否保持、过程中有没有身份漂移。对照组：把女性照片当 `image_url` 走一次普通图生视频，看狗会变成什么样。

### Test 06：动作迁移（参考视频驱动）

准备一段 5–10 秒的真人挥手或简单舞蹈视频（Video 1），和一张 3D 卡通宇航员图（Image 1）。

```text
Create a high-quality 3D animated video featuring the astronaut character from Image 1.
The character should reproduce the main body movements, arm gestures, and movement timing from Video 1.
Preserve the astronaut's original costume design, proportions, helmet, colors, and overall visual identity.
Translate the human motion naturally into the 3D character's body mechanics.
Smooth character animation, physically plausible movement, consistent proportions, professional 3D animation quality.
```

看主要动作和节奏是否跟上参考视频、角色比例和造型是否保持。记录时写明 Video 1 是**动作参考**，不是被编辑的原片——R2V 生成的是一段新视频，不保证逐帧对齐。

### Test 07：草稿到成片（同族迁移）

不另写 Prompt，直接复用 Test 01。要验证的是一个常被默认成立的分工：先用便宜、快的档位批量出草稿，挑中一条后换贵的档位出成片。

- **LTX**：同一条 Prompt 先跑 Fast 1080p 6 秒，再跑 Pro 1080p 6 秒。1080p 下两者每秒差 0.04 美元，Fast 只便宜约四分之一。
- **H3**：先跑 Turbo 1080P 6 秒，再跑 Max 1080P 6 秒。Turbo 每档都是 Max 的一半价格。

每组成对生成 3 次，记录时用同一个 `pair_id` 把草稿和成片关联起来。对照着看四件事：构图和机位有没有保留，人物外观是否一致，动作轨迹和镜头运动是否还是同一条，成片比草稿到底好在哪里。如果换档之后画面基本是重新生成的，"拿草稿选方向"就不成立，草稿阶段只能用来试 Prompt 的措辞。Kling 在 Foundry 上没有同族的快档，不参加这一项。

## 每次生成记什么

视频生成有随机性，一次结果说明不了问题。每个组合先跑 3 次做探索性对比，同一组合样本到 20 次以上再报 P50 / P95 延迟和成功率。每次生成记同一组字段：

```yaml
run_id: t01-ltx-fast-1080p-r1
test: 01-rainy-night
platform: foundry            # foundry / fal-native
endpoint: ltx-2.5-fast
route: /providers/falai/v1/lightricks/ltx-2.5/text-to-video/fast
deployment: Fal-LTX-2.5-Fast
params: { duration: 6, resolution: 1080p, fps: 24, aspect_ratio: "16:9" }
inputs: []                   # 首帧 / 参考图 / 参考视频 / 音频，注明角色
http_status: 200
task_status: COMPLETED
request_id: ""
timing_s:
  inference: null            # 响应里有 timings 才填
  submit_to_completed: null
  fetch_result: null
  download: null
  end_to_end: null           # 选型对比只用这一项
output: { requested_s: 6, actual_s: null, resolution: null, fps: null, has_audio: null, size_mb: null }
cost_usd: null               # 实际秒数 × 发布单价，月底和账单对一次
scores:                      # 1–5 分
  prompt_adherence: null
  visual_quality: null
  temporal_consistency: null
  motion: null
  audio_sync: null
notes: ""
```

计时这一项最容易混。`inference` 是厂商速度榜上的那个数字，`submit_to_completed` 是排队、改写加推理，`end_to_end` 是从 POST 到 MP4 落盘。三个分开记，比较模型时只用 `end_to_end`。失败的请求连同响应体一起保留，失败本身也是数据。

汇总时不按每秒单价排，而是算**每条可用视频的成本**：总花费除以人工评分各项都不低于 3 分的条数。单价便宜但废片多的模型，在这个口径下会现出原形。

## 实测记录

> [!IMPORTANT]
> 待补。第 0 轮的接口验证、第 1 轮 Test 01 的五组样片、后续各轮结果，测完后按上面的字段整理到这里，并回到系列 02 的场景假设逐条确认或推翻。

## 参考

- [Fal models on Microsoft Foundry (preview)](https://learn.microsoft.com/en-us/azure/foundry/how-to/fal-ai-models/enable-fal-models)
- [H3 Max Reference to Video API](https://fal.ai/models/minimax/h3-max/reference-to-video/api)
- [Kling Video v3 Pro Image to Video API](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api)
- [MiniMax H3 Max by fal](https://fal.ai/minimax-h3-max)
