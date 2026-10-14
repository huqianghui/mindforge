---
title: Harness 实践：从 Memory 失效到记忆治理
created: 2026-04-17
tags:
  - AI
  - claude-code
  - harness
  - harness-engineering
  - memory
  - practice-case
---

# Harness 实践：从 Memory 失效到记忆治理

> 一个真实的 Harness 工程小故事：一条明确写在 Memory 中的规则被完全忽略，由此暴露了 Claude Code 记忆系统的 **framing 层级差异**，最终推导出一套完整的记忆治理方案。

---

## 事件：一条被忽略的 Memory 规则

### 场景

用户给出一个 ChatGPT 分享链接，要求提取对话内容来写文章。

### Memory 中的规则

Auto Memory 里明确记录了一条用户反馈：

> "认证网页（chatgpt.com、docs.google.com、NotebookLM 等）必须用 Playwright 访问，**不要先试 WebFetch**"

这条规则在对话开始时就已经加载到了 system prompt 中。

### 实际行为

Claude 的操作顺序：
1. 先用 `tavily_extract` → 失败
2. 再用 `WebFetch` → 失败（只拿到登录页）
3. 最后才用 Playwright → 成功

**两次无效尝试，浪费了时间，违反了用户明确给出的反馈。**

---

## 诊断：为什么"加载了"还是"不管用"？

### 初始假设

- Memory 没有加载？→ **排除**：MEMORY.md 确认已在 context 中
- 语义表达不清楚？→ **排除**：规则写得很明确——"必须用 Playwright，不要先试 WebFetch"
- 模型能力不足？→ **排除**：规则在 CLAUDE.md 中时，模型可以100%遵守

### 真正根因：Framing 效应

Claude Code 在注入不同来源的内容时，使用了**不同强度的系统指令**：

| 来源 | 系统指令 Framing | 模型感知的优先级 |
|------|----------------|---------------|
| **CLAUDE.md** | "project instructions... **MUST follow** exactly as written, **OVERRIDE** any default behavior" | 命令式——必须执行 |
| **Memory** | "user's auto-memory... **may or may not be relevant**... should not respond **unless highly relevant**" | 参考式——酌情采纳 |

**结论**：Memory 的系统 framing 把它定义成了"可选参考"，而不是"必须遵守的规则"。当 Memory 中的规则与模型的默认行为模式（先用轻量工具，失败后用重工具）冲突时，**默认行为胜出**。

这不是 bug，而是 **层级错配**——一条需要 L2（强提示）约束力的行为规则，被放在了 L3（弱提示）的位置。

---

## 洞察：Memory 中的两类信息

这个事件揭示了一个关键区分：Memory 中存储的信息不是同质的。

| 类型 | 特征 | 例子 | 需要的约束力 | Memory 能提供的 |
|------|------|------|------------|---------------|
| **行为规则** | "遇到 X 必须做 Y" | "认证 URL 用 Playwright" | 强——必须执行 | 弱——"可能相关" |
| **背景知识** | "X 是什么/谁是谁" | "用户是 AI 工程师" | 弱——了解即可 | 足够——提供上下文 |

**Memory 适合存储背景知识，不适合存储行为规则。**

这也解释了为什么有些 Memory 条目"一直好使"（背景知识类——不需要强约束），而有些"有时失效"（行为规则类——需要强约束但得不到）。

---

## 解法：三步治理方案

### Step 1：即时修复——把行为规则提权到 CLAUDE.md

将"认证 URL 用 Playwright"这条规则从 Memory 提权到 CLAUDE.md 的 Tools section：

```markdown
- **URL 路由**：认证网站（chatgpt.com、docs.google.com 等）必须直接用 Playwright，
  禁止先试 WebFetch/tavily。详见 `.claude/rules/url-routing.md`
```

**效果**：规则获得了 "MUST follow, OVERRIDE default behavior" 的 framing，约束力从 ~60% 提升到 ~90%。

### Step 2：系统化——建立 Memory Promotion Protocol

在 `.claude/rules/memory-promotion.md` 中定义三级约束强度和提权规则：

```
L1 确定性（Hook）  → 100% 强制  → 安全/绝对禁止类规则
L2 强提示（CLAUDE.md/Rules）→ ~90% 遵守 → 行为规则（"必须/禁止"）
L3 弱提示（Memory）→ ~60% 遵守 → 背景知识、首次观察
```

**提权触发条件**：
- 用户反馈含"必须/禁止/不要" → 评估提权到 L2
- Memory 规则被违反过一次 → 立即提权到 L2
- L2 规则被违反 → 评估是否需要 L1 Hook

### Step 3：可持续——创建 /memory-review Skill

创建一个可随时触发的审查流程（`.claude/skills/memory-review/`），执行：

1. 读取所有 Memory 条目 + CLAUDE.md + Rules
2. 逐条审计：类型错配？已重复？已过时？
3. 生成审计报告（提权/更新/删除建议）
4. 用户确认后执行修改

同时解决 CLAUDE.md 膨胀问题——详细规则分流到 `.claude/rules/`，CLAUDE.md 只保留摘要引用：

```
CLAUDE.md（~100 行，精简摘要）
  └── 引用 → .claude/rules/（详细规则，启动加载，压缩后重注入）

Memory（背景知识）
  └── 定期 /memory-review 审查健康度
```

---

## 最终架构

```
┌─────────────────────────────────────────────────────┐
│  L1 Hook（确定性，100%）                             │
│  └── personal-journal 禁访等安全规则                  │
├─────────────────────────────────────────────────────┤
│  L2 CLAUDE.md + Rules（强提示，~90%）                │
│  ├── CLAUDE.md：核心摘要（~100 行）                   │
│  └── .claude/rules/：详细行为规则                     │
│       ├── url-routing.md（URL 访问路由）              │
│       └── memory-promotion.md（提权协议）             │
├─────────────────────────────────────────────────────┤
│  L3 Memory（弱提示，~60%）                           │
│  ├── 用户画像（背景知识）                             │
│  ├── 项目上下文（背景知识）                           │
│  └── 首次观察的偏好（待验证后提权）                    │
├─────────────────────────────────────────────────────┤
│  治理层                                              │
│  └── /memory-review skill（定期审查 + 提权建议）      │
└─────────────────────────────────────────────────────┘
```

---

## 这件事本身就是 Harness 工程

回看整个过程，它完美展示了 [系列 07](Claude-Code系列07：Harness分层架构.md) 中讨论的三层控制系统：

| 控制层 | 在这个案例中 |
|--------|-----------|
| **Execution**（执行） | Playwright / WebFetch / tavily——工具本身都能用 |
| **Constraint**（约束） | "哪个 URL 用哪个工具"——规则存在但约束力不够 |
| **Cognition**（认知） | 从失败中学到"行为规则不能放在 Memory"——系统进化 |

以及评估框架的三个元问题：

1. **它在控制 AI 的哪一部分？** → 这次是约束层的问题
2. **它有没有 Feedback Loop？** → 有——用户发现问题 → 诊断 → 建立机制 → 防止复发
3. **它能不能收敛？** → 能——通过提权协议和定期 review，同类问题不会再发生

**Harness 工程不是一次性设计，而是一个持续进化的闭环。** 每次 AI 行为偏离预期，都是改进约束系统的机会。好的 Harness 不是"一开始就完美"，而是"每次失败都让系统变得更稳定"。

---

## 延伸阅读

- [Claude Code 系列 05：记忆全景](Claude-Code系列05：六层记忆体系.md)——六层持久化体系 + Framing 效应分析
- [Claude Code 系列 07：Harness 分层架构](Claude-Code系列07：Harness分层架构.md)——三层控制系统模型
- [Vibe Coding 系列 01：Harness Engineering 的来龙去脉](../vibe-coding/Vibe-Coding系列01：Harness-Engineering的来龙去脉.md)——Harness 概念的完整梳理
