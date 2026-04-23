---
title: "Vibe Coding 系列11：架构测试全景——从 ArchUnit 到 AI 辅助架构 Review 的工具链实践"
created: 2026-04-23
tags:
  - vibe-coding
  - architecture
  - harness
  - archunit
  - fitness-function
---

# Vibe Coding 系列11：架构测试全景——从 ArchUnit 到 AI 辅助架构 Review 的工具链实践

## 1. 为什么架构约束是 Vibe Coding 的刚需

在 AI Agent 辅助编码（Vibe Coding）的时代，LLM 能快速生成大量代码，但带来一个隐性风险：**架构腐蚀加速**。传统开发中，架构腐蚀是一个缓慢的过程——开发者偶尔违反分层规则、引入循环依赖、复制粘贴逻辑。但当 Coding Agent 每次生成几百行代码时，架构违规的速度可能成倍增长。

这就是为什么 Vibe Coding 社区越来越推荐 ArchUnit 类工具——它们不是传统意义上的"测试框架"，而是**可执行的架构约束系统**，是 Harness Engineering 质量门禁体系中不可或缺的一环。

本文在[系列07：Coding Agent 时代的代码复用](Vibe%20Coding系列07：Coding%20Agent时代的代码复用——从架构约束到Plugin协作的实践指南.md)的基础上，从**架构约束执行、模块化分析、代码复用检测、AI 辅助 Review** 四个维度，梳理当前开源社区的工具链全景。

## 2. 澄清：ArchUnit 不是测试框架

很多人第一次看到 ArchUnit 时会误解——"这不就是 JUnit 上面套了一层架构版 unittest 吗？"

这个理解需要纠正。最准确的关系是：

```
ArchUnit = 核心规则引擎（分析代码结构，静态分析）
JUnit    = 测试执行器（负责跑测试 + 报告结果）
```

两者是**组合关系**，不是继承关系。ArchUnit 读取编译后的 bytecode，构建依赖图，应用规则，返回违规结果。JUnit 只是它的"运行壳"——这是一个聪明的设计选择：

- Java 项目已经有 test pipeline
- CI 已经集成 JUnit
- IDE 已经支持 test runner

所以 ArchUnit 选择**伪装成测试**，让开发者零成本接入现有体系。但它的本质更接近 **ESLint 之于 JavaScript**——一个静态分析规则引擎，只是借用了测试框架的运行环境。

### 关键区分：三种测试

| 测试类型 | 工具 | 输入 | 输出 |
|---------|------|------|------|
| **行为测试**（单元/集成） | JUnit / pytest | 参数 | return / assert |
| **结构测试**（架构约束） | ArchUnit | 整个 codebase | dependency violation |
| **性能测试**（基准/负载） | JMH / k6 | 请求/调用 | 延迟/吞吐 |

### ArchUnit 的能力边界

ArchUnit 能做的：
- 包依赖规则（controller 不能直接调 repository）
- 分层架构约束（presentation → service → persistence）
- 命名规范（Service 类必须以 Service 结尾）
- 循环依赖检测
- 注解使用规则

ArchUnit **不能做**的：
- 跨语言的架构约束
- 代码重复检测（功能复用分析）
- 模块耦合度/内聚度量化
- 语义级别的架构 Review

这些"不能做"的部分，需要其他工具来补充。

## 3. 多语言架构约束工具

### 3.1 Java 生态

| 工具 | 定位 | 特点 |
|------|------|------|
| [ArchUnit](https://github.com/TNG/ArchUnit) | 架构规则引擎 | 分层约束、包依赖、命名规范、循环检测 |
| [Taikai](https://github.com/enofex/taikai) | ArchUnit 上层封装 | 预置 Spring Boot 常用规则，减少 boilerplate |

**典型 ArchUnit 规则示例**：

```java
@ArchTest
static final ArchRule layerRule =
    classes().that().resideInAPackage("..service..")
             .should().onlyBeAccessed()
             .byAnyPackage("..controller..", "..service..");
```

### 3.2 TypeScript / JavaScript 生态

| 工具 | 定位 | 特点 |
|------|------|------|
| [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) | ArchUnit 的 TS 移植 | 依赖规则、循环检测、LCOM 内聚度指标、Nx monorepo 支持 |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | 依赖图分析与验证 | 可视化（DOT/SVG）、规则配置、VS Code 扩展、GitHub Actions 集成 |
| [Sheriff](https://github.com/softarc-consulting/sheriff) | 模块边界执行 | 专为 monorepo 设计，轻量级 |
| [Nx Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries) | ESLint 规则 | Nx monorepo 内置，基于 project tags 定义依赖规则 |

**dependency-cruiser 规则示例**：

```json
{
  "forbidden": [{
    "name": "no-circular",
    "severity": "error",
    "from": {},
    "to": { "circular": true }
  }, {
    "name": "no-domain-to-infra",
    "severity": "error",
    "from": { "path": "^src/domain" },
    "to": { "path": "^src/infrastructure" }
  }]
}
```

### 3.3 Python 生态

| 工具 | 定位 | 特点 |
|------|------|------|
| [PyTestArch](https://pypi.org/project/PyTestArch/) | ArchUnit 风格的 Python 实现 | 分层规则定义，pytest 集成 |
| [pytest-archon](https://github.com/jwbargsten/pytest-archon) | pytest 架构测试插件 | 适合 Django 项目 |
| [Tach](https://github.com/gauge-sh/tach) | 模块边界执行 | Rust 实现（极快），支持增量采纳、依赖可视化 |

**Tach 使用示例**：

```bash
tach init          # 初始化，扫描现有依赖
tach check         # 检查违规
tach show          # 可视化模块依赖
tach sync          # 同步配置与实际状态
```

### 3.4 C# / .NET 生态

| 工具 | 定位 | 特点 |
|------|------|------|
| [NetArchTest](https://github.com/BenMorris/NetArchTest) | .NET 架构测试 | 流式 API，xUnit 集成 |
| [ArchUnitNET](https://github.com/TNG/ArchUnitNET) | ArchUnit 官方 .NET 移植 | API 与 Java 版一致 |

### 3.5 跨语言方案

| 工具 | 定位 | 特点 |
|------|------|------|
| [Semgrep](https://semgrep.dev/) | 通用 AST 规则引擎 | 30+ 语言，YAML 规则，可编码架构约束 |
| [Boundary](https://github.com/rebelopsio/boundary) | DDD/六边形架构分析 | Rust + tree-sitter，多语言支持（早期阶段） |
| [Baseline](https://github.com/stewartjarod/baseline) | CI 架构门禁 | 专为防止 AI Coding 工具违反架构设计，**可作为 MCP Server** |
| [Deptrac](https://github.com/deptrac/deptrac) | PHP 依赖规则 | YAML 配置，CI 友好 |

**Baseline 特别值得关注**——它是专门为 Vibe Coding 时代设计的工具，能作为 MCP Server 运行，让 Coding Agent（Cursor、Claude Code 等）在生成代码时直接查询架构规则。

## 4. 代码复用与重复检测

架构约束解决的是"分层是否正确"的问题，但"相同功能是否被正确抽象和复用"需要另一类工具。

### 4.1 Token 级重复检测

| 工具 | 语言支持 | 特点 |
|------|---------|------|
| [jscpd](https://github.com/kucherenko/jscpd) | 150+ 格式 | CLI 工具，HTML/JSON 报告，可配置阈值 |
| [PMD CPD](https://pmd.github.io/latest/pmd_userdocs_cpd.html) | Java/C/C++/C#/Go/Python/JS 等 | Maven/Gradle 集成，成熟稳定 |
| [SonarQube Community](https://www.sonarsource.com/open-source-editions/sonarqube-community-edition/) | 21 语言 | 重复率、重复块、重复行统计 |

### 4.2 语义级重复检测

Token 级检测只能发现"看起来一样"的代码，但很多重复是"看起来不同但做同样的事"。

| 工具 | 方式 | 特点 |
|------|------|------|
| [Semgrep](https://semgrep.dev/) | AST 模式匹配 | 跨文件分析，发现结构相似但文本不同的代码 |
| [CodeAnt AI](https://www.codeant.ai/) | AI 语义分析 | 跨服务、跨语言、跨 PR 的语义重复检测（商业） |

### 4.3 渐进式重复消减

| 工具 | 方式 | 特点 |
|------|------|------|
| [Ratchets](https://github.com/imbue-ai/ratchets) | 棘轮机制 | 允许现有违规，阻止新增违规——适合存量项目渐进改善 |

## 5. 模块化分析——耦合度与内聚度

架构约束告诉你"不该做什么"，模块化分析告诉你"做得怎么样"。

### 5.1 静态分析方向

| 工具 | 指标 | 特点 |
|------|------|------|
| [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) | LCOM（Lack of Cohesion of Methods） | 内置内聚度计算，可设阈值断言 |
| [SonarQube + Structure101](https://www.sonarsource.com/structure101/) | 依赖图、架构健康评分 | Sonar 2024 年收购 Structure101，正在集成 |
| [Sonargraph](https://www.hello2morrow.com/products/sonargraph) | 循环依赖、耦合度 | 商业工具，Java/C#/C++/Python |
| [Tach](https://docs.gauge.sh/) | 模块依赖可视化 | Python 专用，`tach show` 揭示实际耦合 |

### 5.2 行为分析方向（基于 Git 历史）

静态分析只看代码结构，但**一起变更的文件往往才是真正耦合的**。

| 工具 | 方式 | 特点 |
|------|------|------|
| [Code Maat](https://github.com/adamtornhill/code-maat) | Git 历史挖掘 | 识别变更热点、时间耦合、代码年龄（语言无关） |
| [CodeScene](https://codescene.io/) | 行为代码分析 | Code Maat 的商业演进，热点检测、变更耦合、重构建议 |

**Code Maat 的核心洞察**：两个文件如果总是一起修改（temporal coupling），说明它们之间有隐性依赖——这是静态分析工具无法发现的。

```bash
# 分析 temporal coupling
git log --format=format: --name-only | sort | uniq -c | sort -rn
# 或使用 code-maat
java -jar code-maat.jar -l gitlog.log -c git2 -a coupling
```

## 6. AI 辅助架构 Review

这是最前沿的方向——用 LLM 理解代码的语义结构，自动发现架构问题。

### 6.1 Claude Code 生态

| 工具/方式 | 定位 | 说明 |
|----------|------|------|
| [oh-my-claudecode](https://oh-my-claudecode.dev/) `architect` agent | 架构分析 | Opus 模型，只读分析，19 个专业 agent 之一 |
| oh-my-claudecode `code-reviewer` agent | 代码 Review | 严重性分级、SOLID 原则检查、逻辑缺陷检测 |
| oh-my-claudecode `simplify` skill | 代码简化 | 审查变更代码的复用性、质量和效率 |
| [Baseline MCP Server](https://github.com/stewartjarod/baseline) | 架构规则查询 | AI Agent 生成代码时实时查询架构约束 |
| CLAUDE.md / AGENTS.md 模式 | 声明式约束 | 在项目根目录声明架构规则，Agent 在生成代码时遵守 |

**CLAUDE.md 架构约束示例**：

```markdown
## Architecture Rules
- Domain layer (src/domain/) must NOT import from infrastructure (src/infra/)
- All API handlers must go through the service layer
- No circular dependencies between modules
- Shared utilities go in src/shared/, not duplicated per module
```

### 6.2 AI PR Review 工具

| 工具 | 特点 |
|------|------|
| [PR-Agent](https://github.com/qodo-ai/pr-agent)（Qodo AI） | 开源，10.5k stars，可配置规则集，自托管 |
| [ai-pr-review](https://github.com/snarktank/ai-pr-review) | 使用 Claude Code 的自主 review 循环 |
| [Tanagram](https://tanagram.ai/) | 架构感知的代码 review：结构分析 → 策略引擎 → AI 推理 → 可执行反馈 |

### 6.3 AI IDE 的架构感知

| 工具 | 架构能力 |
|------|---------|
| **Cursor** | Codebase 感知的代码生成，BugBot PR review |
| **Windsurf** | Cascade 模式的多文件重构，理解项目结构 |
| **Augment Code** | 专为大型代码库设计（测试过 45 万文件 monorepo） |

### 6.4 下一步：ArchUnit + LLM

ChatGPT 讨论中提到一个有趣的前沿方向：**ArchUnit 的规则是人写的，还是模型生成的？**

这指向两种可能的演进路径：

1. **LLM 生成架构规则**：分析现有代码结构，自动生成 ArchUnit/dependency-cruiser 规则——"根据当前代码的实际分层，生成约束规则，防止未来偏离"
2. **LLM 审查架构违规**：ArchUnit 报告违规后，LLM 解释为什么违规、如何修复，甚至自动生成修复代码

目前这两个方向还在早期探索阶段，但一些团队已经开始踩坑。

## 7. 架构适应度函数（Fitness Functions）

"适应度函数"概念来自 Neal Ford 等人的《Building Evolutionary Architectures》——用**可执行的自动化检查**来持续评估架构特征。

### 7.1 概念模型

架构适应度函数不是一个工具，而是一种**思维方式**：将架构关注点转化为可自动执行的检查。

```
架构关注点           → 适应度函数                    → 工具
─────────────────────────────────────────────────────────────────
分层是否正确？        → 依赖规则测试                  → ArchUnit / dependency-cruiser
模块是否松耦合？      → 耦合度指标 < 阈值             → ArchUnitTS LCOM / Sonargraph
有无重复代码？        → 重复率 < 5%                  → jscpd / PMD CPD / SonarQube
性能是否回退？        → P99 延迟 < 200ms             → k6 / Gatling / JMH
安全是否合规？        → 零高危漏洞                    → Semgrep / Snyk
可访问性是否达标？    → Lighthouse 评分 > 90          → axe-core / Lighthouse
```

### 7.2 专用工具

| 工具 | 说明 |
|------|------|
| [ArchFit](https://github.com/mikaelvesavuori/archfit) | 专为适应度函数设计的开源框架，提供通用函数模板 |
| [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) | 明确定位为"TypeScript 适应度函数框架" |
| [Fitness Function Katas](http://evolutionaryarchitecture.com/ffkatas/) | 练习题集，学习设计适应度函数 |

### 7.3 组合实践

实际落地中，适应度函数不是单一工具，而是**多种工具的 CI pipeline 组合**：

```yaml
# Harness CI Pipeline 示例：架构适应度函数 Stage
stages:
  - stage:
      name: Architecture_Fitness
      steps:
        # 适应度函数 1：分层约束
        - step:
            name: Layer_Rules
            command: mvn test -Dtest=ArchitectureTest  # ArchUnit
        # 适应度函数 2：循环依赖检测
        - step:
            name: Circular_Deps
            command: npx dependency-cruiser --validate .dependency-cruiser.json src
        # 适应度函数 3：代码重复率
        - step:
            name: Duplication_Check
            command: npx jscpd --threshold 5 src/
        # 适应度函数 4：模块耦合度
        - step:
            name: Coupling_Metrics
            command: tach check  # Python 项目
        # 适应度函数 5：安全规则
        - step:
            name: Security_Rules
            command: semgrep --config=p/owasp-top-ten src/
```

## 8. 推荐工具栈

### 按语言推荐

| 语言 | 架构约束 | 重复检测 | 模块化分析 |
|------|---------|---------|-----------|
| **Java** | ArchUnit + Taikai | PMD CPD | Sonargraph / SonarQube |
| **TypeScript** | ArchUnitTS + dependency-cruiser | jscpd | ArchUnitTS（LCOM） |
| **Python** | PyTestArch + Tach | jscpd / PMD CPD | Tach + Code Maat |
| **C# / .NET** | NetArchTest 或 ArchUnitNET | SonarQube | SonarQube（Structure101） |
| **多语言** | Semgrep + Baseline | SonarQube | Code Maat + CodeScene |

### Vibe Coding 增强层

| 场景 | 推荐方案 |
|------|---------|
| AI 生成代码的架构防护 | Baseline MCP Server + CLAUDE.md 声明 |
| PR 级架构 Review | PR-Agent + oh-my-claudecode code-reviewer |
| 存量项目渐进治理 | Ratchets（棘轮机制，只禁新增违规） |
| 架构演化追踪 | Code Maat / CodeScene（Git 历史行为分析） |

## 9. 总结：四层架构质量门禁

将以上工具组织为 Harness CI pipeline 中的四层门禁：

```
┌─────────────────────────────────────────────────┐
│  Layer 4: AI 辅助 Review                         │
│  PR-Agent / oh-my-claudecode / Tanagram          │
│  → 语义级架构理解、模式识别、重构建议              │
├─────────────────────────────────────────────────┤
│  Layer 3: 模块化与复用分析                        │
│  Code Maat / ArchUnitTS LCOM / jscpd / PMD CPD   │
│  → 耦合度、内聚度、时间耦合、代码重复              │
├─────────────────────────────────────────────────┤
│  Layer 2: 架构约束执行                            │
│  ArchUnit / dependency-cruiser / Tach / Semgrep   │
│  → 分层规则、包依赖、循环检测、命名规范            │
├─────────────────────────────────────────────────┤
│  Layer 1: 代码格式与 Lint                         │
│  Prettier / ESLint / Ruff / Checkstyle            │
│  → 格式统一、风格一致、基础静态分析                │
└─────────────────────────────────────────────────┘
```

**核心认知**：ArchUnit 只覆盖了 Layer 2 的一部分（分层约束）。一个完整的架构质量体系需要四层协作——从格式到约束到分析到 AI Review，逐层递进。在 Vibe Coding 时代，Layer 4（AI 辅助 Review）和 Baseline MCP Server（让 Agent 在生成时就遵守规则）正在成为最有价值的新增层。

---

## 参考资源

- [ArchUnit 官网](https://www.archunit.org/)
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) — TypeScript 架构测试与适应度函数
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — JS/TS 依赖图验证
- [Tach](https://github.com/gauge-sh/tach) — Python 模块边界执行（Rust 实现）
- [Baseline](https://github.com/stewartjarod/baseline) — AI Coding 时代的架构门禁 + MCP Server
- [Semgrep](https://semgrep.dev/) — 30+ 语言的 AST 规则引擎
- [Code Maat](https://github.com/adamtornhill/code-maat) — Git 历史行为分析
- [PR-Agent](https://github.com/qodo-ai/pr-agent) — 开源 AI PR Review
- [ArchFit](https://github.com/mikaelvesavuori/archfit) — 架构适应度函数框架
- [Building Evolutionary Architectures](http://evolutionaryarchitecture.com/) — 适应度函数概念来源
- [oh-my-claudecode](https://oh-my-claudecode.dev/) — Claude Code 插件生态
- [NetArchTest](https://github.com/BenMorris/NetArchTest) — .NET 架构测试
- [PyTestArch](https://pypi.org/project/PyTestArch/) — Python 架构测试
- [jscpd](https://github.com/kucherenko/jscpd) — 多语言代码重复检测
- [Ratchets](https://github.com/imbue-ai/ratchets) — 渐进式 lint 执行
