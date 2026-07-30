---
title: 与AI相处之道——从工具依赖到认知伙伴
created: 2026-05-08
tags:
  - AI
  - reflection
  - cognition
  - career
  - knowledge-management
---

# 与AI相处之道——从工具依赖到认知伙伴

## 核心观点

> "I think right now we're bifurcating into two types of people that use AI — people who use AI so they don't have to learn anything and people who use AI so they can learn everything."
> — Mark Cuban, [Big Technology Podcast](https://www.youtube.com/watch?v=CEz9RRg0FfI)（2026-05）

**不要怕 AI 替代你。怕的是你自己停了下来。**

AI 时代的分水岭不在于"会不会用 AI"，而在于"怎么用 AI"——是用它逃避思考，还是用它加速思考。Cuban 把这种区分说得非常直白：AI 可以是你的"drunk intern"——帮你干活但你什么也学不到；也可以是你的认知加速器——让好奇心有了无限带宽。

## 两种用 AI 的人

| 维度 | 用 AI 偷懒（drunk intern） | 用 AI 学习（cognitive amplifier） |
|------|-----------|-----------|
| 行为模式 | 复制题目 → AI 吐答案 → 粘贴交差 | "教我彻底搞懂这个行业" |
| Cuban 原话 | "just so you don't have to do the work" | "curious and just want to keep on learning more" |
| 认知影响 | 逃避思考，思维肌肉萎缩 | 加速思考，认知密度提升 |
| 长期结果 | 完蛋——离开 AI 什么都不会 | 永远不失业——AI 是杠杆而非拐杖 |

关键区别在于**主体性**：前者把自己变成 AI 的管道（input → output 的搬运工），后者把 AI 变成自己的放大器（思考 → AI 辅助 → 更深的思考）。

Vivienne Ming（Possibility Institute 首席科学家）进一步警告：大多数人正在滑向前者——依赖 AI 替代思考，导致长期**认知退化（cognitive decline）**。Rebecca Hinds 称之为**"专业幻觉"（illusion of expertise）**：AI 让你感觉更能干，但底层能力却在流失。

## 三类人在 AI 浪潮中的命运

Cuban 的判断清晰直接：

> "If all you're doing is reformatting, or you're answering a question yes or no, there's a good chance you're going to be replaced by AI."

**会被替代的**：
- 工作本质是"把信息从 A 格搬到 B 格"
- 做简单 yes/no 判断的岗位
- 没有不可替代的判断力、创造力或关系网络

**批判性思维者（缓冲层）**：
- 知道 AI 在哪里能用、哪里不能用
- 在 AI 输出和真实世界之间做"缓冲"——审核、把关、兜底
- Cuban 的核心洞察：**"AI doesn't know the consequences of its action"**——理解后果是人类独有的能力

**好奇心强的人（永远安全）**：
- 把每次 AI 升级当成机会而非威胁
- 永远在学新东西
- Cuban: "You will always have an edge over everybody around you"

## 从理论到实践：LLM Wiki 作为"用 AI 学习"的具体路径

Cuban 的观点在宏观层面完全正确，但缺少一个具体问题的回答：**怎么用 AI 学习才能真正沉淀为持久优势？**

这正是我构建 [[personal-knowledge-compiler|Personal Knowledge Compiler（PKC）]] 的出发点。PKC 基于 Karpathy 的 [[llm-wiki|LLM Wiki]] 模型：

> "RAG = search, LLM Wiki = writing a book."

核心区别：

| 维度 | 用 AI 当搜索引擎（偷懒模式） | 用 AI 当知识编译器（学习模式） |
|------|-----------|-----------|
| 知识归属 | AI 的——每次重新问，答案可能不同 | 我的——经过验证、结构化、持久化 |
| 复利效应 | 无——每次查询独立，不积累 | 有——"the wiki compounds over time" |
| 思考深度 | 浅——接受第一个答案 | 深——Claims 需要置信度、来源、验证 |
| 系统性 | 碎片化——散落在聊天记录里 | 结构化——Concept/Method/Decision/Relations |

**具体实践**：我的知识管理流程不是"问 AI → 得到答案 → 忘掉"，而是：

1. **日记捕获**：每天记录学习内容、技术调研、架构决策
2. **LLM 编译**：用 Claude Code 从日记中提取概念、识别 Claims、发现关联
3. **人类审核**：我验证 Claims 的置信度、决定是否入库、标注来源
4. **知识演进**：概念页随着新证据更新，过时知识被标记和替换

这个过程中，AI 是**编译器**（维护者/编辑），不是**大脑**（决策者）。方向盘始终在我手里。

## 为什么"结构化个人知识"是 AI 时代的终极护城河

Cuban 说"AI doesn't know the consequences of its action"——这不仅是 AI 的局限，也揭示了**判断力**的来源：判断力来自于**结构化的经验积累**，而非实时搜索。

把这个逻辑展开：

1. **AI 的能力边界**：AI 擅长信息检索、模式识别、文本生成，但不擅长理解后果、权衡 trade-off、做具有 context 的判断
2. **判断力的来源**：来自长期积累的领域知识 + 失败经验 + 对系统复杂性的理解
3. **知识必须"编译"**：零散的信息（日记、聊天记录、浏览历史）不构成判断力；只有经过**提炼、结构化、验证**的知识才能支撑高质量决策
4. **PKC 的定位**：就是这个"编译"过程的自动化管道——用 AI 做苦力（提取、格式化、关联发现），人做决策（验证、取舍、判断置信度）

当前我的 wiki 规模：40+ concepts、8 methods、4 decisions、160+ claims——每一条都经过人类审核。这不是 AI 的输出，是**我的知识系统**，AI 只是帮我维护它。

## 警惕与自省

即便有了 PKC 这样的系统，仍然要警惕几个陷阱：

**1. "编译幻觉"**：AI 提取了 Claims，我点了"确认"——但我真的理解这个 Claim 吗？还是只是在走流程？
- 对策：定期无 AI 回顾 wiki，能否凭记忆解释每个核心概念

**2. "工具依赖"**：没有 Claude Code 就不知道怎么整理笔记了
- 对策：工具是加速器，不是必需品。核心能力是"识别什么值得记住"，这不需要工具

**3. "收集者谬误"**：wiki 页面越来越多，但真正内化并改变行为的有多少？
- 对策：知识成熟度模型——从"记录"到"应用"到"教授"，跟踪每个概念的实际使用

**4. John Nosta 的警告——"学习顺序颠倒"**：AI 先给你抛光的答案，剥夺了你自己摸索、质疑、理解的过程
- 对策：先形成自己的初步判断，再用 AI 验证和扩展，而非反过来

## 我的 PKC 实践自评——做得好的与待改进的

### 做得好的

1. **明确站在"用 AI 学习"阵营**：不是让 AI 替我工作，而是用 AI 作为知识编译管道。日记 → 提取 → 结构化 → 人工审核，保证我是主体。
2. **知识有"归属权"**：wiki 里的每个 Claim 有来源、置信度、状态标记。这是"我的知识系统"，不是"ChatGPT 的输出"。
3. **架构约束优于 Agent 自由**：不盲信 AI 自主能力，用 harness 约束它——体现了对 AI 边界的理解。
4. **有反馈闭环**：日记 → 提取 → wiki → 冲突检测 → 演进，不是单向积累，有验证和自我纠错机制。

### 需要改进的（持续优化方向）

**改进 1：防止"确认偏差"——AI 提取的我真的消化了吗？**
- 风险：160+ claims 里，有多少能脱口而出解释？有多少只是"看了一眼觉得对就批准了"？
- 行动：每周挑 3-5 个 Claims 做"无参考解释测试"——不看 wiki，能否向别人清楚讲出来？

**改进 2：强化知识输出端——从"记录"到"应用"**
- 风险：输入→编译→存储链条很强，但知识是否真正改变了工作决策、代码架构、技术选型？
- 行动：给重要概念加 `applied` 字段——记录何时、何处实际用了这个知识。知识如果只停在 wiki 里，就是"高级收藏"。

**改进 3：修正"先 AI 后思考"的顺序**
- 风险：调研新技术时，是先让 AI 搜索总结再形成看法，还是先自己形成判断？
- 行动：对重要主题，先花 15 分钟写下"我已经知道什么"、"我的初步判断是什么"，再用 AI 扩展。让 AI 补充盲区，而非替代思考起点。

**改进 4：控制系统维护开销**
- 风险：花在"维护知识系统"的时间超过"获取和应用知识"的时间，系统就从加速器变成负担。
- 行动：定期问自己——"如果今天没有 wiki 系统，我的学习效率会下降多少？" 如果答案是"差不多"，说明系统在空转。

**改进 5：深度 > 广度**
- 风险：同时追踪主题太多，wiki 容易让人觉得"记了就等于学了"。
- 行动：每周确定 1-2 个"深度主题"，其余浅层追踪。深度主题标准：能产出文章或做出决策，而非仅仅记录。

### 核心检验标准

> **没有 AI 的时候，我的判断力有没有变强？**

如果答案持续是"是"，说明我在正确的路上。如果有一天发现"离开 AI 就慌了"，那就是滑向了 Cuban 说的"drunk intern"模式。

## 结语

Mark Cuban 说得对：**好奇心 + 批判性思维 + AI 工具 = 永远不失业**。

但我想补充一层：好奇心如果没有**沉淀机制**，就只是信息消费；批判性思维如果没有**结构化载体**，就只是直觉。LLM Wiki / PKC 就是那个沉淀机制和结构化载体——让 AI 时代的学习真正**复利化**。

与 AI 相处的最佳姿态：
- **保持好奇**——让 AI 扩大你的探索边界
- **保持批判**——知道 AI 的输出边界和后果盲区
- **保持主体性**——方向盘在你手里，AI 是引擎不是司机
- **保持沉淀**——学到的东西必须编译进你自己的知识系统，否则就是在帮 AI 公司做训练数据

## 参考

- [Mark Cuban: AI Hype vs. Reality — Big Technology Podcast](https://www.youtube.com/watch?v=CEz9RRg0FfI)
- [Mark Cuban warns the biggest career mistake right now is letting AI do your thinking for you](https://tech.yahoo.com/ai/articles/mark-cuban-warns-biggest-career-105944285.html)（Business Insider）
- [[personal-knowledge-compiler]] — 个人知识编译器概念页
- [[llm-wiki]] — Karpathy LLM Wiki 模型
