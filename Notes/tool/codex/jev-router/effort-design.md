# 模型与 Reasoning Effort 联合路由

版本：`joint-effort-v3`。状态：源码实现、离线验证；未启用到共享服务，未新增 Desktop 菜单控件。

## 目标

Auto / Jev 的决策对象从单一模型变成完整执行配置：

```text
当前任务 + 相关历史 + 有效策略 + 合法组合
  -> 一次 Jev 请求
  -> 联合 Choice + 独立任务/风险/能力缺口判断
  -> 确定性策略检查与回退
  -> 持久化 model + reasoning_effort
  -> 转发 Azure Responses
```

Jev 不负责执行工具或授予操作权限。网关不总结或重写执行模型输入，不改变工具定义、reasoning.summary、prompt_cache_key。固定模式仅替换模型；自动模式可以同时替换模型和 reasoning.effort。

## 显式区分自动与手动

`reasoning.effort: low` 本身没有来源标记，无法证明是默认值还是用户手动指定。不能据此猜测用户意图，也不能把 `auto` 作为 Azure 的 effort 值发送。

优先顺序：

1. 手动选择具体模型：完整请求透传，忽略自动 effort 策略，记住手动组合。
2. Auto 模型请求带 `X-Jev-Effort-Policy: fixed`：保留请求 effort，缺失时也不补写。
3. Auto 模型请求带 `X-Jev-Effort-Policy: auto`：明确授权联合选择，请求里的 effort 被视为客户端携带的默认值。
4. 请求未带策略头：使用网关 `effort_policy`。随源码提供的默认值是 `fixed`，保持现有行为。

策略头只供本机网关消费，不转发给 Azure。非法策略返回 400，不调用模型。

**策略头按请求生效，状态里的 effort_policy 是审计记录，不是隐式的下一请求覆盖。** 客户端应在工具请求和后续请求中一致发送策略；否则回到网关默认策略。这能避免用户已经切回固定模式而服务仍悄悄自动改写。

网关配置可以显式设为 `auto`，但这样所有未带策略头的 Auto 请求都授权自动 effort，包括客户端携带的 low/high。不能同时承诺“全局自动”与“自动识别菜单中手动 effort”。启用前应明确选定客户端接入方式。

### Desktop 接入边界

现有 Desktop 模型目录的 effort 档位不能凭空变成一个已接线的 `auto` 控件。本次未修改全局 Codex 配置、模型目录、provider 或 LaunchAgent。

建议将未来交互表示为“模型：Auto / Jev；推理强度：Auto 或固定档位”，并由客户端把 Auto/固定意图传给网关。网关接口与离线测试已经具备；Desktop 是否能提供逐聊天策略头/控件、如何展示最终组合，需要单独验证，不能用目录元数据冒充 UI 完成。

## 一次联合 Choice

自动模式不是两个独立问题“选哪个模型”和“选哪个 effort”。它使用一个 `execution` Choice，候选键为 `模型|effort`，例如：

```json
{
  "gpt-6-luna|low": {"model": "gpt-6-luna", "effort": "low"},
  "gpt-6-sol|medium": {"model": "gpt-6-sol", "effort": "medium"},
  "gpt-6-astra|high": {"model": "gpt-6-astra", "effort": "high"}
}
```

实际候选由启用模型的 efforts 与 `auto_efforts` 交集生成，以上只是格式示例，不是只有三条固定路线。当前七个注册模型、四个自动档位，共 28 个组合，另加 `uncertain`。上限为 254 个实际组合，预留一个不确定选项。

每个选项同时提供模型定位和 effort 参考准则。任务分类、风险、能力缺口继续独立提问；不能假定同一请求中一个问题能看到另一个问题的答案。网关用结果组合出最终规则。

自动候选默认限定为 `low / medium / high / xhigh`。`max / ultra` 不纳入自动选择，不等于模型不支持；具体模型手动请求仍按原协议透传。模型定位和 effort 描述是待校准的规则，不是已测性能或质量等价关系。

## 确定性规则

| 情形 | 决策 |
| --- | --- |
| 联合选择达到置信阈值且满足任务/风险约束 | 接受完整组合 |
| 初次选择不确定，但明确简单且低风险 | `gpt-6-luna + low` |
| 初次一般任务或需求未知 | `gpt-6-sol + medium` |
| 明确复杂/高风险，候选模型不足或 effort 低于 high | 按复杂任务回退，默认 `gpt-6-astra + high` |
| 初次 Jev 超时、非法响应、非法组合 | `gpt-6-sol + medium`，provisional，不重试 |
| 已有绑定，Jev 故障或需求仍未知 | 保留组合 |
| 同轮、普通续问、工具调用、压缩或不透明历史 | 保留组合，不重新调用 Jev |
| 明确新任务或重新评估 | 通过冷却、保持时间等检查后允许重新判断 |
| 模型切换被拒绝 | 不把被拒绝组合的 effort 拼到当前模型上 |
| 同模型 effort 升级 | 重新评估时需能力缺口证据；新任务可重新选择 |
| 同模型 effort 降级 | 仅明确新任务且保持时间满足后允许 |
| 用户显式固定 effort | 立即按手动设置处理，不受自动档位升降规则限制 |

置信度不足但任务分类明确时，保留 v2 的任务分类回退；已有绑定还必须通过原模型切换门槛。联合置信度不是回答正确率，多种足够组合分散概率也不等于任务很难。

初次 fallback 组合必须符合模型支持集。配置校验会拒绝不匹配的默认组合。若禁用后没有满足策略的兼容选项，明确失败，不能把非法组合发给上游。

不透明历史不会迁移到新模型。未知原模型的不透明历史请求仍拒绝；不猜测来源。旧状态没有 effort 时，非重评路径保留请求携带的值；请求也未带时保持缺失，不伪造“历史实际 effort”。

## 稳定性与成本

沿用 thread_id + agent_name 的会话绑定与 turn_id 去重。HTTP handler 在同一会话锁内完成决策、持久化和上游转发。组合在转发前保存，所以模糊超时后的同策略重试不会再次调用 Jev 或换组合。

状态新增 reasoning_effort、effort_policy、effort_source、effort_switched_at；任何 effort 改动使原成本预测失效。

自动模式不使用旧的 model-only 成本预测来支持跨模型降档，因为预测没有区分 effort 对输出和推理量的影响。正常绑定的跨模型自动降档因此被保守阻止；原有明确任务边界下的 provisional 修正仍允许。固定模式保留原来的成本门槛。

同模型 effort 在新任务上的降低是策略决策，不声称节省了特定费用。当前无真实费率/联合组合基准，不报告“最优”“省多少”或“小模型 high 等价于大模型 low”。

## 可观察性

`/health` 报告加载的 policy_version、默认 effort_policy、auto_efforts、fallback_efforts。源码/配置变更不代表旧进程已加载。

每次自动路由日志包含：

- model、reasoning_effort：最终准备转发的配置，不等于供应商已实际采用或成功执行。
- requested_effort、effort_policy、effort_policy_source：输入值和策略来源。
- reason、effort_source、effort_changed：模型与 effort 的策略结果。
- judgment：原始 typed 判断、联合选项/概率/置信度及任务/风险信号。
- eligible_models、excluded_models、policy_version、provisional。

响应头提供 `X-Jev-Model`、`X-Jev-Effort`（仅已知时）、`X-Jev-Effort-Policy`。`control.py status` 展示持久化组合。这些是网关准备/转发配置的证据，不伪称 Azure 返回了相同 effort。

## 验收与后续启用

离线验证包括合法候选、typed 解析、手动透传、原字段保留、同轮/跨轮/重启绑定、冷却、风险与故障回退、不透明历史、旧状态、局部 HTTP 流式转发和策略头剥离。

共享服务尚未重载。启用需要独立核验加载版本、客户端策略来源，以及合成 live 请求的路由记录和真实响应；现阶段没有执行付费 TypeSafe/Azure 测试，也没有验证联合分类质量、真实时延或费用。

## 接口依据

- TypeSafe HTTP API 与 Choice：`https://docs.typesafe.ai/api.md`、`https://docs.typesafe.ai/primitives/choice.md`。2026-09-27 读取，使用单一联合 Choice、封闭选项与分布校验；保留项目“不自动重试”的约束。
- TypeSafe routing 示例：`https://docs.typesafe.ai/patterns/intent-routing.md`。仅借鉴 typed 判断与代码策略分工，阈值不直接照搬示例。
- Codex 配置：`https://developers.openai.com/codex/config-reference`。effort 能力取决于模型与客户端；本文的 `X-Jev-Effort-Policy` 是本地自定义协议，不是官方 Codex/Azure 参数。
