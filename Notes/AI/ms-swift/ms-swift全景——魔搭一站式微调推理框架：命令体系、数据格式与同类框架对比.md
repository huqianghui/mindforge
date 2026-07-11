---
title: ms-swift全景——魔搭一站式微调推理框架：命令体系、数据格式与同类框架对比
created: 2026-07-11
tags:
  - fine-tuning
  - ms-swift
  - GRPO
  - modelscope
  - LLM-training
---

# ms-swift全景——魔搭一站式微调推理框架：命令体系、数据格式与同类框架对比

## 1. 名字由来：ms 不是 Microsoft

第一次看到 `ms-swift` 很容易误读成 Microsoft 的项目，实际上：

- **ms** = **ModelScope**（魔搭社区）——阿里巴巴推出的模型社区
- **SWIFT** = **S**calable light**W**eight **I**nfrastructure for **F**ine-**T**uning（可扩展的轻量级微调基础设施）

GitHub 仓库为 [modelscope/ms-swift](https://github.com/modelscope/ms-swift)，pip 包名也是 `ms-swift`。加 `ms-` 前缀的一部分原因是与 Apple 的 Swift 编程语言区分，避免命名冲突。

## 2. 定位与支持范围

ms-swift 是魔搭社区官方的**大模型与多模态大模型一站式微调推理框架**，覆盖「训练 → 推理验证 → 评测 → 部署 → 导出量化」全链路，而不只是一个训练工具。

**模型覆盖**（截至 2026-07）：

- **600+ 纯文本大模型** + **400+ 多模态大模型**，含 All-to-All 全模态模型
- 对 Qwen、DeepSeek、GLM、InternVL 等国产模型 **Day-0 跟进**——魔搭是这些模型的首发平台，这是 ms-swift 相对海外框架最大的生态优势

**训练方法覆盖**：

- 训练范式：预训练（pt）、微调（sft）、人类对齐（rlhf：DPO/GRPO/PPO/KTO/ORPO/SimPO/CPO 等）
- 参数策略：全参数、LoRA、QLoRA、DoRA 等
- 规模化：**Megatron-SWIFT**（集成 Megatron-LM，支持 TP/PP/EP 并行），适合大规模 MoE 训练
- 量化：GPTQ、AWQ、BNB、FP8
- 零代码：提供 Web-UI 完成训练/推理/评测/量化全流程

**架构本质**：ms-swift 自己不造轮子，训练底层封装 transformers/PEFT/DeepSpeed/Megatron，推理底层封装 vLLM/SGLang/LMDeploy，自身只做**统一的参数接口、模型注册和 chat template 适配**。这与 [[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑|verl]] 的思路一致——框架做编排，推理交给专业引擎。

## 3. 命令体系

ms-swift 的 CLI 以 `swift <子命令>` 组织，常用命令：

| 命令 | 作用 |
|------|------|
| `swift sft` | 监督微调（全参数/LoRA） |
| `swift pt` | 预训练 |
| `swift rlhf` | 人类对齐训练，`--rlhf_type` 指定 dpo/grpo/kto 等 |
| `swift infer` | 本地推理：交互对话 / 批量跑数据集 |
| `swift deploy` | 部署成 OpenAI 兼容 API 服务（`/v1/chat/completions`） |
| `swift eval` | 跑标准 benchmark 评测（基于 EvalScope） |
| `swift export` | LoRA 合并、量化、推送 hub、Megatron 权重格式转换 |

### 3.1 自我认知微调：self-cognition 机制

最经典的入门场景——给模型「改名换姓」：

```bash
swift sft \
  --model Qwen/Qwen2.5-7B-Instruct \
  --dataset 'swift/self-cognition#500' \
  --model_name 小黄 'Xiao Huang' \
  --model_author 魔搭 ModelScope
```

注意 `--model_name` / `--model_author` **只有当数据集包含 `swift/self-cognition` 时才生效**。原理：该数据集是一堆身份问答（"你是谁？"→"我是 `{{NAME}}`，由 `{{AUTHOR}}` 训练……"），答案里是占位符模板，这两个参数唯一的作用就是填充占位符。数据集里没有占位符，参数自然空转——文档特意提醒，避免误以为传了参数就能凭空改变模型身份。

### 3.2 推理后端：自己没有引擎，四选一切换

`swift infer` / `swift deploy` 通过 `--infer_backend` 切换底层：

| 后端 | 底层 | 适用场景 |
|------|------|---------|
| `pt`（默认） | PyTorch + transformers 原生 `generate()` | 调试、验证微调效果；兼容所有模型，LoRA 不用合并直接加载 |
| `vllm` | vLLM | 高吞吐生产部署，PagedAttention，多 LoRA 服务 |
| `sglang` | SGLang | 高吞吐，RadixAttention 前缀缓存 |
| `lmdeploy` | LMDeploy（上海 AI Lab） | TurboMind 引擎，InternLM 系和多模态支持好 |

典型路径：训完 `--adapters output/checkpoint-xxx` 用 pt 后端交互式验证效果（比如问一句"你是谁"看 self-cognition 是否生效）→ 批量/生产切 vLLM（通常先 `--merge_lora true` 合并权重）。

### 3.3 export：默认本地，推 hub 是 opt-in

`swift export` **默认输出到本地** `--output_dir`，推送到 ModelScope/HuggingFace 需要显式 `--push_to_hub true` + `--hub_model_id` + `--hub_token`。注意隐私方向的默认值在**下载**侧：ms-swift 默认从 ModelScope 下载模型，要用 HuggingFace 源需设 `USE_HF=1`；但**上传永远是 opt-in**，微调产物不会被默认传上去。

## 4. 数据集格式要求

### 4.1 标准格式：messages 结构（jsonl 行式）

```json
{"messages": [
  {"role": "system", "content": "..."},
  {"role": "user", "content": "..."},
  {"role": "assistant", "content": "..."}
]}
```

硬性要求：

- role 只能是 `system` / `user` / `assistant` / `tool`；`system` 若有必须在第一条且只能一条
- user/assistant 需交替出现，多轮对话即多组 user→assistant
- SFT 时最后一条必须是 `assistant`（loss 的计算目标，前文只做 context 不算 loss）
- 预训练退化为只有一条 assistant 纯文本

兼容格式自动转换：Alpaca 格式（`instruction`/`input`/`output`）、query/response 格式均可直接用；字段名对不上用 `--columns '{"旧名": "标准名"}'` 重映射，不必改原始数据。

### 4.2 不同训练类型的附加列

| 训练类型 | 附加要求 |
|---------|---------|
| DPO/ORPO/SimPO | assistant 为 chosen，另加 `rejected_response` 列 |
| KTO | 加 `label: true/false` 列 |
| GRPO | messages 只需 user（无需标准答案）；**其余任意列原样透传给 reward 函数** |
| 序列分类 | `label` 列 |

### 4.3 多模态约定

```json
{"messages": [{"role": "user", "content": "<image>图中的仪表读数是多少？"}],
 "images": ["/data/imgs/001.jpg"]}
```

- content 里用 `<image>` / `<video>` / `<audio>` 占位标签，标签位置影响模型看到的 token 顺序
- **标签数必须与对应列表长度严格一致**，对不上直接报错
- 路径支持本地绝对路径（最稳）、相对路径、URL、base64；超大图用 `MAX_PIXELS` 等环境变量控制 token 上限
- LoRA 微调多模态模型时**默认只训 LLM 部分**，ViT/aligner 冻结，要一起训用 `--freeze_vit false`

### 4.4 GRPO 数据的关键理解：一条样本、两个消费方

GRPO（RLVR 范式）的数据流和 SFT 有本质区别：

```
每条样本 ──┬── messages（prompt）→ rollout 引擎（vLLM）→ 采样 K 个 completion（group）
           └── solution（ground truth）→ reward 函数 → 给 K 个 completion 各打一分
                                              ↓
                          组内归一化算 advantage → 更新策略
```

- prompt **从不**和 ground truth 拼在一起喂给模型；ground truth 也从不进模型输入——它只活在 reward 函数里
- SFT 里 ground truth 是 loss 的直接监督目标（token 级模仿）；GRPO 里它只是**评分依据**（结果级验证）
- `solution` 是 ms-swift GRPO 的**约定俗成列名**：内置 accuracy reward 就读这一列；自定义 reward 函数签名为 `reward_func(completions, solution, **kwargs)`，数据集里除 messages 外的所有列都以 kwargs 透传
- 若数据里带了 assistant 答案，GRPO 训练时会把最后一轮 assistant 删掉再用

**存储层面的注意**：虽然训练时"兵分两路"，但存储必须**行式对齐**——reward 打分时要知道这 K 个 completion 来自第 i 条 prompt、该用第 i 条的 solution 评。一个实际踩过的坑：同事用 pandas `df.to_json()` 导出数据，默认 `orient='columns'` 输出列式 JSON（`{列名: {行索引: 值}}`），这不是 GRPO 的设计要求，只是 pandas 的默认行为。ms-swift 要求的是行式 jsonl，转换一行代码：

```python
pd.read_json('columns.json').to_json('out.jsonl', orient='records', lines=True, force_ascii=False)
```

一个完整的多模态 GRPO 样本（视频理解场景）：

```json
{"messages": [{"role": "user", "content": "<video> You are an expert video analyzer. ..."}],
 "solution": "{\"english_detail\": \"A person stood at an open cabinet...\", \"scene_type\": \"indoor\"}",
 "videos": ["/data/videos/Charades/0A8ZT.mp4"],
 "task": "main"}
```

`solution`（结构化 ground truth 的 JSON 字符串）和 `task`（业务分组标记）都会透传给 reward 函数，由它解析打分、按 task 路由不同评分逻辑。跑起来就是：

```bash
swift rlhf --rlhf_type grpo \
  --model Qwen/Qwen2.5-VL-7B-Instruct \
  --dataset data.jsonl \
  --external_plugins your_reward.py \
  --reward_funcs your_reward_name
```

### 4.5 其他机制

- Agent 训练：加 `tools` 字段（OpenAI tools schema）
- 数据集采样：`--dataset 'xxx.jsonl#500'` 只取 500 条；多数据集可混本地文件和 hub id
- 验证集：`--split_dataset_ratio 0.01` 或显式 `--val_dataset`

## 5. 同类框架对比

一站式微调框架赛道的主要玩家（stars 为 2026-07 数据）：

| 框架 | Stars | 背景 | 特点 |
|------|-------|------|------|
| **ms-swift** | 14.8k | 阿里魔搭官方 | 模型覆盖最广（600+/400+），全链路闭环，Megatron 并行，国产模型 Day-0 |
| **LLaMA-Factory** | 73.2k | 个人发起（hiyouga），社区最火 | Web-UI（LlamaBoard）零代码训练，文档教程生态最丰富，上手门槛最低 |
| **Unsloth** | 68k | 创业公司 | 手写 Triton kernel，单卡 LoRA 快 2 倍省显存，面向单卡/Colab 场景 |
| **Axolotl** | — | 海外社区 | YAML 配置驱动，海外用户多，Llama 系生态 |
| **torchtune** | — | PyTorch 官方 | 纯 PyTorch 原生无抽象层，适合读底层，功能面窄 |

**ms-swift vs LLaMA-Factory 的典型取舍**：

- 国产模型/多模态跟进速度：ms-swift 通常最快
- 社区教程和易用性：LLaMA-Factory 占优
- 规模化训练：ms-swift 的 Megatron 后端（TP/PP/EP）能力更强
- 推理/部署闭环：ms-swift 的 infer/deploy/eval 链路更完整；LLaMA-Factory 偏重训练本身

**与 verl 不是一个赛道**：[verl](https://github.com/volcengine/verl)（22.4k）是 RL 训练系统（rollout-reward-update 循环、训推分离、HybridFlow 编排），而 ms-swift/LLaMA-Factory 虽有 GRPO/DPO 支持，核心定位仍是 SFT/LoRA 微调工具箱——ms-swift 的 GRPO rollout 可以挂外部 vLLM server，但规模和灵活性与 verl 不在一个量级。选型直觉：

- 轻量微调 + 顺带跑个 GRPO → ms-swift / LLaMA-Factory
- 认真做 agentic RL、大规模 RLVR → verl（详见 [[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]）

**与 prompt 优化也不是一个赛道**：如果目标是优化 prompt 而非权重（APO/DSPy/TextGrad 路线），数据准备方向正好相反——prompt 模板要**从样本中剥离**出来作为优化对象，jsonl 每行只留变量输入 + ground truth，由 agent 代码运行时组装。而 ms-swift 的格式要求模板**渲染进** user content。详见 [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]。

## 6. 小结

- ms-swift = 魔搭官方的「模型工具箱」：一套 CLI 覆盖训练到部署全链路，底层全是成熟组件的封装
- 最大优势是**国产模型 Day-0 支持 + 全链路闭环 + Megatron 规模化**；最大对手 LLaMA-Factory 赢在社区和易用性
- 数据格式核心是 messages 结构 jsonl；GRPO 场景记住「prompt 走 rollout、solution 透传 reward、行式对齐配对」这条主线
- 它与 verl（RL 系统）、APO/DSPy（prompt 优化）分属三个赛道，按「改权重的规模」和「改 prompt 还是改权重」两个维度选型

## 参考

- [modelscope/ms-swift](https://github.com/modelscope/ms-swift)
- [ms-swift 官方文档](https://swift.readthedocs.io/)
- [MS-SWIFT — Qwen 官方训练文档](https://qwen.readthedocs.io/en/latest/training/ms_swift.html)
- 关联文章：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]、[[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]]
