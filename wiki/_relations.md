---
title: "Wiki 关系类型定义"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - meta
  - relations
---

# Wiki 关系类型定义

> 此文件是 wiki 页面间关联类型的**单一信源**。所有模板、Agent、命令引用此处定义。
>
> 格式：`- [[page]] — \`relation-type\` 描述`

---

## 关系类型一览

| 类型 | 中文 | 含义 | 典型方向 |
|------|------|------|----------|
| `implements` | 实现 | A 是 B 的具体实施 | method → concept, method → decision |
| `grounds` | 理论基础 | A 为 B 提供理论支撑 | concept → concept, concept → decision |
| `extends` | 扩展 | A 在 B 基础上扩展或细化 | concept → concept |
| `constrains` | 约束 | A 限制了 B 的选择空间 | concept → decision, concept → method |
| `contrasts` | 对比 | A 和 B 是替代方案或对立概念 | concept ↔ concept |
| `part-of` | 组成 | A 是 B 的组成部分 | concept → concept |
| `uses` | 使用 | A 依赖或使用 B 作为工具/组件 | method → concept, method → tool |
| `produces` | 产出 | A 的结论/决策产出了 B | decision → method, decision → concept |
| `addresses` | 解决 | A 解决/缓解 B 这个问题 | concept → concept, method → concept, decision → concept |

---

## 方向性约定（重要）

一行关联 `- [[B]] — \`type\` 描述` 表示一条**有向边** `当前页(A) → B`，A 是 source、B 是 target。

**除 `contrasts` 外，其余 8 种关系都是有向的、不对称的**（"A 扩展 B" ≠ "B 扩展 A"）。因此：

1. **有向关系只在 source 侧声明一次**——按「典型方向」判定谁是 source（如 `extends` 里"更细化/派生的一方"是 source，`part-of` 里"部分"是 source，`grounds` 里"理论根基"是 source，`uses` 里"使用方"是 source，`addresses` 里"解决方案"是 source）。**禁止**在 target 页再镜像声明一条同类型反向行——那会在图谱里生成两条矛盾的反向边。
2. **`contrasts` 是唯一双向对称类型**，可以（也建议）在两侧各声明一次，方向无所谓。
3. **可视化如何显示反向**：图谱前端在 target 页的「入边」区自动以 `source —[类型]→` 的形式展示这条边（来源节点在前、箭头指向本页），无需在 target 页写反向行。
4. **需要在 target 页表达关联**时，靠入边自动展示即可；确需在 target 页正向声明，则改用语义方向正确的另一类型（如 A `uses` B，则 B 页不重复写 `uses`）。

判断 source 的速记：读「典型方向」列，箭头**起点**那一侧就是应当声明该行的页面。

---

## 详细说明与示例

### `implements` — 实现

A 将 B 的抽象概念转化为可执行的步骤或方案。

```markdown
## 关联概念（在方法页中）
- [[code-reuse-in-agent-era]] — `implements` 此方法实现了该概念的四层防线策略
```

**判断标准**：如果删除 A，B 的概念定义不变，但失去了"怎么做"的指导。

---

### `grounds` — 理论基础

A 是 B 存在的理论依据或认知前提。

```markdown
## 关联概念（在决策页中）
- [[llm-wiki]] — `grounds` LLM Wiki 模型是此决策的理论基础
```

**判断标准**：如果 A 被推翻，B 的合理性需要重新评估。

---

### `extends` — 扩展

A 在 B 的基础上增加了新的维度、适用范围或深度。

```markdown
## 关联概念（在概念页中）
- [[harness-engineering]] — `extends` Context Engineering 是 Harness Engineering 的子集扩展
```

**判断标准**：A 包含 B 的核心内容，但比 B 范围更广或更深。

---

### `constrains` — 约束

A 限制了 B 的可行选项或设计空间。

```markdown
## 关联概念（在决策页中）
- [[context-explosion]] — `constrains` Context 爆炸限制了框架选型的可行方案
```

**判断标准**：A 的存在让 B 不得不排除某些选项。

---

### `contrasts` — 对比

A 和 B 解决同类问题但采用不同路径，是替代方案或对立观点。

```markdown
## 关联概念（在决策页中）
- [[rag-architecture-comparison]] — `contrasts` RAG 与 LLM Wiki 的架构对比
```

**判断标准**：在某个场景下，你需要在 A 和 B 之间二选一。方向是双向的。

---

### `part-of` — 组成

A 是 B 的一个组件、阶段或子系统。

```markdown
## 关联概念（在概念页中）
- [[speech-technology-stack]] — `part-of` VAD 是语音技术栈的组成部分
```

**判断标准**：A 不能脱离 B 的上下文独立存在（或独立意义有限）。

---

### `uses` — 使用

A 在执行过程中使用 B 作为工具、框架或依赖组件。

```markdown
## 关联概念（在方法页中）
- [[testcontainers]] — `uses` Step 4 集成测试使用 Testcontainers
```

**判断标准**：B 可以被替换为同类工具而不改变 A 的核心逻辑。

---

### `produces` — 产出

A 的决策或流程产出了 B 作为结果。

```markdown
## 关联方法（在决策页中）
- [[voice-cascaded-pipeline]] — `produces` 基于此决策的实施方法
```

**判断标准**：B 的存在直接源于 A 的结论。如果 A 被推翻，B 需要重新评估。

---

### `addresses` — 解决

A 是针对问题 B 的解决方案或缓解手段。方向是**方案 → 问题**。

```markdown
## 关联概念（在概念页中）
- [[context-explosion]] — `addresses` 上下文投影是解决 Context 爆炸的核心机制
```

**判断标准**：B 是一个**问题/痛点/失效**，A 的存在意义就是消解 B。注意与 `constrains` 区分——`constrains` 是"问题限制方案的选择空间"（方向 问题→方案，负向），`addresses` 是"方案化解问题"（方向 方案→问题，正向），两者方向和语义都相反。

---

## 扩展指南

需要新增关系类型时：

1. 确认现有 9 种类型无法表达该关系
2. 在本文件的「关系类型一览」表格中添加新行
3. 在「详细说明与示例」中补充定义、示例和判断标准
4. 更新 `.claude/agents/knowledge-extractor.md` 中的关系类型表
5. 通知 `/evolve-wiki` 在下次维护时应用新类型

**命名规则**：小写英文、用连字符连接（如 `part-of`）、不超过 2 个单词。
