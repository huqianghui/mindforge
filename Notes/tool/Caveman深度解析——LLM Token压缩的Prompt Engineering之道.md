---
title: "Caveman 深度解析——LLM Token 压缩的 Prompt Engineering 之道"
created: 2026-04-30
tags:
  - caveman
  - token-optimization
  - prompt-engineering
  - claude-code
  - LLM
  - harness-engineering
  - skill
---

# Caveman 深度解析——LLM Token 压缩的 Prompt Engineering 之道

> Caveman 是一个面向 40+ AI 编程代理的对话压缩技能插件。它的核心思想出人意料地简单：不是用代码过滤输出文本，而是通过精心设计的系统提示规则，让 LLM 在同一次推理中直接生成简洁回复。本文深入剖析其实现机制、工程架构、学术背景与适用边界。

---

## 一、Caveman 是什么

[Caveman](https://github.com/JuliusBrussee/caveman) 是一个 token 优化技能（Skill），支持 Claude Code、Codex、Gemini CLI、Cursor、Windsurf 等 40+ 种 AI 编程助理。其核心目标是**削减 LLM 对话的 token 消耗**，在不牺牲技术准确性的前提下降低成本。

### 1.1 两层压缩体系

Caveman 的 token 节省来自两个独立层面：

| 层面 | 作用对象 | 机制 | 节省幅度 |
|------|---------|------|---------|
| **输出压缩**（核心） | LLM 生成的回复 | 系统提示规则注入，约束 LLM 输出风格 | 平均 65%（范围 22%–87%） |
| **输入压缩**（caveman-compress） | 持久记忆文件（如 CLAUDE.md） | 本地 Python 脚本 + Claude API 重写文件 | 平均 46% |

### 1.2 核心设计理念

Caveman 的名字本身就是设计隐喻——像一个聪明的原始人那样说话：只说关键信息，去掉一切修饰。这不是"让 AI 变笨"，而是"让 AI 不啰嗦"。

关键区分：
- **不是**后处理过滤器（不存在对 LLM 输出的二次改写）
- **不是**额外 API 调用（输出压缩在同一次推理中完成）
- **是**一种精心设计的 Prompt Engineering 技巧，利用 LLM 的指令遵循能力

---

## 二、输出压缩：LLM 行为约束而非代码删词

这是理解 Caveman 最关键的认知跳跃：**"删除冠词、填充词"这些动作，不是由 Python 代码逐词扫描实现的，而是 LLM 在生成阶段自主完成的。**

### 2.1 SKILL.md 规则原文

Caveman 的行为定义全部写在 SKILL.md 中，以自然语言告诉模型如何压缩：

```
"Respond terse like smart caveman. All technical substance stay. Only fluff die."

"Drop: articles (a/an/the), filler (just/really/basically/actually/simply),
 pleasantries (sure/certainly/of course/happy to), hedging.
 Fragments OK. Short synonyms (big not extensive, fix not 'implement a solution for').
 Technical terms exact. Code blocks unchanged. Errors quoted exact."

"Pattern: [thing] [action] [reason]. [next step]."

"ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.
 Still active if unsure. Off only: 'stop caveman' / 'normal mode'."
```

### 2.2 关键澄清：词库不是固定词典

规则中列举的 `a/an/the`、`just/really/basically` 等词是**给 LLM 的示例**，而非程序内置的停用词表。技术要点：

- **不存在** Python/JS 函数在 runtime 扫描模型输出并做字符串替换
- 列举的词是方向性示例，LLM 的语言理解能力负责**泛化**——遇到规则未显式提及但同样冗余的措辞（如 "perhaps"、"it appears that"），模型理解这属于"hedging"范畴，也会省略
- 同义词替换同理：规则仅给出 "big not extensive, fix not 'implement a solution for'" 等示例，模型据此在生成时倾向用短词代替长词，但不存在查表机制

换言之，规则像一份风格指南而非过滤器配置。

### 2.3 六档压缩级别

| 级别 | 压缩特征 | 示例（React 重渲染问题） |
|------|---------|------------------------|
| Lite | 删填充词/犹疑措辞，保留冠词和完整句式 | "Your component re-renders because you create a new object reference each render." |
| **Full**（默认） | 删冠词，允许片段句，使用短同义词 | "New object ref each render. Inline object prop = new ref = re-render. Wrap in useMemo." |
| Ultra | 极致缩写（DB/auth/config/req/res/fn/impl），删连词，箭头表因果 | "Inline obj prop → new ref → re-render. useMemo." |
| Wenyan-Lite | 半文言，保留语法结构，去除填充 | 保留现代语法骨架的半古典表达 |
| Wenyan-Full | 全文言文，80-90% 字符减少 | "物出新参照，致重绘。useMemo Wrap 之。" |
| Wenyan-Ultra | 文言极致缩写 | 极限压缩的古典中文 |

文言文模式的设计理由：文言文是人类历史上信息密度最高的文字系统之一，同样意思用字最少，且中文每个字的 token 数量也比英文少。

### 2.4 正反示例

SKILL.md 中提供了明确的正反对比，给 LLM 一个风格锚点：

```
Not: "Sure! I'd be happy to help you with that. The reason your component
      is re-rendering is likely because you're creating a new object
      reference each render cycle..."

Yes: "Bug in auth middleware. Token expiry check use < not <=. Fix:"
```

### 2.5 严格保护区域

即使在 Ultra 模式下，以下内容**原样保留**不压缩：
- 代码块（Code blocks unchanged）
- 错误信息（Errors quoted exact）
- 技术术语（Technical terms exact）
- 提交/PR 内容（正常格式）
- URL、文件路径、版本号

---

## 三、Hook 三组件架构——自动持久化的工程实现

Caveman 在 Claude Code 平台上通过三个 Hook 脚本实现自动化：

### 3.1 caveman-activate.js（SessionStart Hook）

每次 Claude Code 会话启动时运行一次，承担三项职责：

1. **写入模式标志**：将当前激活模式（默认 "full"）写入 `$CLAUDE_CONFIG_DIR/.caveman-active` 文件。写操作通过 `safeWriteFlag()` 函数完成——拒绝对符号链接目标写入，使用原子性 temp+rename 方式，文件权限 0600，防止本地攻击者替换
2. **将 Caveman 规则集输出为系统上下文**：Hook 将 SKILL.md 规则文本输出到 stdout，Claude Code 将其作为系统消息注入模型。用户不可见此注入，但模型从会话第一条消息起就遵循规则
3. **检查状态栏配置**：若未配置自定义 statusLine，首次交互时提示用户设置状态栏徽章

### 3.2 caveman-mode-tracker.js（UserPromptSubmit Hook）

每次用户提交问题时运行，处理三件事：

1. **斜杠指令处理**：如果用户输入以 `/caveman` 开头，将对应模式写入标志文件。支持全部压缩级别及特殊模式（如 `/caveman-commit`、`/caveman-review`）
2. **自然语言激活/停用**：匹配 "activate caveman"、"less tokens please" 等短语激活；匹配 "stop caveman"、"normal mode" 停用（删除标志文件）
3. **每轮强化（Per-Turn Reinforcement）**：当标志文件标记为持久模式时，输出一小段 `hookSpecificOutput` JSON 提醒，让模型在本轮继续维持 Caveman 风格

### 3.3 caveman-statusline.sh（状态栏徽章）

读取标志文件并输出有色徽章：`[CAVEMAN]`（Full 模式）或 `[CAVEMAN:ULTRA]` 等。

### 3.4 完整单轮调用链

```
用户打开新会话:
  → SessionStart Hook (caveman-activate.js)
    ① 初始化 .caveman-active = "full"
    ② SKILL.md 规则 → stdout → 系统消息注入
  → 模型上下文已包含 Caveman 规则

用户提问: "Why is my React component re-rendering?"
  → UserPrompt Hook (caveman-mode-tracker.js)
    ① 检查输入 → 非 /caveman 指令
    ② 读取 .caveman-active → "full" → 输出 hookSpecificOutput 强化
  → 用户原始问题 + 强化提示一并传入模型

模型接收的完整上下文:
  [System]  Caveman 规则（SessionStart 注入）
  [Hook]    hookSpecificOutput（每轮强化）
  [User]    "Why is my React component re-rendering?"

模型生成回答:
  遵循规则，直接输出:
  "New object ref each render. Inline object prop = new ref = re-render.
   Wrap in useMemo."

Claude Code 显示模型输出:
  → 无任何后续代码级剪辑
  → 用户看到的就是模型按规则生成的原始回复
```

**关键结论**：Caveman **没有 Output Hook**。模型输出直接呈现给用户，整个压缩在模型的一次推理中完成。不存在对回答的二次处理。

---

## 四、caveman-compress——文件压缩的 LLM + 脚本协同

与输出压缩不同，`caveman-compress` **会**发起独立的 LLM API 调用来压缩记忆文件。

### 4.1 为什么需要文件压缩

Claude Code 等 AI 助手在每次新会话开始时都会加载 `CLAUDE.md` 等项目记忆文件作为上下文。一个 1000-token 的项目记忆文件，经过 100 次会话累计消耗 100,000 token。压缩约 46% 意味着长期节省 46,000 token。

### 4.2 执行流程

```
用户触发: /caveman:compress CLAUDE.md
  │
  ▼
Python 脚本安全检查
  ├─ 路径是否包含 .ssh/.aws/.gnupg/.kube/.docker？
  ├─ 文件名是否含 secret/credential/password/token？
  └─ 命中 → 拒绝: "Refusing to compress: filename looks sensitive"
  │
  ▼
构造压缩 Prompt (build_compress_prompt)
  ├─ 严格保护: 代码块、URL、文件路径、命令、标题、日期、版本号
  └─ 仅对散文性描述做 Caveman 风格重写
  │
  ▼
调用 Claude API (call_claude)
  → 返回压缩文本
  │
  ▼
验证 (validate.py)
  ├─ 检查 Markdown 结构完整性（标题/代码块/URL/路径）
  ├─ 通过 → 写入文件
  └─ 失败 → build_fix_prompt → 再次调用 Claude API（最多重试 2 次）
  │
  ▼
写入结果:
  CLAUDE.md          ← 压缩版（LLM 每次会话读取）
  CLAUDE.original.md ← 完整备份（用户查看和编辑用）
```

### 4.3 基准数据

| 文件 | 原始 token 数 | 压缩后 token 数 | 节省比例 |
|------|-------------|---------------|---------|
| claude-md-preferences.md | 706 | 285 | 59.6% |
| project-notes.md | 1145 | 535 | 53.3% |
| claude-md-project.md | 1122 | 636 | 43.3% |
| todo-list.md | 627 | 388 | 38.1% |
| mixed-with-code.md | 888 | 560 | 36.9% |
| **平均** | **898** | **481** | **46%** |

### 4.4 关键区分：为什么文件压缩长期受益，对话压缩需每次注入？

- **文件压缩**改变了持久存储的数据——记忆文件内容被永久替换为精简版本，后续所有会话天然继承优化
- **对话输出压缩**涉及动态生成内容——LLM 每次回答如果没有规则约束就会恢复冗长风格。对话没有全局"状态文件"能让 LLM 自动记住"以后都简洁"，因此只能在每个会话的上下文中靠 Hook 不断注入规则

---

## 五、跨会话持久化机制

每个新会话都是全新的 LLM 上下文，之前注入的规则不会自动延续。Caveman 通过三个机制解决：

### 5.1 三步持久化

1. **持久记忆文件压缩**（一次执行，长期受益）：`/caveman:compress` 将 CLAUDE.md 永久替换为压缩版
2. **SessionStart Hook 自动激活**：每次会话启动时 `caveman-activate.js` 自动注入规则
3. **模式状态文件**：`.caveman-active` 记录当前压缩等级（full/ultra/lite 等），跨会话保持用户选择

### 5.2 跨会话时序图

```
会话 N（首次配置）:
  1. 安装 Caveman
  2. /caveman:compress CLAUDE.md → 生成压缩版
  3. /caveman ultra → .caveman-active 写入 "ultra"
  4. 正常开发，所有回复为 Ultra 模式

────── 会话结束 ──────

会话 N+1（无需操作）:
  1. Claude Code 启动 → SessionStart Hook 注入规则
  2. 加载 CLAUDE.md（已是压缩版，节省 ~46% 输入 token）
  3. 读取 .caveman-active → 恢复 Ultra 模式
  4. 所有回复自动为 Ultra 模式

────── 用户修改了 CLAUDE.original.md ──────

会话 N+2:
  1. 自动激活同上
  2. 用户运行 /caveman:compress CLAUDE.md → 重新压缩
  3. 继续使用
```

### 5.3 不同平台的自动激活方式

| 平台 | 自动激活机制 |
|------|------------|
| Claude Code | SessionStart hooks（最完整支持） |
| Codex | .codex/hooks.json 配置文件 |
| Gemini CLI | context files（上下文文件） |
| Cursor/Windsurf/Cline/Copilot | 需手动添加 always-on 规则到系统提示 |

---

## 六、学术背书——Brevity Constraints 论文的启示与局限

arXiv:2604.00025（[Brevity Constraints Reverse Performance Hierarchies in Language Models](../paper/2026-04-29-Brevity-Constraints-Reverse-Performance-Hierarchies.md)）为 Caveman 提供了学术支撑，但同时也揭示了其适用边界。

### 6.1 核心发现

论文揭示了反直觉现象：**在 inverse scaling 任务上，大模型施加简洁约束后性能显著提升（+26.3pp），逆转了原有的性能层级。**

| 条件 | 大模型准确率 | 小模型准确率 |
|------|------------|------------|
| Control（无约束） | 40.2% | 84.4% |
| Brief（简洁约束） | 66.5% | 81.3% |
| Direct（仅答案） | 74.5% | 82.3% |

机制解释：大模型在无约束下倾向生成冗长推理过程，而在 inverse scaling 任务中这种冗长推理引入更多错误路径（sycophancy、pattern matching）。简洁约束强制跳过有害推理，直接利用知识储备。

### 6.2 关键局限：仅适用于 ~7.7% 的问题

**这是使用 Caveman 时必须理解的边界**：

- 论文实验仅覆盖 Inverse Scaling Prize 中的任务（约占总任务量的 7.7%）
- 论文将问题分为 non-discriminative（27.1%）、normal scaling（48.1%）、inverse scaling（7.7%），准确率提升仅在 inverse scaling 问题上显著
- 对于需要深度推理的任务（竞赛数学、复杂代码、多步逻辑），简洁约束可能**严重损害性能**

### 6.3 与 Reasoning Model 范式的根本矛盾

| | 简洁约束有效 | 长推理有效 |
|---|---|---|
| 问题特征 | 解空间小、答案直接可达 | 解空间大、需多步搜索 |
| 失败模式 | "想太多"引入错误路径 | "想太少"找不到解 |
| 典型例子 | sycophancy、pattern matching 类陷阱题 | 竞赛数学、代码生成、多步推理 |
| 代表方法 | Caveman, Brevity constraint | CoT, DeepSeek-R1, o1, ToT |

### 6.4 未解问题

论文**没有**给出自动判断"一个问题该用简洁约束还是深度推理"的方法。其 Problem-Aware Routing 仅停留在概念层面，分类依赖事后统计，无法在推理前判断。ICLR 2026 的 [RADAR](https://openreview.net/forum?id=CB6Ds5T4ae) 论文给出了一种基于 Item Response Theory 的方案，但距离工程落地仍有距离。

---

## 七、Caveman 如何保证质量——Auto-Clarity 与持续性三重防线

### 7.1 Auto-Clarity 安全阀

Caveman 并非一味追求极致压缩。内置 auto-clarity 机制在以下场景自动暂停简化模式，恢复详细回复：

- **安全警告**：涉及危险操作时
- **不可逆操作确认**：需要用户明确确认的关键步骤
- **多步骤序列**：怕顺序搞混导致错误
- **用户显露疑惑**：检测到用户可能不理解当前回答时

但需注意：Auto-Clarity 的退出判断也依赖 LLM 自身——何时退出、何时恢复仍由模型自主判断，不存在确定性触发器。

### 7.2 持续性三重防线

Caveman 通过三层工程机制防止 LLM 在长对话中"回退"到冗长风格：

**第一层：规则文本中的持续性声明**
SKILL.md 明确写入 "ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift."。模型在上下文中持续看到这条指令会努力遵守。

**第二层：Per-Turn Reinforcement（每轮强化）**
UserPrompt Hook 在每次用户提问时输出 `hookSpecificOutput` JSON，将 Caveman 模式提示"刷新"到模型最近可见的上下文中。即使 SessionStart 注入的完整规则因上下文过长而被裁剪，per-turn 短提示始终位于对话最近端。

**第三层：状态文件持久化**
`.caveman-active` 文件跨轮次、跨 Hook 通信，只要该文件存在且内容不为空，UserPrompt Hook 就持续发出强化提示。

### 7.3 独立测试揭示的真实效果

来自 DEV Community 的 Kuba Guzik 独立基准测试发现：

- 在**已经要求 "Be concise"** 且输出为结构化 JSON 的基线条件下，Caveman 的实际节省仅为 **13%–21%**（而非官方宣传的 75%）
- 完整技能规则占 **552 tokens** 系统上下文开销
- 精简版规则（仅 85 tokens）在 Claude Opus 上节省 21%，反而优于完整版的 9%
- 好消息：全部 72 次运行中模型返回了 100% 的正确事实，无数据点丢失

**启示**：官方 75% 的节省数据基于"无任何简洁指令"的基线。在实际开发工作流中（已有各种简洁要求），Caveman 的边际收益会显著下降。

### 7.4 风险与失败模式

| 风险场景 | 原因 | 缓解措施 |
|---------|------|---------|
| 不支持 Hook 的平台 | 无 SessionStart/UserPrompt Hook | 需手动配置 always-on 规则 |
| 多轮对话后风格回退 | LLM 指令遵循能力在超长上下文中衰减 | Per-turn reinforcement 缓解 |
| 其他插件竞争性指令 | 同会话中其他插件要求详尽解释 | Per-turn reinforcement + "No filler drift" |
| Ultra 模式解释不足 | 省略推理过程和前提条件 | Auto-Clarity 部分缓解；对新领域问题慎用 |
| 规则自身消耗 token | 完整技能占 552 tokens | 短对话中考虑用精简版规则 |

---

## 八、总结与适用场景

### 8.1 Caveman 的本质

Caveman 是一种**精心工程化的 Prompt Engineering 方案**，其创新不在于算法复杂度，而在于：

1. **人设 + 结构化规则 > 简单的"请简洁回答"**——给 LLM 一个具体的行为模板比泛泛要求简洁效果好得多
2. **Hook 系统实现了 Prompt Engineering 的持久化**——让一次性的 prompt 优化变成跨会话的自动化能力
3. **文件压缩解决了输入侧的长期开销**——一次压缩，多次受益

### 8.2 适用场景

| 场景 | 推荐度 | 理由 |
|------|--------|------|
| 代码问答 / Bug 分析 | 高 | 输出多为解释性文字，压缩空间大 |
| PR 审查 / Commit 生成 | 高 | 有专门子技能 caveman-review / caveman-commit |
| 长期项目频繁新建会话 | 高 | caveman-compress 持续节省记忆文件 token |
| 中文开发环境 | 高 | 文言文模式进一步提升压缩效率 |
| 已有简洁指令的结构化数据任务 | 低 | 边际收益 13%–21%，但规则自身占 552 tokens |
| 教学 / 文档撰写 | 不适合 | 需要详尽解释，Auto-Clarity 频繁退出 |
| 复杂推理任务 | 不适合 | 可能损害推理性能（参见 Brevity Constraints 论文局限性） |

### 8.3 一句话总结

**Caveman 证明了 Prompt Engineering 可以被工程化为一个持久、可配置、跨平台的系统级能力。** 它不只是一个"让 AI 说话短一点"的技巧，而是一个完整的对话压缩 Harness——从规则设计、Hook 持久化、文件压缩到安全阀机制，构成了一套系统性的 token 优化方案。但使用者需要理解其学术边界：简洁约束不是万能药，在需要深度推理的场景下应当关闭。
