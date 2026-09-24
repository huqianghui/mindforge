---
title: "Viseme（视觉音素）"
created: "2026-09-25"
updated: "2026-09-25"
tags:
  - wiki
  - concept
  - voice
  - avatar
  - tts
aliases:
  - "视觉音素"
  - "口型单位"
related:
  - "[[speech-technology-stack]]"
  - "[[voice-live-agent]]"
  - "[[compute-locus-spectrum]]"
  - "[[grapheme-to-phoneme]]"
---

# Viseme（视觉音素）

## 摘要

Viseme（vis- = see）是**眼睛看到的最小口型单位**，与 phoneme（音素，耳朵听到的最小语音单位）构成 `-eme` 词族（还有 grapheme 字素、morpheme 语素——各领域的最小功能单位）。关键关系：**多个 phoneme 映射到同一个 viseme**——/p/ /b/ /m/ 听起来不同但口型都是"双唇闭合→打开"；人眼能区分的口型数量远少于人耳能区分的音素数量，Azure 为 en-US 定义了 22 个 viseme ID（0–21）。

viseme 是语音驱动动画领域的基础单位，跨 TTS、数字人、3D 动画三个子域：TTS 引擎在合成音频的同时输出 viseme 时间轴（Voice Live 事件 `response.animation_viseme.delta`：`viseme_id` + `audio_offset_ms`），下游渲染层（云端神经渲染或客户端 blendshape/骨骼动画）按时间轴驱动口型。

## Claims

### Claim: viseme 序列比音素序列更接近渲染层——这是口型输出协议选 viseme 时间轴而非音素序列的原因

- **来源**：[[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> 几十个英语音素收敛到 22 个口型单位，渲染层只需关心视觉可区分的形状。官方文档 + 生产接入双重印证。

### Claim: viseme 是离散的驱动信号，渲染输出是连续的——"查表贴图"是误解，实际是协同发音条件下的神经渲染

- **来源**：[[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> 若按 viseme ID 查表贴预录口型帧，口型会像早期游戏 NPC 一样机械——真实说话中相邻音素口型互相渗透（协同发音 coarticulation：/s/ 接 /u/ 和接 /i/ 嘴形不同）。实际做法：深度视觉模型以音频/viseme 时间轴为条件逐帧合成嘴部及周边区域，再无缝融合回实拍素材。Video 头像的"素材回放"部分是身体、衣着、姿态；嘴是每次实时生成的（显式流水线 `audio → phoneme → viseme → mouth animation → 与素材合成`）。

### Claim: "viseme 是数字人准入闸门"约束的是"谁来出声"，不约束"头怎么动"

- **来源**：[[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar]]、[[Voice Live系列04：四条路线与全双工——GPT-Live-1对数字人方案的影响评估]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> 闸门的准确含义：驱动信号必须来自 TTS 合成环节，所以数字人必然落在混合式/级联式路线——对两类头像都成立（photo 头像同样吃 Azure TTS 输出）。但 video 头像消费"音频 + viseme 时间轴"，photo 头像消费"音频波形本身"（VASA-1 直接从音频提特征，中间**没有显式 viseme 表示**，面部动力学作为联合潜变量整体建模）。此条精确化了 VL04 的初版表述。

### Claim: 客户端 viseme 渲染的六条同步工程规则——时间轴是云端计算与本地渲染两个位面的耦合接口

- **来源**：[[Blender系列04：口型同步实战——从音量包络到viseme的渐进式改造与三维口型架构]]
- **首次出现**：2026-09-12
- **最近更新**：2026-09-25
- **置信度**：0.7
- **状态**：active

> Blender 系列独立批次的客户端接入实证：viseme 事件流由云端语音 API 下发、渲染在本地执行，`audio_offset_ms` 时间轴是跨位面耦合接口（相关判据框架见 [[compute-locus-spectrum]]）。工程规则要点：按音频播放时钟对齐而非事件到达时刻、口型过渡需插值平滑、简化方案（音量包络）与精细方案（viseme）的分界在"是否需要可辨认的发音口型"。卡通数字人（非人类比例明确不被 photo 头像支持）的唯一出路正是客户端拿 viseme 时间轴自渲染。

## 冲突与演进

- 08-26/09-12 两轮裁决为"Claim 分散注入"（voice-live-agent / compute-locus-spectrum / speech-technology-stack）；VL05 首篇定义性深入命中复评触发条件，2026-09-25 用户裁决升格建页。分散注入的 Claims 保留原页，本页收定义与词族框架。

## 关联概念

- [[speech-technology-stack]] — `part-of` TTS/Speech Out 环节的口型输出单位
- [[grapheme-to-phoneme]] — `extends` G2P 之后的下一段映射：phoneme → viseme 多对一收敛
- [[compute-locus-spectrum]] — `uses` viseme 时间轴是"云端计算 × 本地渲染"跨位面组合形态的耦合接口

## 来源日记

- [[2026-09-23-周三]] — Voice Live 两类数字人头像讨论与成文（VL05）
