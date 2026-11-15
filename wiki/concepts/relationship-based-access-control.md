---
title: "Relationship-Based Access Control"
created: "2026-11-15"
updated: "2026-11-15"
tags:
  - wiki
  - concept
  - authorization
  - rebac
  - agent-runtime
aliases:
  - "ReBAC"
  - "关系型授权"
  - "permission-intersection"
  - "三方交集"
related:
  - "[[credential-out-of-sandbox]]"
  - "[[ai-gateway]]"
  - "[[agent-sandbox]]"
  - "[[agent-session-control-plane]]"
---

# Relationship-Based Access Control（关系型授权，ReBAC）

## 摘要

关系型授权回答的问题永远是同一种形式：某个主体和某个对象之间，某个关系成不成立。授权数据存成关系元组 `(user, relation, object)`，授权模型定义类型、关系以及关系之间怎么推导（并且、或者、从另一个对象继承），查询时现算。思路来自 Google 的 Zanzibar 论文，开源实现有 OpenFGA、SpiceDB。

它在 agent runtime 里重要，是因为 agent 的有效权限天然是**多方关系**：应用申请了什么、资源 owner 批准了什么、平台发布了什么，三份声明由不同的人写、互不知道对方，权限是三者同时成立时算出来的。Kubernetes RBAC 只认集群 API 的主体和动词，写不出这种跨来源的"并且"；策略引擎能写，但要把三份数据推给它，也没有原生的反查。网关每个请求调一次 Check，决策点负责把请求翻译成这道题（见 [[credential-out-of-sandbox]]、[[ai-gateway]]）。

## Claims

### Claim: 有效权限是三份声明的交集——应用申请 ∧ 资源 owner 批准 ∧ 平台发布，由控制器各自投影成一条关系元组，没有人直接写"有权限"

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-15
- **置信度**：0.85
- **状态**：active

> 模型：`resource_action` 上定义 requested: [app]、granted: [app]、published: [app:*]、perform: requested and granted and published。对象是"资源 UID + 确切动作"，动作是不透明字符串（git.read 不蕴含 git.write，无通配动作）。本机实测：只有申请 false、申请 + 批准 false、三条都在 true；另一应用只有批准无申请 false。主体和对象用 UID 不用名字——删了重建同名对象，旧元组还在会悄悄继承授权。对象 ID 不能含 `#`（它是"对象#关系"分隔符），否则 400。操作顺序：先批准再申请，否则新会话整体建不了（第 04 篇实测）。

### Claim: 和 RBAC、策略引擎的分工——RBAC 管集群 API，策略引擎擅长条件组合，关系型擅长归属、共享与多方关系，并原生支持反查

- **来源**：[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]、[[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.75
- **状态**：active

> RBAC：主体绑定角色、角色对资源有动词，数据在 Role / RoleBinding。可以把外部资源定义成 CRD、让网关调 SubjectAccessReview 把 RBAC 当粗粒度策略库，但主体只能是 ServiceAccount（区分会话就得每会话一个）、表达不了三方交集与审批、没有条件。策略引擎（OPA）：规则对输入和外部数据求值，三份数据都要推送，反查"这个应用能做哪些动作"要自己实现。关系型：ListObjects / ListUsers 直接给出"应用 A 能做的动作""谁能对 R 做 git.read"，用于控制台展示与权限盘点（通配主体 app:* 不会被 ListUsers 列出）。

### Claim: 默认强一致，打开查询缓存就变成最终一致——撤销后最长一个 TTL 内仍放行；授权路径上不开，或查询带 HIGHER_CONSISTENCY

- **来源**：[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.85
- **状态**：active

> OpenFGA 本机实测：默认配置删掉批准元组，下一次 Check 即 false（0.9 毫秒）；开启 check-query-cache（TTL 10 秒）后，撤销后前 10.2 秒仍返回 true；查询带 HIGHER_CONSISTENCY 立即 false。由此第 04 篇"撤销约 1.2 秒生效"的时间花在关系存储之外（控制器与决策点感知变化、网关下一次请求）。对 agent，撤销常发生在"发现它在做不该做的事"时，缓存那几秒正是最不该放行的时间；参考实现未开缓存。

### Claim: 条件把过期时间、模型白名单写进批准里——但缺条件参数时返回错误而不是 false，调用方必须把错误当拒绝

- **来源**：[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 元组带 CEL 条件：not_expired（current_time < expires_at，过期时间写在元组里、当前时间由 Check 传入）实测 11:00 true、13:00 false、不传参数 400；model_allowed（model in allowed_models）实测列表内 true、列表外 false——对应"按请求体模型名授权"，资源 owner 批准时就能定，不改网关配置。上下文元组可把实时状态（如 provider 是否就绪）随 Check 传入而不落库，代价是反查与变更记录都看不到，只适合每次请求能现场确定的事实。

### Claim: 授权模型不可变、按 ID 引用——升级顺序必须是先写新模型、读方切新 ID、再写新形状的元组；重复写元组会报错

- **来源**：[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 实测：用旧模型 ID 查普通关系照常 true；查带条件的元组 false（旧模型不认识该条件，元组不算数）；用旧 ID 写带条件元组 400。顺序反过来，旧读方会把新元组当不存在，表现为"批准了却不生效"。同一元组写第二次 400（cannot write a tuple which already exists），控制器重启后重新投影要带 on_duplicate: ignore 或先读后写。

### Claim: 关系判断本身不是瓶颈——Check 亚毫秒到毫秒级，整次授权的大头在把请求翻译成关系问题的身份核实

- **来源**：[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.75
- **状态**：active

> 本机顺序调用：内存存储 Check p50 0.38 毫秒、p99 0.76；SQLite（单连接、WAL）p50 0.81、p99 1.16；ListObjects 与 Check 同量级。集群里 OpenFGA 一步约 2.5 毫秒（多出网络与服务认证），整次授权 p50 约 105 毫秒、其中约 62 毫秒是回查 Pod、ServiceAccount、会话与运行时状态。参考实现部署为单副本 + SQLite、OIDC 认证只放行控制器与授权决策方两个身份；挂掉则所有出站请求被拒，上生产要换 PostgreSQL / MySQL 并多副本（服务本身无状态）。

## 冲突与演进

- 2026-11-14：`permission-intersection` 以 HOLD 形式作 [[agent-sandbox]] Claim 收入（0.75），复核阈值为"另一篇文章讲 ReBAC / 多方批准的授权模型"。
- 2026-11-15：《系列 04 补充：OpenFGA 与关系型授权》专文讲 ReBAC 并本机实测，阈值命中，建为原子概念页；三方交集作本页首条 Claim（0.75 → 0.85），[[agent-sandbox]] 原 Claim 保留并指向本页。
- 产品名（OpenFGA、SpiceDB、OPA、Zanzibar）不建页，只作 Claim 证据。

## 关联概念

- [[credential-out-of-sandbox]] — `uses` 出站网关授权通过后才取凭据，"通过"由本页的关系判断给出
- [[ai-gateway]] — `uses` 网关授权回调到关系型决策点
- [[agent-sandbox]] — `constrains` 沙箱能对外做什么，以三方交集为准
- [[agent-session-control-plane]] — `uses` 控制器把应用定义、批准对象、资源声明投影成元组；每轮按当前关系重算权限

## 来源日记

- [[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]] — 概念、模型、本机实测（交集、缓存与撤销、条件、模型版本、延迟）
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] — 三方交集与撤销的集群实测
- [[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]] — RBAC 为什么表达不了三方交集
