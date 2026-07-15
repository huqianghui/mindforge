---
title: "SkillOpt 系列 03：实战篇——video2frames 提示词调优，从 agent-lightning APO 移植到 SkillOpt"
created: 2026-07-15
tags: [skill-optimization, text-space-optimization, prompt-optimization, apo, agent-lightning, azure-openai, multimodal, reward-design, hands-on]
repo: https://github.com/huqianghui/video2frames-prompt-tuning-skillOpt
related: "[[2026-07-01-SkillOpt]]"
---

# SkillOpt 系列 03：实战篇——video2frames 提示词调优，从 agent-lightning APO 移植到 SkillOpt

> 承接 [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验|快速上手]]（内置 SearchQA benchmark 冒烟）与 [[SkillOpt系列01：源码篇——主要模块拆解与六阶段执行流剖析|源码篇]]（六阶段执行流）。本篇记录**第一个真实客户任务的完整移植**：把原本跑在 agent-lightning APO 上的 video2frames 提示词调优项目，移植到 SkillOpt 的训练循环上，评分逐字节兼容、结果可直接对比。仓库：[huqianghui/video2frames-prompt-tuning-skillOpt](https://github.com/huqianghui/video2frames-prompt-tuning-skillOpt)，配套五篇设计文档在 [doc/](https://github.com/huqianghui/video2frames-prompt-tuning-skillOpt/tree/main/doc)。
>
> 一句话定位：**快速上手篇回答"SkillOpt 能不能跑"，本篇回答"把自己的任务接上去到底要写什么、reward 怎么设计、以及哪里会静默地坏掉"——而实战的精髓在 §八：同一测试集上 APO vs SkillOpt 的 100 任务配对对决，机制上更稳的一方并没有赢。**

---

## 一、任务与移植背景

任务本身来自一个快递/配送检测场景：从短视频中每 4 秒采样 N 帧（以 Azure Blob SAS URL 交付），目标模型要输出结构化 JSON 描述——`english_detail`、`brief`、`title`、`scene_type`、`is_courier_action` 五个字段。被调优的"skill"就是插在帧图片之前的那段 instruction prompt（初始版本 `video2frames_env/skills/initial.md` 与旧项目的 `baseline_prompt.txt` 逐字节相同）。

移植动机在 [[automatic-prompt-optimization]] 的老问题上：客户侧 APO 摆动大。SkillOpt 的**验证门控 + 有界编辑**（validation-gated, bounded skill edits）正是针对这种不稳定的机制性回应——每次编辑必须在 val split 上不劣于当前 skill 才被 accept。移植时刻意保持**评分逐字节兼容**：epoch-0 baseline 的 soft 分数应与旧 APO 项目的 baseline reward 相同（已在共享 task ID 上验证），这样两个优化器的收敛行为可以直接对比。

### APO vs SkillOpt：摆动差异来自三层机制，门控只是最后一道闸

容易把两者的最大区别简化为"SkillOpt 多了门控"，但准确的拆法是**三层机制叠加**：

| 层面 | agent-lightning APO | SkillOpt |
|---|---|---|
| **搜索结构** | beam search：每轮并行生成多个候选 prompt，整体重排、留 top-k（[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景|系列04]] 的"算法 = LLM 调用 + sorted"） | 单谱系增量演进：永远只有一个 current skill，每步在它之上打小补丁 |
| **编辑幅度** | 候选是**自由改写**——LLM 可以整篇重写，两代 prompt 之间可以跳得很远 | **有界编辑**——每步最多 `learning_rate` 条结构化 edit，cosine 衰减，类似信任域小步长 |
| **接受机制** | 轮内**兄弟候选相对排序**，没有"在位者保护"——本轮最好的换掉上轮最好的 | **在位者保护门控**——挑战者必须在 val 上不劣于 current（ties-rejected，打平也拒），否则回滚 |

因果链要理顺：**APO 摆动的直接来源是"自由改写 + 相对重排"的组合**——整篇重写意味着两代之间没有继承性，相对排序意味着每轮冠军都是重新选的；评估噪声一抖，排名就翻，好规则被一次重写整段丢掉。而 SkillOpt 是三个机制**叠加**才压住摆动：小步长保证继承性（好的部分不会被顺带毁掉）、门控保证单调性（val 上不退步）、step buffer 保证不重复踩坑（被 reject 的编辑摘要给后续 analyst）。只看门控会低估它——没有有界编辑，门控保护的对象每次都面目全非，单调性就没意义了。

两个必要的 caveat：

- **两者的"梯度"部分同源**——都是 LLM 读失败案例写文字批评（textual gradient）。真正分岔的是优化器动力学：APO 更像**并行随机搜索**（探索强、方差大），SkillOpt 更像**带信任域的 SGD**（利用强、方差小，但可能陷入局部最优——所以它才需要 epoch-end 的 slow update / meta skill 慢层来补探索，见 [[SkillOpt系列01：源码篇——主要模块拆解与六阶段执行流剖析|源码篇]]）。
- **门控不消灭噪声，只是换了噪声的表现形式**。val 太小时，`2.8×σ/√n` 以内的比较照样是抛硬币——APO 的噪声表现为"prompt 摆动"，SkillOpt 的噪声表现为"错误的 accept/reject"（详见 §七与结论第 4 条）。

一句话版本：**APO 是"广撒网、每轮重选"，SkillOpt 是"单线传承、小步快跑、不进则退"——摆动差异是搜索结构、步长约束、接受机制三者共同的结果，门控是最后一道闸，不是唯一一道。**

### SkillOpt 概念 → 本项目的映射

| SkillOpt 概念 | 本项目 |
|---|---|
| skill（被调文本） | instruction prompt，种子为 `video2frames_env/skills/initial.md` |
| env adapter | `Video2FramesAdapter`（`adapter.py`），注册名 `video2frames` |
| rollout | 每任务一次多模态调用：skill 文本 + `<frame n \| Xs>` 标签与帧图片交错（`rollout.py`） |
| hard / soft 分数 | `hard = int(soft >= 0.8)`；`soft = 0.2·scene + 0.2·courier + 0.6·judge`——与旧 APO reward 完全一致（`evaluator.py`） |
| 选择门控 | `val` split（`valid_seen`），指标 `soft` |
| held-out test | `test` split（`valid_unseen`） |

---

## 二、Env 架构：一个 rollout 函数为什么变成五个文件

旧 APO 项目在 agent-lightning 上只要一个 rollout 函数 + tracer 标签上报 reward；本项目却是一整个 `video2frames_env/` 包。形态变了，但**两个框架要客户提供的东西本质相同**——数据（任务长什么样）、执行（skill + 任务怎么变成模型输出）、打分（输出好不好），差别只在插槽的形状：

| 客户逻辑 | agent-lightning（旧 APO） | SkillOpt（本仓库） |
|---|---|---|
| 数据：schema 与供给 | 自己读文件、把 task dict 发给 server | `tasks.py`（schema）+ `dataloader.py`（split/分批） |
| 执行：跑一个任务 | 一个 rollout 函数（worker 轮询领任务） | `rollout.py`（帧 URL + 目标模型调用） |
| 打分 | 自己算 reward，tracer 标签上报 | `evaluator.py`（硬指标 + judge 软分） |
| 接线 | tracer 隐式收集三元组 | `adapter.py` 显式实现 `EnvAdapter` |
| 入口 | 框架 CLI | `train.py`/`eval.py`（约 40 行：注册 + 委托） |

`train.py` 薄到只有两行有效逻辑——这是**组合根**模式（同 pytest 插件、Django app）：

```python
skillopt_train._ENV_REGISTRY["video2frames"] = Video2FramesAdapter  # 注册
skillopt_train.main()                                               # 委托
```

换来的是上游 trainer **零修改、零 fork**：断点续跑、gate、token 记账全部白拿。

两种契约的取舍值得记：**agent-lightning 契约小而隐式**（上手代码最少，但 reward 悄悄没被收集到时几乎无从排查）；**SkillOpt 契约大而显式**（一个文件变五个，但每个职责单一、纯函数为主，全部可离线单测——本仓库 76 个测试零网络调用就是直接收益）。按设计含金量排序，客户真正要写的是：① reward 设计（`evaluator.py`，唯一需要"设计"的部分）→ ② 目标调用（`rollout.py` 核心约 50 行，机械）→ ③ 数据接入（纯机械）→ ④ 胶水（近乎模板）。前三项就是业务本身，没有框架能替你写。

---

## 三、Reward 设计：soft 驱动门控，hard 划分反思桶

评分从 APO 项目**原样拷来**（`evaluator.py`，权重是文件顶部三个常量）：

```
soft = 0.2 × scene_type 精确匹配（大小写不敏感）
     + 0.2 × is_courier_action 精确匹配（容忍 "true"/"false" 字符串）
     + 0.6 × LLM judge 对三个文本字段的语义合并打分（temperature=0，结构化输出 reason + score）

hard = 1 if soft >= 0.8 else 0    （env.hard_threshold，静态配置，不自适应）
```

两条硬性零分规则：输出不是合法 JSON → 0（格式契约破坏，重罚）；被 Azure 内容过滤器拒绝 → 0（拒绝只取决于输入帧，与候选 skill 无关，配合 probe 缓存在采样时剔除）。

设计逻辑按字段性质拆分：两个分类字段可客观精确匹配（零成本、无噪声），三个自由文本字段只能靠 LLM judge——而且**优化器需要连续信号**：只用精确匹配分数只有五个离散取值，反思分析器几乎没有可批判的素材；judge 的部分得分能区分"略有偏差"和"完全错误"，这正是失败分析依赖的。

### 双指标各司其职（不是冗余）

- **`soft`**（连续 0–1）是优化目标：驱动验证门控（`evaluation.gate_metric: soft`），给 analyst 渐进信号。
- **`hard`**（二元）做两件事：反思阶段把 rollout 分进**失败桶**（`hard == 0` → error analyst 挖 patch）和**成功桶**（→ success analyst 固化有效模式）；训练后是业务头条数字（"多少比例任务达到可交付质量"）。刻意**不用于门控**——二元比率太粗，看不到渐进式提升。

所以 `env.hard_threshold`（默认 0.8）实际控制的是**失败挖掘的口径**，需要人工看 soft 分布后手动调，SkillOpt 不会替你调。

### 与 RL 的逐项类比

repo 文档里这张表把"文本空间 RL"讲得很清楚（与 [[2026-07-01-SkillOpt]] 论文精读呼应）：

| RL 概念 | SkillOpt 对应物 |
|---|---|
| policy | skill 文本本身 |
| reward | `soft`（连续）+ `hard`（成败信号） |
| 梯度 | analyst 的文字批评 + patch（textual gradient） |
| 步长 | `gradient.edit_budget` + `optimizer.learning_rate` |
| 信任域/保守更新 | 验证门控——编辑不劣于当前才 accept，否则 reject 回滚 |
| 经验回放 | step buffer——被 reject 的编辑摘要给后续 analyst |

与数值 RL 的关键差异：credit assignment 不靠大量采样估计，而是 optimizer 模型直接读轨迹写出更新方向——一个 batch 就产出结构化编辑；代价是**更新质量完全取决于 optimizer 模型的判断力**。

### 客户确认六问——最便宜的保险

reward 里烘焙了一组只有客户能确认的假设，答错就是"精确地优化错误目标"。repo 把它整理成六个问题（`doc/reward-design.zh.md` §4），要点：① `is_courier_action` 权重只有 0.2，若它是业务关键信号且漏报/误报代价不对称，应提权并改不对称打分；② judge 目前对三个文本字段输出**一个合并分数**，若下游只消费某个字段应拆分加权；③ ground truth 若是模型蒸馏产物，judge 对照有噪声 GT 打分会把调优引向复现 GT 伪影；④ 多大提升才值得上线（效应量 δ）决定 val/test 要多大；⑤ 下游解析严格还是容错决定非 JSON 是否该打死零分；⑥ 人工评 10–20 条样例校准 judge——它是整个系统的主考官。**大规模训练后再改分数意味着重付一遍训练成本，分数对话是全项目最便宜的保险。**

---

## 四、三个模型角色：把模型能力花在杠杆最大的地方

所有模型选择集中在 YAML（单一事实来源），`.env` 只放凭据：

| 角色 | 做什么 | 认知负载 | 每步调用量 | 推荐 |
|---|---|---|---|---|
| target（`model.target`） | 被调优的模型，跑 rollout。固定为客户生产部署 `gpt-4.1-mini` | 是被测系统 | 每 rollout 一次 | 客户定死，换了就破坏 baseline 可比性 |
| optimizer（`model.optimizer`） | analyst/反思模型：读轨迹、跨轨迹 credit assignment、提 skill 编辑 | **最高** | 每步仅几次 analyst + merge 调用 | **可用的最强模型**——升级便宜、杠杆最高 |
| judge（`env.judge_model`） | 按固定 rubric 给生成描述打分 | 受约束的对照打分 | 每 rollout 一次 + gate eval（量大） | 中强即可；**一致性 > 智力** |

optimizer 不是"只是个编辑器"：它每步读整个 minibatch 的完整轨迹（模型输出 + 分维度评分 + 隐藏参考答案），做跨轨迹根因诊断，决定改 skill 的哪部分而不破坏其余——**patch 质量是一次 run 能提升多少的上界**。两条可比性纪律：换 `model.target` 破坏与已录 baseline 的可比性；judge 定义分数量纲，**所有要互比的 run 必须用同一个 judge**。

配置传递路径也值得记一笔：skillopt trainer 无条件应用 YAML 的 target/optimizer；judge 则由 `Video2FramesAdapter` 导出为 `JUDGE_MODEL` 环境变量、`evaluator.py` 调用时读取——与 skillopt 自身 target/optimizer 的传递模式对齐。

---

## 五、⚠️ 最大的坑：反思轨迹契约与"静默 skip"事故

这是本次移植**最有含金量的踩坑**，repo 专门写了一篇事故复盘（`doc/reflection-trajectories.zh.md`）。

**事故（2026-07-15）**：一次完整训练（4 epochs × 5 steps，约 149 万 prompt tokens）产出的 `best_skill.md` 与初始 skill **逐字节相同**。`summary.json` 一眼定罪：

```
"total_steps": 20,
"total_accepts": 0,
"total_rejects": 0,
"total_skips": 20,          <- 每一步都是 skip_no_patches
"best_origin": "initial_skill",
"token_summary": { "rollout": ... }   <- 完全没有 analyst/优化器调用
```

同一个初始 prompt 三次评估 soft = 0.769/0.754/0.778——±0.015 的散布纯粹是 judge 噪声，不是优化进展。**149 万 token 只是在反复评估初始 skill。**

**根因**：SkillOpt 反思管线读每条 rollout 的 `predictions/<id>/conversation.json` 构造 analyst 输入，文件不存在时**静默 `continue`**。本项目 rollout 起初只写了 `rollout.json` → 所有轨迹被跳过 → analyst 对空输入返回 `None`（根本不调用优化器）→ 零 patch → `skip_no_patches`。而这个要求是**隐式契约**：不在 `EnvAdapter` 抽象接口里（接口只要求返回带 `id`/`hard`/`soft` 的字典），只记载在内部辅助函数的 docstring 里；失败又是设计上静默的——离线测试和"`history.json` 每步一条记录"的冒烟标准全都验不出来。

**修复**：`rollout.py` 现在对**每个**任务（成功、content filter、报错——失败轨迹恰恰是 error analyst 最需要的）都写 `conversation.json`（user 任务描述 / assistant 模型输出 / system 分维度评分），并附 `reference_text`（ground-truth JSON）以 "Hidden Reference" 呈现给 analyst——参考答案永远不进 rollout prompt。帧图片无法给纯文本 analyst 看，分维度评分 + 参考 JSON 是替代信号。

**检测清单**（每次训练后查 `summary.json`）：

| 信号 | 健康 | 异常 |
|---|---|---|
| `total_accepts + total_rejects` | > 0 | 0（全部 skip） |
| `best_origin` | `step_N` | `initial_skill` |
| `token_summary` | 有 analyst/优化器条目 | 只有 `rollout` |
| 每步 `reflect_s` | 数秒 | `0.0` |
| `steps/step_*/patches/` | 有 patch JSON | 空 |

顺带一条健康观：**reject 不是失败，恰恰是门控在起作用**——健康的训练是 accept 和 reject 混合出现；全 accept 或全 skip 才可疑。

**给后续移植的教训**：实现完 `EnvAdapter` 抽象方法只是必要条件。必须用一次真实/mock 运行把完整管线（rollout → reflect → merge → gate）**追一遍数据流**，确认每个阶段消费到了上一阶段的产物。这与 [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验|快速上手]] 里"冒烟只测管路"的教训同源，但更进一步：管路通了 ≠ 数据在流。

---

## 六、并发模型：线程 vs 进程，一次架构层面的对照

旧 APO 项目在 agent-lightning 上的并发行为 macOS/Linux 不一致——不是 bug，是其 server-client 多进程架构的必然：它必须把 rollout 与 GPU 训练器解耦（worker 跨机器 HTTP 拉任务）、运行任意用户 agent 代码（进程隔离）、能杀掉挂死的 rollout（线程杀不掉）。代价是 OS 相关语义（Linux fork vs macOS spawn、fd 上限差异）。

本项目三个特性都不需要：单机、代码路径固定（纯 I/O 等待，GIL 无关紧要）、挂死已被超时+重试兜住。所以全部用**单进程 `ThreadPoolExecutor`**——零跨平台差异。这是 [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验|快速上手]] 对比表里"完全不用 GPU"之外的第二个架构红利。

配置项只有三个：`env.workers`（batch 内 rollout 并行，当前 12）、`gradient.analyst_workers`（analyst minibatch 调用，4 已饱和）、`--probe-workers`（数据准备探测，8）。流水线各阶段**顺序执行**，峰值并发 ≈ `max(workers, analyst_workers)` 而非乘积。

规模判断一句话：**真正的上限是 Azure 配额，不是线程池**——每 rollout 发全部帧图片（约 2.8 万 prompt token/任务），workers 超过部署 TPM 只会把并行度变成 429 重试。还有一个值得记的可观察症状：某个 step 安静卡很多分钟（`reflect_s` 达 1200s 而 completion 只有约 1k token）——几乎一定是 skillopt 的**静默重试**在扛优化器部署的限流，去查 Azure 门户指标，不是查进程。

---

## 七、数据集规模：让门控噪声决定 val 大小

SkillOpt 靠 val split 上的平均 soft 分数 accept/reject 每次编辑，所以 val 的噪声直接变成错误的门控决策。核心公式：

```
SE = σ / √n            两个均值之差 > 2.8 × SE 才可信（95% 双样本 z 检验）
n ≈ 2 × (1.96 × σ / δ)²   要检测大小为 δ 的真实差异所需的 val 大小
```

以本项目典型 σ ≈ 0.20 计：val=24（默认）只能看见 >0.11 的差距，而提示词调优的有效收益通常在 0.03–0.10——**默认 val 对一次 +0.05 的真实提升是不可见的**，工作规模应为 64–100。σ 不用猜：eval 运行的 `results.jsonl` 里就有单任务分数，算标准差即得（评分或目标模型一换就要重估）。

三个 split 扩容优先级不同：**val 优先**（驱动门控）；**test 第二**（最终 baseline vs tuned 是配对对比，用差值的 σ_d 代入单样本公式，约 100 条够）；**train 通常不动**（每步只采 batch_size=8，分析器只看 minibatch=4，40 条池子够多样——想提升反思信号先加 `minibatch_size` 或 epoch，再考虑加数据）。

省钱套路是**竞速阶梯**：小 val（24–64）粗筛训练 → 结束后把 `best_skill.md` + 有希望的中间 skill + baseline 在大持留集（100–200 条）重评定最终赢家 → 差距小于 `2 × SE` 就不成立，回去加大搜索（epoch 优先——门控下顺序编辑是**复利**的）而不是急着扩数据。采样纪律：val/test 保持分层随机绝不偏置；**要偏置就偏置 train 向困难样本**（失败携带的信息最多）；始终带 `--probe-content-filter` 让被内容过滤器拦截的视频（统一 0 分纯噪声）不进任何切分。

症状对旋钮速查（来自 `doc/dataset-sizing.zh.md`）：

| 症状 | 旋钮 |
|---|---|
| 编辑 accept/reject 在噪声之内 | 扩 val + `sel_env_num` |
| skill 每步几乎不变 | 加大 `optimizer.learning_rate`（编辑预算） |
| 每个 epoch 最优都在提升 | 加 `num_epochs` |
| 后期 epoch 从不提升 | 停止加预算 |
| 反思分析重复同样抱怨 | 加 `minibatch_size`、更难的训练任务 |
| 最终差距貌似成立未确认 | 扩 test |

---

## 八、正面对决实测：APO vs SkillOpt，100 任务配对对比（2026-07-15）

机制分析（§一）说 SkillOpt 更稳，那实际调出来的 prompt 谁更好？repo 的 `doc/apo-faceoff.zh.md` 记录了一场三方对决——**结果对 SkillOpt 并不客气**，恰好是"机制上稳 ≠ 效果上赢"的一手证据。

### 对比设置

| 参赛者 | 来源 |
|---|---|
| baseline | 未调优的初始 prompt（与旧项目 `baseline_prompt.txt` 逐字节一致，`diff` 验证过） |
| APO best | agent-lightning/APO 训练跑出的最优 prompt |
| SkillOpt best | 本项目训练跑出的最优 skill（20 步，80 train / 100 val，optimizer=gpt-5.4） |

可比性三道保障：相同打分（soft/hard 是 APO reward 的无损移植）、相同 target（`gpt-4.1-mini`）与相同 judge、**对两个优化器都无污染的测试集**——既排除本项目的 train/val，也排除旧 APO 项目的 train/val。

第一轮在 30 任务测试集上跑，观察到的差距（APO +0.027 ± 0.018 SE）在噪声范围内——于是用 `prepare_data.py --grow-test 100`（追加式扩容，已有测试行前缀逐字节不变，新候选从 5,847 个源视频扣除所有已用切分后分层采样 + 逐个探测内容过滤）把测试集扩到 100。这正是 §七"竞速阶梯"的现场演练：**30 任务集的单次 eval 方差就有 ±0.01–0.02，同一 skill 重跑就会移动这么多，根本无法区分参赛者。**

### 100 任务结果

| Skill | hard | soft | scene_match | courier_match | judge_score |
|---|---|---|---|---|---|
| baseline | **0.59** | 0.7879 | 0.94 | 0.98 | 0.6732 |
| SkillOpt best | 0.55 | 0.7846 | **0.95** | 0.98 | 0.6643 |
| APO best | 0.57 | **0.8056** | 0.94 | **1.00** | **0.6960** |

逐任务配对分析（同一任务求差再平均，n=100）：

| 对比 | soft 差值 ± SE | t | 胜/负/平 |
|---|---|---|---|
| APO − baseline | +0.0177 ± 0.0129 | 1.37（不显著） | 43/36/21 |
| SkillOpt − baseline | −0.0033 ± 0.0124 | −0.27（持平） | 37/42/21 |
| APO − SkillOpt | +0.0210 ± 0.0114 | 1.84（p ≈ 0.07） | 44/36/20 |

### 五条实测解读

1. **SkillOpt 的增益没有泛化。**在 70 个全新任务上，其最优 skill 与 baseline 打平——旧 30 任务集上看到的 +0.008 是 **gate 对 val 集的过拟合加噪声**。门控保证的是"在 val 上不退步"，val 本身就是被反复优化的对象，它不能替代 held-out 验证。
2. **APO 边缘领先 SkillOpt**（+0.021 soft，t=1.84，p≈0.07），但它对 baseline 的优势在更大测试集上也缩小到不显著的 +0.018。
3. **全部差距都在 `judge_score`**：scene/courier 精确匹配分量接近饱和（0.94–1.00），三个参赛者几乎一致——可优化的空间只剩自由文本质量那 0.6 的权重。
4. **`hard` 反而 baseline 最高**（0.59）：两个调优后的 prompt 都在略微抬升或保持平均质量的同时，把少数边缘任务压到了 0.8 阈值以下——又一个 `hard` 不适合做 gating 指标的实证。
5. **天花板本身很低**：以 `gpt-4.1-mini` 为 target 时，此任务相对 baseline 的提升空间 soft ≤ +0.02；可靠测出它需要 ≥100 个配对测试任务，而真正拿到它需要的是**更好的优化运行，不是更好的测量**。

### 回扣 §一 的机制对比

这场对决给三层机制分析补上了辩证的一笔：SkillOpt 的保守机制（小步长 + 在位者保护）在**提升空间本来就小**的任务上，护住的可能只是 baseline 附近的一个小邻域——不摆动的代价是探索不足；APO 的自由改写方差大，但也正因为跳得远，才在 judge_score 上摸到了 +0.02 的天花板。另一面，courier 正例在全数据集中只有 0.2%（5,847 条里 13 个正例，各切分正例数为 0），`courier_match` 实际度量的是"避免误报"——reward 分量的可辨识性问题（§三客户六问的第 1 问）在实测里直接现形。**机制选型要以任务的可提升空间和评估噪声为前提，而不是无条件偏好"更稳"的那个。**

---

## 九、Runbook 摘要

```bash
# 环境
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 只放凭据；模型选择全在 YAML

# 数据（原始数据拷入 original_data/）
python prepare_data.py --train-size 40 --val-size 24 --test-size 30 --seed 42 --probe-content-filter

# 训练（输出 outputs/skillopt_video2frames_<optimizer>_<timestamp>/）
python train.py --config configs/video2frames/default.yaml

# 评估任意 skill 于任意切分
python eval.py --config configs/video2frames/default.yaml \
    --skill outputs/<run>/best_skill.md --split valid_unseen
```

冒烟两层：离线 `pytest -q`（76 测试全 mock，约 1s）；在线全量限到 4 条 + 1 epoch（几美元、约 2 分钟）。**在线冒烟的验收标准经过事故校正**：不只看 `history.json` 有记录，必须看到步骤日志 `failure_patches > 0` 且 `summary.json` 里 `total_accepts + total_rejects > 0`——否则就是 §五那个静默 skip，run 只是在反复评估初始 skill。

限流风暴中断随时可续：`--cfg-options env.out_root=<已有运行目录>` 重跑，已完成的 step、rollout、minibatch patch 全部复用。

---

## 十、结论与关联

1. **移植工作量与 APO 大体相同**，因为 reward/rollout/数据接入就是业务本身。差别在胶水层形状：agent-lightning 藏进 tracer 约定，SkillOpt 摊开成显式文件——对要交付客户长期维护的项目，显式契约更划算（可测试、可调试、跨平台一致）。
2. **评分逐字节移植是对比实验的前提**：epoch-0 baseline soft 对齐旧 APO baseline 后，才能比较 `best_skill.md` 与旧 `results/best_prompt.txt` 是否学到同样的规则。
3. **显式契约也有暗面**：`conversation.json` 是不在接口里的隐式要求，缺失时静默退化。"接口实现完"和"数据流追通过"是两回事。
4. **稳定性的共同地基**依然是 reward/eval 质量：门控只是把评估噪声的代价从"prompt 摆动"换成了"错误的 accept/reject"——σ 不缩小，换框架也躲不开（呼应 [[automatic-prompt-optimization]] 的摆动主因分析）。
5. **实战的精髓是 §八 那场配对对决**：机制分析（§一）只能告诉你"谁更稳"，无污染 held-out 上的 100 任务配对差值才能告诉你"谁更好"——本次是 APO 边缘胜出、SkillOpt 增益未泛化（gate 过拟合 val）、且任务天花板本身只有 soft ≤ +0.02。移植一个优化器的完整闭环，必须以这样一场对决收尾，否则"移植成功"只是管道意义上的成功。

**关联阅读**：
- 两段式管道与选型算账方法（本篇对决的后续） → [[SkillOpt系列04：APO×SkillOpt联合展望——先探索后精修的两段式管道与选型算账方法]]
- 论文精读 → [[2026-07-01-SkillOpt]]
- 环境/runbook/踩坑（SearchQA） → [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验]]
- 框架模块与六阶段执行流 → [[SkillOpt系列01：源码篇——主要模块拆解与六阶段执行流剖析]]
- APO 摆动与评估噪声 → [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
- agent-lightning 框架对照 → [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
