---
title: "Durable Execution"
created: "2026-11-14"
updated: "2026-11-14"
tags:
  - wiki
  - concept
  - agent-runtime
  - distributed-systems
  - fault-tolerance
aliases:
  - "持久执行"
  - "断点续跑"
  - "write-ahead side-effect intent"
related:
  - "[[agent-session-control-plane]]"
  - "[[agent-infra-three-layers]]"
  - "[[actor-snapshot-scheduling]]"
---

# Durable Execution（持久执行）

## 摘要

持久执行是让长流程在进程崩溃、重启、换副本之后能接着做完的执行方式：每一步先把"新状态 + 接下来要执行的副作用"写进外部存储，再去执行；执行者重启后先读回没做完的部分接着做。Dapr Workflow、Temporal、Durable Task 是通用实现，agent runtime 的会话控制面也按这个规矩写。

它真正难的不是"能存能读"——framework 自带的 checkpoint 就能做到——而是故障语义：一步执行到一半时执行者没了，结果处于"未确认"状态，这时重放还是不重放？有副作用的一步重放就是重复执行（再推一次代码、再建一个 PR），不重放又可能丢掉用户的消息。所以持久执行最后比的不只是接管快，而是故障时重做的范围小、重做的东西没有副作用。

## Claims

### Claim: 持久执行是 Runtime 的独立一维——每步状态写外部存储、崩溃后断点重放；framework checkpoint 只解决能存能读，故障检测、自动重放、多副本调度要 runtime 提供

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> Dapr Workflow 每步写 state store、断点重放；它与隔离强度无关，是 [[agent-infra-three-layers]] Runtime 层四个子层之一。agent 会话控制面里的形态：每走一步先把"新状态 + 接下来要执行的副作用"（领沙箱、启动 harness、做快照）写进数据库，再由后台 runner 执行；runner 重启后先把上次没做完的副作用做完。按需叠加——只有长任务、跨审批流程才上持久执行，几秒结束的问答型 agent 用 framework checkpoint 足够。

### Claim: 结果不确定时按副作用分流——执行中被杀整轮重发（编码 harness 重跑即可能重复副作用），checkpoint 中被杀则等原快照完成、不重发

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 两次删控制面 Pod（单副本，约 5 秒恢复）的实测：① 一轮 `date; sleep 45; date` 执行 10 秒时删，执行结果记为"未确认"，重启后确认沙箱仍是原 Pod，把这一轮**整轮重发**，harness 从头再跑；文件里只有一行，说明第一次的进程随连接断开被杀、没有和第二次重叠。② commit Job 跑起来 8 秒时删，checkpoint 同样"未确认"，但重启后**不重新发起快照**，每约 11 秒核对进行中的那一份，完成后检查运行时、删旧 checkpoint、照常暂停——commit 本来就由 OpenSandbox 在集群里跑，控制面只需找回自己没确认的那一步。差别的道理：重发一轮可能产生副作用但不发就丢消息；重发快照没有副作用只是浪费时间，所以等原来那份。参考实现的策略是自定义命令类运行时结果不确定就不重放、编码 harness 沿用 harness 自己的重放行为；自写时更稳妥的默认是先不重放，宁可让用户重发一次。

### Claim: 高可用最后比的是故障时少重做，不只是接管快——编码 harness 一轮重做是让模型从头再来，checkpoint 勤一点重做范围就小

- **来源**：[[AKS-Agent-Runtime系列06：会话管理与高可用]]、[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> 三副本实测中进程被杀约 15 秒接管、第一轮从头重做；验证模型里一轮只是"睡 20 秒"，真实编码 harness 一轮重做的代价是整轮模型调用与工具执行，远大于接管那几秒。所以两个杠杆比缩短 lease 更重要：terminationGracePeriod 按 harness 单轮时长设，让发版和缩容走优雅退出（0.1 秒交接、零重做）；checkpoint 频率决定真被杀时回退到哪。

### Claim: 启动时的"围栏"只在单主时安全——多副本下要改成按 lease 判断，只接管 lease 已过期的会话

- **来源**：[[AKS-Agent-Runtime系列06：会话管理与高可用]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 参考实现启动时先把状态库里所有做到一半的事标成中断、再逐个核对——这等于假定"我重启了，所以没有别人在做"。多跑一个副本，新起来的那个会把另一个正在跑的工作全部打断。改法是每条副作用意图都带上写入它时的 fencing token，接管只针对 lease 已过期的会话；token 机制与"挡写入不挡执行"的边界见 [[agent-session-control-plane]]。

## 冲突与演进

- 2026-11-04：HOLD，仅 Agent 基础设施系列 01 一个小节（Dapr Workflow）+ 04 一句"状态存储外置"，作 [[agent-infra-three-layers]] Claim 收入。复核阈值：PoC 成文或另一篇深入讲 checkpoint 与重放差别。
- 2026-11-14：AKS Agent Runtime 系列 05 两次杀控制面实验与系列 06 三副本接管实验命中阈值，用户裁决建页。[[agent-infra-three-layers]] 的"Runtime 四子层"Claim 保留，持久执行的展开归口本页。
- 尚无 Temporal / LangGraph checkpointer 的实测对照，"通用实现"一句是背景知识，不是本页证据。

## 关联概念

- [[agent-infra-three-layers]] — `part-of` Runtime 层四个子层中的持久执行子层
- [[actor-snapshot-scheduling]] — `contrasts` 前者让流程在执行者换掉后接着做，后者让执行单元在空闲时被换出；一个管故障、一个管密度

## 来源日记

- [[2026-11-12-周四]] — 系列 05 两次删控制面实验
- [[2026-11-13-周五]] — 系列 06 三副本接管与混沌测试
- [[AKS-Agent-Runtime系列05：会话生命周期与回收]] — 执行中 / checkpoint 中被杀的两种处理
- [[AKS-Agent-Runtime系列06：会话管理与高可用]] — 少重做、启动围栏改按 lease
- [[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]] — 先写意图再执行、不确定不重放
- [[Agent基础设施系列01：三层划分与自建路线]] — Dapr Workflow 持久执行子层
