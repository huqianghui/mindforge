---
title: "Actor Snapshot Scheduling"
created: "2026-11-14"
updated: "2026-11-14"
tags:
  - wiki
  - concept
  - agent-runtime
  - sandbox
  - checkpoint
  - scheduling
aliases:
  - "actor 与执行单元分离"
  - "快照换出调度"
  - "会话暂停与恢复"
related:
  - "[[agent-sandbox]]"
  - "[[agent-session-control-plane]]"
  - "[[durable-execution]]"
---

# Actor Snapshot Scheduling（actor 与执行单元分离、快照换出）

## 摘要

把有状态的 agent 实例（actor / 会话）和执行它的沙箱 pod（worker）拆开：pod 仍是执行单元，但不再是 agent 的部署、身份、生命周期单元。实例空闲时把状态快照到外部存储、释放执行单元；有请求来时从快照恢复到任意一个空闲的执行单元上。这样要准备的执行单元数取决于**同时在忙**的实例数，而不是 agent 或会话的总数。

两个独立实现是 Agent Substrate（actor / worker，内存与文件系统快照进对象存储）和 OpenSandbox 的 Durable 会话（容器 rootfs 提交成 OCI 镜像推到 registry，恢复时用该镜像新建 Pod）。它们的共同代价在快照本身：快照范围决定恢复后还剩什么，快照耗时决定空闲阈值能压多短。

## Claims

### Claim: actor 与执行单元分离——空闲时快照释放 worker、请求来了恢复到任意空闲 worker；要准备的 worker 数取决于同时在忙的 actor 数

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> Agent Substrate 把 actor（多、大多挂起）与 worker（预启动的沙箱 pod，少）拆开：低频基础设施配置（WorkerPool）留在 Kubernetes，高频实例状态放自己的 PostgreSQL，挂起恢复不经 API server；一个 worker 一次仍只承载一个 actor。坑：挂起需上层显式调用；身份不能从环境变量读（golden snapshot 里冻结，所有 actor 读到同一值）；需 `wakeupProbe`；pre-1.0。OpenSandbox Durable 会话是第二个实现：会话 ID 稳定，空闲超阈值 commit 后删 Pod，来消息用快照镜像新建 Pod。整套收益建立在 agent 实际"忙"的时间占比上，动手前先从 trace 量这个数。原为 [[agent-sandbox]] 末条 Claim（0.55），第二个实现出现后升至 0.7。

### Claim: 快照范围决定恢复后剩什么——rootfs 快照保留整个容器文件系统（含 `/tmp` 与 harness 原生会话文件），不保留内存与进程；恢复后"记得上一轮"，但后台进程没了、VM 与主机名换新

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]、[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> OpenSandbox 在沙箱所在节点起 commit Job，经 containerd 把容器 rootfs 提交成 OCI 镜像推 ACR，沙箱容器与出站边车各一份；暂停走同一机制。实测：第一轮在 `/root/work` 与 `/tmp` 各写文件、起 `sleep 3600` 后台进程、记暗号；暂停 5 分多钟后第二轮——两个文件都在、harness 答出暗号（原生会话文件在 rootfs 里随快照走）、后台进程没了但 PID 文件还在、`uptime` 是新 VM、主机名换了。对照 Agent Substrate 的两档：MEMORY（进程从冻结处继续）vs VOLUMES / ROOTFS（只存文件、进程冷启动）。编码 harness 每轮本来就是重新启动的进程，rootfs 档已足够续接上下文。

### Claim: 快照耗时决定空闲阈值的下限——每轮结束 checkpoint 与暂停各 commit 一次、各约 30~40 秒，恢复约 10 秒；阈值短于 checkpoint 时暂停只能排队

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-12
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 控制面阶段记录：领预热沙箱 1.1 秒 + 初始化 0.1 秒；checkpoint 31~41 秒（4 次）；暂停 29~35 秒；恢复 9.5~11.2 秒（含重新下发出站白名单）。空闲阈值设为最小值 30 秒时，到点 checkpoint 还没做完，暂停排在它后面，一轮结束到 Pod 消失共 79 秒——两次 commit 内容几乎一样。阈值越短 Pod 释放越快、恢复越频繁。集群每天半夜自动停机重启后，暂停会话照常恢复。单环境实测。

### Claim: 恢复时出站白名单按应用当前权限重新下发——撤销对暂停会话在恢复那一刻生效；而带内存的快照会把暂停时的凭据与身份一起冻住

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]、[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]
- **首次出现**：2026-11-12
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 运行中的会话撤销批准约 1.2 秒生效（授权层逐请求重判）；暂停的会话恢复时下发的就已是撤销之后的白名单，不是暂停时那一份。反面例子：OpenSandbox Credential Vault 只在 sidecar 内存，暂停后恢复为空，必须显式重新注入；Agent Substrate golden snapshot 冻结了环境变量里的身份。共同规律：凡是快照里的东西都是"暂停那一刻"的，权限、凭据、身份要在恢复时从沙箱外重新取，不能依赖快照里留下的值——这也是 [[credential-out-of-sandbox]] 让凭据始终留在外面的又一个理由。

## 冲突与演进

- 2026-11-04：HOLD，单篇（Agent 基础设施系列 03）、与 Agent Substrate 一个 pre-1.0 项目强绑定，作 [[agent-sandbox]] Claim 收入（0.55）。复核阈值：第二个独立实现。
- 2026-11-14：AKS Agent Runtime 系列 05 的 OpenSandbox Durable 会话是第二个实现（rootfs → OCI 镜像而非内存快照），用户裁决建页。[[agent-sandbox]] 原 Claim 精简为指向本页。
- Substrate 侧仍无自己的实测，超售密度的收益是项目方声明；OpenSandbox 侧有实测但只量了单会话。

## 关联概念

- [[agent-sandbox]] — `part-of` 沙箱"房间怎么分"一件中，环境分配与回收的一种调度形态
- [[agent-session-control-plane]] — `part-of` Durable 会话的暂停 / 恢复由会话控制面编排
- [[credential-out-of-sandbox]] — `constrains` 快照里的凭据与身份会过期或被冻结，恢复时必须从沙箱外重新取

## 来源日记

- [[2026-11-02-周一]] — Agent 基础设施系列 03 成文
- [[2026-11-12-周四]] — 系列 05 Durable / Ephemeral PoC
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — actor / worker 模型、快照范围
- [[AKS-Agent-Runtime系列05：会话生命周期与回收]] — rootfs commit、耗时、恢复时白名单重发
- [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]] — 暂停恢复后 harness 记得上一轮
