---
title: Voice Live 系列 07：重复致谢排查——三次 Thank you 的三个开轮来源、转写指纹与编排层修法
created: 2026-09-24
tags:
  - azure
  - voice-agent
  - voice-live-api
  - turn-detection
  - vad
  - echo-cancellation
  - troubleshooting
description: 一个真实案例：语音面试产品的题库模式下，数字人面试官在一道题里连说三次 "Thank you"。用系列06 的五关框架把开轮来源拆成三个（VAD 判停自动开轮、模型分不清停顿与答完、前端按钮补发裸 response.create），说明噪音和回声只是放大器不是根因；给出按 user item 转写文本区分停顿、噪音、回声的指纹法；解释数字人场景下服务端回声消除的参考信号为何与 WebRTC 播放路径失配、Live-Reference AEC 为何对症；最后是落在编排层的线性轮次修法与三个设计对照（显式开关 vs 派生量、两层各治一段、response.created 次数等于读题次数的验证标准）
---

# Voice Live 系列 07：重复致谢排查——三次 Thank you 的三个开轮来源、转写指纹与编排层修法

> 本文是 [系列06](Voice%20Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属.md) 五关框架的第一个应用：一次生产事故的排查。文中 ② ③ ④ ⑤ 指系列06 的五道关卡编号（判起、判停、开轮、生成）。案例里"修法落在编排层"带来的题间静默，在 [系列08](Voice%20Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM%20judge、两段式提交与频率策略.md) 里有中间地带的解法。

---

## 一、现象

一个语音面试产品的题库（bank）模式下，候选人答完一道题，数字人面试官连说了三次 "Thank you."，然后才读下一题。产品侧的第一反应是环境有杂音，"用户的话没被收进去，但又被打断了，于是自动回了一句"。

## 二、三个开轮来源

这条链路上有三个开轮来源，噪音只是其中一种触发器的放大器：

1. 后端 session 用 `azure_semantic_vad`，`create_response=true`。每一次 ③ 判停，④ 自动放行，⑤ 开一个完整的 response。
2. 提示词写的是"候选人答完了回一句简短致谢；如果只是中途停顿说 please go on"。但模型在 ⑤ 里分不清停顿和答完，多数时候选 "Thank you."。
3. 前端"我答完了"按钮在没有活跃 response 时会补发一个裸的 `response.create`。这一个开轮来源不经过 VAD，也不受 `create_response` 管。

一个不需要任何噪音的三次场景：候选人中途停顿一次 → 第 1 次；说完停下 → 第 2 次；点"我答完了"时上一条已播完，补发的 `response.create` → 第 3 次。用 [系列06](Voice%20Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属.md) 的五关框架说：**"Thank you" 的次数等于 ④ 被放行的次数**。停顿、噪音、回声都只是在 ② ③ 两关多制造了几次"用户说完了"的信号，改变的是开轮次数，不是开轮机制。安静房间里也会在每次自然停顿处说一次。

噪音和回声在这套机制里的作用方式：`interrupt_response=true` 时任何被判为语音的声音都会打断数字人正在说的话并开启一段新的"用户发言"，这段发言结束又触发一次开轮。如果这段"发言"其实是噪音，转写通常为空或碎片，模型拿到一个空的 user item，也只能回一句致谢。更隐蔽的一种是数字人自己的声音从扬声器回到麦克风，形成 "Thank you" → 被自己触发 → 再一次 "Thank you" 的短循环。

## 三、三种触发源的转写指纹

三种触发源有不同的转写指纹，不需要额外埋点就能坐实。把每个 `response.created` 往前配对最近一个 user item 的 `input_audio_transcription.completed`：

| 触发原因 | user item 的转写文本 |
|---|---|
| 候选人中途停顿 | 有实际内容，是答题的半句 |
| 环境噪音 | 空，或一两个无意义碎片 |
| 数字人回声 | **是数字人自己刚说过的话**，如 "Thank you" 或题目片段 |

一个级联模型下的顺序细节：`response.create` 在 `speech_stopped` 时就自动发出，早于转写完成；级联模型只看文字，服务端要等转写出来再喂模型。所以是"先开轮、再等转写"，不是"转写为空、再开轮"。结论不变，但排查日志时要按这个顺序读。

## 四、数字人场景下回声更容易漏

官方文档对 `server_echo_cancellation` 默认模式有一个前提：服务端用自己发出的音频做参考信号，并假设客户端一收到 response 音频就立刻播放，播放延迟超过两秒回声消除质量就下降。带 avatar 时用户听到的声音走的是 WebRTC 视频流里的音轨，不是 WebSocket 上的 audio delta，播放路径和时序都与服务端参考信号对不上。这正是 Live-Reference AEC 存在的理由：客户端把实际播放的音频作为第二声道送回去当参考（`reference_source: client`，`channels: 2`）。它是 ① 听这一关的 Speech 层参数，与下一节的编排层修法正交，两者可以同时做。

## 五、修法落在编排层

产品最终把 bank 模式默认改为线性轮次：`create_response=false` 并去掉前端的补发，模型不再拿到自己的轮次，只在后端给题时逐字读题，题间静默。无论 VAD 因停顿、噪音还是回声被触发多少次，都不会再多出一句 "Thank you"。这是系列06 七种形态里形态 2 "应用节拍"叠加形态 4 "脚本朗读"的组合。收尾报告里的一句原话把机制说得很准："that auto-response setting is a single bool; the turn and the follow-up turn are the same turn"——致谢和追问出自同一个 response，协议层没有"只许致谢、不许追问"这一档，这就是提示词修不了它的原因。

## 六、三个设计对照

设计上有三个可以对照的点：

- **开关形式**：落地方案是一个 per-persona 的显式开关，默认线性，另一个选项在 UI 里就叫 "Model has its own turn"，把"模型有没有轮次"这个概念直接做进了产品词汇。另一种做法是把它做成 `max_follow_ups == 0` 的派生量——自由轮次唯一能做到、脚本文本做不到的事就是追问，追问上限为零时自由轮次没有正面产出。显式开关多一个概念但 admin 看得见，派生量少一个概念但编辑器 Playground 那种"必须保留模型轮次否则静音"的例外不好表达。产品选了前者，并明确记录这是对早先"engine decides, no knob"决策的反转。
- **两层各治一段**：线性轮次治的是"次数"，噪音和回声仍会在 ③ 产生 user item 并进答案缓冲区，那是 Speech 层要用 `end_of_utterance_detection`、`remove_filler_words`、降噪和 Live-Reference AEC 另外治的。不要指望一个开关同时解决两层的问题。
- **验证标准**：真实语音跑一场 bank 面试，`response.created` 的次数应当严格等于读题次数。多出来的每一个都能用第三节的指纹表分类，这一跑同时能确认线性修的是次数，而回声若仍在会以"噪音进了答案缓冲区"的形式留下来。

## 七、小结

1. **排查重复回应先数 `response.created`**：次数等于开轮关卡放行的次数，与提示词无关。三个开轮来源里，VAD 判停走 `create_response`，客户端补发的裸 `response.create` 不走，两者要分别关。
2. **转写指纹能坐实触发源**：每个 response 配对前一个 user item 的转写，空 = 噪音、半句 = 停顿、复述自己的话 = 回声。级联模型下是先开轮再等转写，读日志按这个顺序。
3. **数字人场景回声消除默认参考信号与 WebRTC 播放路径不匹配**，需 Live-Reference AEC；它在 Speech 层，与编排层的线性轮次修法各治一层。
4. **线性轮次治的是次数**：`create_response=false` 加去掉补发，模型拿不到轮次；噪音仍会进答案缓冲区，那是 Speech 层另外治的。题间完全静默是它的代价，中间地带见 [系列08](Voice%20Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM%20judge、两段式提交与频率策略.md)。

## 参考

- [How to use the Voice Live API — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-how-to)（server_echo_cancellation 默认参考信号的两秒播放假设与 Live-Reference AEC 的 reference_source / channels 配置；turn_detection 字段与默认值）
- [Voice Live 线性轮次部署报告的翻译与解释](https://chatgpt.com/share/6ab4930c-54d4-83ec-8072-078d399be32d)（本文案例的收尾报告：bank 模式默认改线性轮次、"Model has its own turn" 选项、对 "engine decides, no knob" 决策的反转；注意其中对缺词原文的还原属推测，第三次 "Thank you" 的来源以代码链路为准）
- [Voice Live API Reference 2026-06-01-preview — Microsoft Learn](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-api-reference-2026-06-01-preview)（Live-Reference AEC 首次出现的 preview 版本）
- 系列前篇：[Voice Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属](Voice%20Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属.md)（五关框架与 Model / Agent 模式控制权归属）；更早各篇见系列06 参考
- 系列续篇：[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略](Voice%20Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM%20judge、两段式提交与频率策略.md)
