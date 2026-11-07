---
title: "Agent Memory Lifecycle"
created: "2026-11-04"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - agent
  - memory
  - self-improvement
  - github-copilot
aliases:
  - "Agent 记忆的生命周期"
  - "记忆的信任与遗忘"
  - "Copilot Memory 生命周期"
related:
  - "[[claude-code-memory-system]]"
  - "[[github-copilot]]"
  - "[[recursive-self-improvement]]"
---

# Agent Memory Lifecycle（Agent 记忆的生命周期）

## 摘要

Agent 跨会话记忆不只是"存下来、下次读"，而是一条带信任与遗忘的生命周期：**产生 → 写入过滤 → 存储 → 按相关性检索 → 使用前核对 → 投票 → 未被强化即过期**。这套机制回答两个问题：一条记忆凭什么还能被信任（锚定到可核对的证据，并在每次使用中被重新验证），以及记忆库怎么不无限膨胀（过期只能靠再次验证续期）。

目前的完整实现样本是 GitHub Copilot Memory（GA），加上 Copilot Dreaming（预览）在会话之外的离线整理。拿它对照 [[claude-code-memory-system]] 的分层与提权、以及 [[recursive-self-improvement]] 的分级与门控，可以看出 agent 记忆在可信度、遗忘、写权限、可审计性上的几种取舍。

## Claims

### Claim: 记忆的信任来自"使用前核对 + 投票"，遗忘来自过期——只有 upvote 续期，单纯被检索不续期

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> 每条记忆带正文、主题、产生它的 agent 与模型、存储理由、类型、投票数据、过期时间。检索按与当前工作的相关性挑、票数高者优先；挑中后被要求先对照当前分支核对 citations。核对通过 upvote、发现过时 downvote，低于阈值不再使用，闲置后删除。默认 90 天未强化过期，仓库事实可配 7~180 天（两级都配取较小值）。关键设计：**被检索不续期，被验证才续期**——一条记忆要活下去，必须在某次使用中被重新证明成立。合起来是一个在线强化回路：使用 → 核对 → 投票 → 影响下一次检索。官方文档支撑。

### Claim: 记忆按"对谁成立"分类而不是按"谁说的"——仓库事实团队共享、个人偏好跟人走，两者的 citations 指向不同

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 仓库事实（"单测用 Vitest""支付模块必须走 BillingGateway"）的 citations 指向代码位置，对有读权限的协作者共享，只在有写权限的人工作时产生；个人偏好（"改代码前先解释"）的 citations 可能是用户原话，跨仓库生效。意图不清时反问作用域而不是猜。隔离边界：仓库事实不在组织内跨仓库共享、fork 不带走；code review 与 agentic autofix **只用仓库事实、从不用个人偏好**，个人习惯影响不了别人 PR 的审查。团队共享是单机记忆方案做不到的部分——一个人踩过的坑在整个团队的 agent 里生效。

### Claim: 写入过滤分两层——系统强制拦截凭据与模型控制 token，其余敏感内容只靠模型自觉

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 系统强制：检测到 token / key / 凭据的记忆直接拒绝；含已知模型控制 token 的记忆也拒绝，防 prompt injection 把恶意指令写进记忆长期驻留。模型自觉：敏感个人信息、机密、只对当前任务有效的临时指令是"被指示不要存"，没有系统保证。同理，使用时的 citations 核对也是模型判断而非系统保证——存下来的事实不能当作一定会被遵守的规则。设计记忆系统时要分清哪些是硬约束、哪些是软约束。

### Claim: 子 agent 只读记忆是记忆库的单写者约束——写与投票收归协调者，防局部视角污染

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> Copilot CLI 里只有 root agent 能调 `store_memory` 与 `vote_memory`，子 agent 只有 `read_memories`。多 agent 并行时若每个子 agent 都能写、能投票，记忆库会被局部视角污染。与 Single-Writer 原则同构（本知识库对 `wiki/` 坚持单写者）。入口间的写权限也不对称：app 与 CLI 交互会话写入前可能请求批准；cloud agent 与 code review（含从 Slack / Teams 发起的云会话）写入不请求批准；CLI 程序化模式需 `--enable-memory`；SDK 能开启 Memory 但没有列出、编辑、删除记忆的 API。

### Claim: 会话中的在线强化与会话外的离线整理是两个回路——离线整理改上下文不改权重，关掉不等于回滚

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> Copilot Dreaming 三类 dream：个人记忆整理（直接改个人记忆，不碰个人 instruction / skill 文件）、仓库定制（直接改仓库记忆 + 对 instructions / skills 开 PR，合并前不生效；读取范围包括 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`）、code review 定制（只学已合并 PR 上被接受的反馈，内部更新、不落仓库文件）。前提是 session syncing——本地 CLI 与 app 会话要上传到 GitHub，合规评审要单独拎出。关掉 Dreaming 不撤销已做改动、不恢复被删记忆、不关闭已开 PR，没有"撤销本次运行"；真正可回滚的只有走 PR 的那一路，因为它在 git 里。

### Claim: 记忆方案的取舍在"团队共享 + 自动遗忘"与"可见 + 可回滚"之间——后端记忆不可 diff，文件记忆没有自动过期

- **来源**：[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]、[[Harness实践：从Memory失效到记忆治理]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> Copilot Memory + Dreaming：存 GitHub 后端、仓库事实团队共享、citations + 投票校验、90 天未强化过期、Dreaming 开 PR 提权，但票数与内部字段不可见、无 diff。Claude Code auto memory：本机文件、按项目个人、无系统校验、无自动过期、可读可 diff。本库的记忆治理（memory-review + 提权）：本机文件 + 进 git 的规则文件，agent 写人审，定期人工审查时删除，全部可 diff。两边各有对方做不到的：Copilot 胜在共享与遗忘，文件方案胜在可见与可回滚。

### Claim: 离线整理的回滚是不对称的——记忆与 review 指引直接改、只有 instructions / skills 走 PR；关掉不撤销已做的改动

- **来源**：[[GitHub-Copilot系列03：Memory与Dreaming的分层配置]]、[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]
- **首次出现**：2026-11-06
- **最近更新**：2026-11-07
- **置信度**：0.75
- **状态**：active

> Copilot Dreaming 一个开关下有三类能力：个人记忆整理、仓库定制、code review 定制，每类前提不同（计划、策略允许的模型、会话上云、code review 预览功能），不能单独开关；先开 Dreaming、后补齐前提的，要把对应范围关一次再开才会激活新能力。生效方式分三路：记忆直接改不逐条审批，对 instructions / skills 的修改开 PR，code review 内部指引直接更新。关掉 Dreaming 不恢复被删记忆、不关闭已开 PR，进行中的运行可能跑完；关掉会话同步也不删除已同步的会话。能回滚的只有走 PR、合进 git 的那部分——与 [[recursive-self-improvement]] 中"门控位置"的判断一致：后台自我整理里只有落进版本控制的改动是可审计、可撤销的。

### Claim: 后台自我整理的范围和成本由上游的记忆范围决定——组织开 Dreaming 即覆盖 Repository access 圈定的全部仓库，按运行次数计费、空跑也算

- **来源**：[[GitHub-Copilot系列03：Memory与Dreaming的分层配置]]
- **首次出现**：2026-11-06
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> 组织层没有"给某个人开 Dreaming"的选项，开启的范围就是 Memory 的 Repository access 里选中的全部仓库；每次运行扣 AI credits，包括没有产生改动、处理不活跃仓库的运行，用量提醒不拦截用量。运行由平台排期，不能手动触发，计划、提示词和模型都不可改，结果在 Copilot app 的 Automations → Dreaming 里看。实际做法是先收窄记忆范围再开整理：先在少量自有仓库开仓库级 Dreaming，把它开的 PR 当普通代码评审看，看过几轮结果再按仓库清单逐步放开组织级开关。

## 冲突与演进

- 2026-11-03 harvest 倾向先作 Claim 注入 [[claude-code-memory-system]]（仅一篇来源），2026-11-04 用户裁决单独建页——它是 agent 记忆的通用机制（核对、投票、过期、写权限），而 claude-code-memory-system 讲的是 Claude Code 的分层与提权，二者维度不同。目前只有 GitHub Copilot 一个实现样本，出现第二个产品或论文的同类机制后复核置信度。
- "自我改进的门控位置"（`online-vs-offline-self-improvement-gate`）未单独建页，作为 Claim 注入 [[recursive-self-improvement]]。
- 2026-11-07：注入 GitHub Copilot 系列 03 两条 Claim（回滚不对称、整理范围与成本由记忆范围决定）；实现样本仍只有 GitHub Copilot 一家，置信度暂不上调。

## 关联概念

- [[claude-code-memory-system]] — `contrasts` 前者靠分层与人工提权管理记忆，本页靠核对、投票、过期自动管理
- [[github-copilot]] — `part-of` 本页机制目前唯一的产品实现样本是 GitHub Copilot 的 Memory 与 Dreaming
- [[recursive-self-improvement]] — `part-of` 记忆生命周期是 RSI 中"持久状态改进"在上下文层的一种实现

## 来源日记

- [[2026-11-03-周二]] — GitHub Copilot 系列 02 成文
- [[GitHub-Copilot系列02：Memory、Dreaming与自我改进]] — 两类记忆、生命周期、写入过滤、各入口读写差异、Dreaming 三类 dream、三方记忆方案对照
- [[2026-11-06-周五]] — GitHub Copilot 系列 03 成文
- [[GitHub-Copilot系列03：Memory与Dreaming的分层配置]] — Dreaming 三类能力的前提与生效方式、开启范围与计费、关掉不回滚
