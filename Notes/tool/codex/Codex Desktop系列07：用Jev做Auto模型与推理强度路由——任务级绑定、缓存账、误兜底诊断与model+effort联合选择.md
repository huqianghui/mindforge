---
title: Codex Desktop 系列07：用 Jev 做 Auto 模型与推理强度路由——任务级绑定、缓存账、误兜底诊断与 model + effort 联合选择
created: 2026-09-27
tags:
  - codex
  - jev
  - typesafe
  - model-routing
  - reasoning-effort
  - prompt-cache
  - azure-openai
  - finops
description: 把 TypeSafe 的 Jev 接成 Codex 模型菜单里的 Auto / Jev 入口，用本机回环网关做上下文感知的模型与推理强度路由。四个结论：路由粒度不是每次 input 而是任务级绑定，因为缓存与不透明上下文让频繁切换得不偿失；Jev 只负责 typed 判断（任务需求、风险、能力缺口、候选组合），确定性代码负责置信门槛、兼容性、保持时间、缓存成本门槛与兜底；一次"hello, who are you"落到 Astra 的案例暴露 v1 把"选不准型号"等同于"需要最强模型"，v2 改为先判任务需求再处理型号不确定；v3 把决策对象从 model 扩成合法的 (model, effort) 组合，并要求显式 auto / fixed 意图。全文区分已实测、已实现未启用、待校准三类事实，不给"最优路由"或"省了多少"结论
---

# Codex Desktop 系列07：用 Jev 做 Auto 模型与推理强度路由——任务级绑定、缓存账、误兜底诊断与 model + effort 联合选择

> 前六篇把 Codex Desktop 的模型目录、bundled CLI、Computer Use 与 ModelInfo 字段拆开看过一遍。本篇做一件反向的事：在模型菜单里加一个自己的 **Auto / Jev**，让 [TypeSafe 的 Jev](../../../product/TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语.md) 根据任务上下文选模型，后来又扩展到一并选推理强度。它与 [CodexSaver](../CodexSaver深度解析——基于MCP的模型路由Token成本优化.md) 走的 MCP 任务级路由是两条路：那条由 agent 主动把子任务派给廉价模型，这条在 provider 层做透明路由。
>
> 数据与代码来自 2026-09-27 三段 Codex 会话与项目文档。所有阈值与兜底表是策略参数，不是校准结果；所有价格字段为空，全文不报告节省金额。

---

## 一、先分清五个概念

| 概念 | 含义 | 是否重新路由 |
|---|---|---|
| 一次聊天 | 同一个 thread 的完整往来 | 可以包含多次路由 |
| 一次用户回合（turn） | 提交一条输入，到 Codex 停下等你 | v1 设想在此路由；最终不是 |
| 一次模型 API 请求 | 模型生成下一段回答或下一批工具调用 | 回合内沿用已选模型 |
| 一次工具调用 | 读文件、跑命令、搜索 | 工具返回不触发选模 |
| **一个任务** | 可跨多个 turn 的同一件事 | **最终策略：任务开始选一次，事件触发才重评** |

Codex 的请求里带 `thread_id`、`turn_id`、`context_window_id`，网关用 thread_id 加 agent_name 做绑定范围，用 turn_id 阻止同一回合内重复调用 Jev。这是"任务级绑定"能落地的前提。

## 二、为什么不是每次 input 都选模型

讨论的转折点是一句反问：每回合换模型，缓存怎么复用？答案是三种策略比较后选第三种。

| 策略 | 何时选模型 | 优点 | 代价 |
|---|---|---|---|
| 每回合独立选择 | 每次输入 | 灵活 | 来回切换，缓存与不透明上下文（加密推理、压缩历史）都丢 |
| 整个聊天固定 | 新建聊天时 | 简单，缓存好 | 任务变了模型不变 |
| **同一任务固定，事件触发调整** | 任务开始；明确升级信号或新任务 | 兼顾连续性、缓存与能力匹配 | 要判断任务边界与升级信号 |
| 主模型固定，子任务另选 | 局部派发 | 主上下文保留 | 需要编排，是 CodexSaver 那条路 |
| 先轻量，失败再升级 | 开始轻量 | 简单任务便宜 | 难题多付一轮失败与重处理 |

切换要算总账，不是比单价。一个仅用于说明的假设：

| 项目 | 留在模型 A | 切到模型 B |
|---|---|---|
| 历史 10 万 token 的读取价 | A 缓存价 = 普通价 10%，等价 1 万 token | B 无缓存，普通价为 A 的 20%，等价 2 万 token |
| 结论 | B 单价便宜五倍，这一次历史读取仍贵一倍；后续用量大或输出便宜时账又可能反过来 |

所以规则是不对称的：**升级**看能力缺口、关键验证反复失败、任务范围扩大；**降级**等任务结束或明确新任务，且价格与预测齐全；切换后保持一段有意义的工作阶段。"继续"、"补个测试"这类短输入不触发降档。Jev 在这里回答的问题从"这条消息属于哪一档"变成"当前情况是否值得打破绑定"。

## 三、架构：Jev 判断，代码决定，模型执行

![Auto / Jev 路由决策链：请求进入本机网关，已有绑定直接沿用；首次或明确重评时 Jev 做一次 typed 判断，确定性策略检查阈值、兼容性、保持时间与缓存门槛后绑定并转发|760](../../../asset/jev-router-decision-chain-2026-09-27.svg)

| 组件 | 职责 | 不做什么 |
|---|---|---|
| Codex 模型目录 | 增加别名 `auto-jev`，显示名 Auto / Jev | 不替换官方内置 Auto；Default 不等于 Jev |
| 本机回环网关 | 接 Responses 协议，读会话标识，查绑定，转发 Azure，流式回传 | 不总结、不重写执行模型的输入、工具定义与 prompt_cache_key |
| Jev | 一次 typed 判断：候选选择、任务需求（simple / standard / demanding / unknown）、高风险概率、能力缺口 | 不回答、不调工具、不授予权限；只收最多 12,000 字符近期文字，不收图片、工具输出、整个代码库 |
| 确定性策略 | 置信阈值、部署与 effort 兼容性、保持时间、冷却、缓存成本门槛、兜底 | 不猜价格：`prices` 为空时禁止纯成本降档 |
| 执行模型 | 回答与工具调用 | 七个 Azure 部署之一 |

候选池是七个模型，按官方定位分档，分档是路由策略而不是实测排行：

| 系列 | 模型 | 路由参考定位 |
|---|---|---|
| GPT-6 | Astra | 最复杂的多步推理；复杂或高风险兜底 |
| GPT-6 | Sol | 日常及复杂编码、Agent 工作流 |
| GPT-6 | Luna | 清晰、聚焦、重复性高的任务 |
| GPT-5.6 | Sol | 旧代旗舰，复杂编码 |
| GPT-5.6 | Terra | 平衡能力与成本 |
| GPT-5.6 | Luna | 成本敏感任务 |
| GPT-5.5 | gpt-5.5 | 部署后补充验证并启用 |

接入细节里有三个坑：GPT-5.5 的工具协议与新型号不同，Auto 统一用共同支持的标准 Responses 工具格式；目录里有条目不等于已部署，未部署时是 404，要显式标"不可路由"而不是静默删掉；模型目录出现选项、请求成功路由、工具流程跑通是三个要分别验收的环节。

## 四、已实测的部分

| 验证项 | 结果 |
|---|---|
| 真实 API 链路 | Jev 首次选择 gpt-5.6-terra，下一回合保持；手动指定 Astra 直通 |
| 同回合工具循环 | 两次模型请求只调用一次 Jev；第二次请求读取 15,995 个缓存 token |
| 七模型工具矩阵 | 六个 GPT-6 / GPT-5.6 通过；GPT-5.5 部署后通过，第二次请求读取 17,280 缓存 token。用固定选择器逐个指定后端，不是 Jev 一次选中七个 |
| 正式配置 CLI 入口 | `-m auto-jev` 走现有配置，Jev 评估七个候选，本次 uncertain 回退 Astra，正常返回 |
| Desktop 菜单 | 目录返回 `auto-jev / Auto / Jev / hidden: false`；截图确认菜单可见；选择后回退 Astra 的原因是项目级 `.codex/config.toml` 固定了 `model = "gpt-6-astra"` 覆盖全局，移除后两层均解析为 auto-jev。修复后的实际点击尚未验收 |
| 离线测试 | v1 25 项、v2 39 项、v3 62 项通过。耗时是测试套件耗时，不是模型延迟 |

缓存读取数字来自真实 usage，只证明这次工具循环内的复用，不证明跨模型共享缓存。

## 五、一次误兜底：为什么"hello, who are you"落到了 Astra

这是全篇最有价值的反例，因为它把入口、判断、代码、部署、返回五层证据拆开了。

| 证据层 | 实际记录 |
|---|---|
| 菜单入口 | auto-jev |
| Jev 的选择 | `uncertain`，confidence 0.49，低于阈值 0.7；Astra 的候选概率为 0.0 |
| 代码决策 | `reason = uncertain_default`：首次不确定 → default_model |
| 执行模型与部署 | gpt-6-astra |
| 后续两次提问 | `reason = sticky`，`jev_called = false` |

所以不能写成"Jev 判断简单问题需要 Astra"。真实路径是 Jev 说不确定，v1 规则把不确定等同于最强兜底，然后绑定生效、难以降档。四个问题与 v2 的修正：

| v1 的问题 | v2 的修正 |
|---|---|
| 把"选不准型号"等同于"任务复杂" | 同一次 Jev 请求里独立判断任务需求、风险、型号；不确定时按需求分层兜底：简单低风险 → Luna，一般或未知 → Sol，复杂或高风险 → Astra |
| 首次兜底变成持续绑定 | 兜底绑定标记 `provisional`，在安全的任务边界可纠正，不必先证明费用收益 |
| 降档条件过严且价格为空 | provisional 纠正走独立路径；正常绑定的成本降档仍要求价格与预测 |
| 选模提示词只写"this coding task" | 把最新请求单独提供给 Jev，并说明常驻仓库说明不是当前任务 |

离线回放确认：只降低 0.7 阈值解决不了这个案例，因为 Jev 选的是 uncertain 本身。已绑定 Astra 的旧聊天也不会因代码更新自动降档，因为旧状态没有 provisional 标记，不能猜。

## 六、v3：把决策对象扩成 (model, effort)

第三段讨论从一个检查开始：全局配置写着 `model_reasoning_effort = "low"`，而 Auto / Jev 只选模型、不改 effort。于是即使 Jev 判断任务 demanding，Astra 仍以 low 运行。

| | v2 | v3 |
|---|---|---|
| 决策对象 | 模型 | 一个 `execution` Choice 选完整 `model|effort` 组合，候选由启用模型的 efforts 与 auto 档位交集生成，七模型 × 四档 = 28 个合法组合加 uncertain |
| effort 来源 | 请求带入，原样保留 | 显式策略：`fixed` 保留请求值，`auto` 才允许替换 |
| 意图传递 | 无 | 本机头 `X-Jev-Effort-Policy: auto|fixed`，按请求生效，出站前剥离；没有头则用网关默认（源码默认 fixed） |
| 兜底组合 | Luna / Sol / Astra | Luna + low、Sol + medium、Astra + high |
| 成本降档 | model-only 预测 | auto 模式禁用 model-only 预测做跨模型降档，因为它不区分 effort 对输出量的影响 |

一条关键约束：请求里的 `reasoning.effort: low` 没有来源标记，分不清是用户手选还是客户端默认，所以不能凭它猜意图，只能靠显式策略。`max / ultra` 不进自动池，手动选具体模型时仍透传。

独立复核在离线阶段抓到两处边界并已修：保留已绑定组合时不应先用无关的 fallback 档位去校验它；只改 effort 也要刷新组合的保持时间，否则 300 秒保持期可被绕过。

## 七、三类事实的边界

| 类别 | 内容 |
|---|---|
| 已实测 | 七模型连通与工具循环、任务级绑定、同回合缓存复用、CLI 入口、Desktop 菜单可见与配置覆盖原因 |
| 已实现未启用 | v2 任务分层与 provisional、v3 联合 effort。归档时共享服务 `/health` 仍是旧接口，无 policy_version，不能声称 v2 / v3 在线 |
| 待校准或未做 | 阈值 0.7 / 0.7 / 0.2 与三档兜底的分类质量、真实延迟；Azure 实际费率与合同折扣；28 个组合的质量与费用对比；Desktop 的 Auto effort 控件；修复后菜单选中保持的真实点击 |

## 八、放回 FinOps 的坐标

这条路由链的价值不在"更聪明地选模型"，而在把 [FinOps 系列 01](../../FinOps/FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界.md) 里的任务完成花费拆到了正确的粒度：绑定按任务而不是按调用，切换算总账而不是比单价，缓存读取以 usage 为证而不是以配置推断。它同时是 [系列 02](../../FinOps/FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标.md) 里"决策层拆出来"的另一个落点：Jev 给 typed 判断与置信度，确定性代码守边界，这与 [Computer Use 系列八](../../AI/computer-use/Computer%20Use与Browser%20Use系列八：Jev×Codex实践——把动作判断交给System%20One模型的受控对照、费用账与skill优先级结论.md) 里 Jev 选 UI 动作的分工完全同构。

要把它从"可用"推到"值得默认"，还差同一组东西：代表性任务集上的分类质量、真实费率、以及把 v3 加载到共享服务后的线上记录。

---

**相关阅读**

- [TypeSafe Jev：System One 模型、RLCD 与校准决策](../../../product/TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语.md)
- [Computer Use 与 Browser Use 系列八：Jev × Codex 实践](../../AI/computer-use/Computer%20Use与Browser%20Use系列八：Jev×Codex实践——把动作判断交给System%20One模型的受控对照、费用账与skill优先级结论.md)
- [CodexSaver 深度解析——基于 MCP 的模型路由 Token 成本优化](../CodexSaver深度解析——基于MCP的模型路由Token成本优化.md)
- [Codex Desktop 系列01：接入 Azure OpenAI GPT-6](Codex%20Desktop系列01：接入Azure%20OpenAI%20GPT-6——bundled%20CLI版本锁定、model%20catalog%20schema与分层排错.md)、[系列05：一个模型条目装下整个 harness](Codex%20Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界.md)
- wiki：[模型路由](../../../wiki/concepts/model-routing.md)
- 官方文档：[Intent routing](https://docs.typesafe.ai/patterns/intent-routing)、[Confidence](https://docs.typesafe.ai/confidence)、[Codex config reference](https://developers.openai.com/codex/config-reference)、[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
