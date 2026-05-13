---
title: Scaling Agentic AI with NVIDIA Dynamo on Azure AI Platforms
created: 2026-05-13
tags:
  - NVIDIA
  - Dynamo
  - vLLM
  - SGLang
  - AKS
  - inference
  - distributed-systems
---

# Scaling Agentic AI with NVIDIA Dynamo on Azure AI Platforms

## 核心思想：推理分层架构

NVIDIA Dynamo 是一款分布式推理编排框架，定位为高性能推理的**控制平面（Control-Plane）**，而 vLLM 和 SGLang 则是单机高吞吐推理引擎，充当**数据平面（Data-Plane）**。

组合架构的核心逻辑：

- **Dynamo**：上层调度——调度请求、分配 GPU 任务、管理 KV 缓存
- **vLLM/SGLang**：底层执行——负责具体 token 生成、内存管理、批处理优化

在 AKS 中以分层部署实现 1+1>2 的效果：Dynamo 发挥"AI 操作系统"的作用指挥多 GPU 资源，vLLM/SGLang 充分发挥 token 生成与内存管理的高效机制。

---

## 组件划分

### Dynamo 前端（Control-Plane）

- 运行 OpenAI API 兼容服务端
- 包含 Router（路由）与 Scheduler（调度）逻辑
- 一般部署在 CPU 节点上，资源需求低

### Prefill Worker（Data-Plane）

- 运行模型的预填充（Prefill）阶段推理
- 由 Dynamo 调度至专用 Prefill GPU 节点处理输入
- 集成 vLLM/SGLang 引擎执行 embedding 计算、前馈等**计算密集阶段**

### Decode Worker（Data-Plane）

- 运行后续 Decode 阶段推理
- Dynamo 将 Prefill 结果（KV 缓存）传入 Decode GPU 节点，继续逐 token 生成
- vLLM/SGLang 引擎负责快速 KV 读写与 token 输出等**内存密集阶段**

### KV 缓存管理（Overlay）

- Dynamo 通过 KV 感知路由和缓存分层
- 在 Prefill 与 Decode Worker 之间共享 KV 数据
- 最小化重复计算，实现低延迟

---

## Kubernetes 中的集成方式

在 AKS 上可采用微服务部署模式：

### 独立服务模式

将 Dynamo 前端和 Prefill/Decode Worker 分别打包为独立容器，在 AKS 内按角色部署 Pod：

```
aks-dynamo namespace:
├── dynamo-front Deployment（无 GPU nodeSelector，1~少量副本）
├── dynamo-prefill Deployment（GPU 节点池 A）
└── dynamo-decode Deployment（GPU 节点池 B）
```

- Dynamo 前端 Pods 通过 K8s Service 对外提供 OpenAI API 端点
- Prefill 和 Decode Pods 由 Dynamo 前端通过 RPC/MPI 调度
- Control-plane → Data-plane 交互由 JetStream 等优化网络层完成

### Sidecar 模式

每个 GPU Pod 中双容器：

- **数据容器**：运行 vLLM/SGLang 模型推理实例（GPU 密集）
- **Sidecar 容器**：运行轻量 Dynamo 代理（CPU 资源足矣）

优点：通过 sidecar 共享 Pod 网络/存储，降低延迟
缺点：容器耦合度高，升级复杂

### 控制/数据平面分离原则

无论独立服务还是 Sidecar，关键是逻辑划分明确：

- **控制平面 Dynamo**：负责调度、缓存、横向扩展
- **数据平面 vLLM/SGLang**：负责实际模型计算
- AKS 的 Service 和 NetworkPolicy 可隔离控制与数据流
- Router→Worker 通讯低延迟直连，避免额外 Proxy 路径

### Dynamo 与推理引擎融合方式

NVIDIA 明确支持利用 vLLM、SGLang 等开源推理引擎。两种集成方式：

| 方式 | 描述 | 推荐度 |
|------|------|--------|
| **嵌入式（推荐）** | Prefill/Decode 进程嵌入引擎库，直接使用其批处理和缓存能力 | 最佳实践 |
| RPC 通信式 | Dynamo 通过 RPC 与独立 vLLM Serve 服务通信 | 不推荐（增加网络延迟和双层 Cache 复杂度） |

嵌入式方式可直接利用：
- vLLM 的连续批处理（Continuous Batching）算法
- SGLang 的 RadixAttention 缓存优化

---

## 与 K8s 原生能力的关系

### 节点池与设备插件

- AKS 原生支持 GPU 节点池（N 系列 VM）+ NVIDIA Device Plugin
- 单 GPU Pod 隔离：`nvidia.com/gpu: 1` 资源请求确保独占
- 大型模型载入加速：GPUDirect Storage (GDS) + Container Image Streaming

### 弹性扩缩：HPA/KEDA vs Dynamo Planner

| 方案 | 适用场景 | 特点 |
|------|---------|------|
| **Dynamo SLA Planner** | GPU Worker Pods | 基于实时 TTFT 等指标，Prometheus 180s 历史数据预测负载 |
| K8s HPA | 前端 Pods | 基于 QPS/CPU，调度粒度最小 1 分钟 |
| KEDA | 突发负载 | 事件驱动，跟踪队列长度触发扩缩容 |

推荐：GPU Worker 用 Dynamo Planner（速度和精度高于 HPA），前端 Pod 用 HPA/KEDA。

### 拓扑感知调度

- **Dynamo Grove**：K8s Operator，确保 Prefill & Decode Pod 共同调度到 NVLink/NVSwitch 相连的近距节点
- AKS 提供 Managed Device Plugin 和 Dynamic Resource Allocation (DRA)
- 提升多 GPU 通信效率，优化跨 GPU 的 Prefill/Decode 协作

---

## 数据与请求流

```
用户请求 (OpenAI API)
    │
    ▼
Dynamo 前端（Router 动态决策：基于 KV 缓存命中率、负载）
    │
    ▼
Prefill Pod（处理 Prompt Embedding + 编码，GPU 计算密集）
    │  KV Cache 通过 JetStream 低延迟通道分发
    ▼
Decode Pod（续解上下文，逐 token 生成，内存密集）
    │
    ▼
Dynamo 前端（流式转发 token → 客户端即时输出）
```

- 数据流完全在 AKS 集群内部，无额外出集群通信
- NIXL（NVIDIA Inference Transfer Library）优化 GPU 间数据传输
- GPUDirect Storage 支持 NVMe 直连读取模型
- ACR 提供模型镜像存储和内容分发加速

---

## 高并发、长上下文、多模型场景适配

### 高并发推理

- vLLM/SGLang 原生擅长 Continuous/Merged Batching
- Dynamo Router 动态聚合多请求组批，充分加载 GPU
- vLLM Headless 模式：多 EngineCore 实例均衡负载
- Prefill/Decode 分离 + 混合并行 → 高并发吞吐近乎线性扩展

### 长上下文/流式

- vLLM PagedAttention + SGLang RadixAttention：复用已计算前缀 KV 向量
- Dynamo KV 感知路由：共用上下文的请求路由至缓存命中 Pod
- Prefill/Decode 分离：长上下文 embedding 移至专用 Prefill Pod
- 实测：Prefill/Decode 解耦模式下，70B 模型 TTFT 缩短 2~3 倍

### 多模型、多租户

- vLLM 支持多 LoRA 和多后端扩展
- Dynamo 前端按 model 参数分流请求到不同 Worker 集群
- 多租户隔离：命名空间/NodePool 隔离 + Quota + PriorityClass + NetworkPolicy + RBAC

### 典型场景收益对比

| 场景 | 收益 | 说明 |
|------|------|------|
| 交互式 Chatbot/Agent | 强优势 | 多轮对话 KV Cache Pinning 数倍提升，TTFT 降至原 1/4 |
| 后台批量生成 | 部分适用 | vLLM Continuous Batching 已足够，Dynamo 提供吞吐扩展 |
| RAG/文档问答 | 显著收益 | 长上下文 cache + 跨 Pod KV 共享 + Agentic 多阶段智能调度 |
| 混合工作负载（CV+LLM） | 部分可行 | 需 MIG/Time-Slice 隔离，PriorityClass 调度 |

---

## 性能与成本评估

### 性能指标

| 指标 | 提升效果 |
|------|---------|
| 吞吐量 | Dynamo+vLLM 在 8×H100 双节点下请求吞吐提高 3 倍以上；官方报告 Dynamo 可提升 50 倍（DeepSeek 模型） |
| TTFT | Prefill/Decode 分离消除资源抢占，SGLang RadixAttention 降低 30~50%，实测 p99 < 0.5s |
| GPU 利用率 | 4×H100 通过 Dynamo+vLLM 组合提升平均负载 ≥90%（无 Dynamo 时仅 60~70%） |
| 批处理效率 | KV 级调度补偿批内短请求"提前完成闲置"的余力，提升软件管道效率 |

### 成本优化

- **按需扩容**：Dynamo Planner 按负载弹性增减 Pod，低谷缩减、峰值扩充，资源按需支付
- **批次充分**：Continuous Batching 提高单 GPU 吞吐，每 token 成本下降
- **缓存利用**：跨 Pod 重用 KV 缓存，显著降低冗余算力开销
- **规模效应**：Pod 实例 < 3~4 个 GPU 时，调度开销可能抵消收益

### 适用判断

- **需要组合架构**：≥2 GPU、高峰 QPS 高、SLA 苛刻的生产场景
- **无需组合架构**：单 GPU 够用、低并发，单纯 vLLM/SGLang 即可

---

## 运维与安全

### 部署

- **镜像构建**：基于 `vllm/vllm-openai` + Dynamo Rust 二进制/py 包，Prefill/Decode 同一镜像（环境变量控制模式）
- **CI/CD**：ACR 存储镜像，Rolling Update 或 Blue-Green 部署
- **扩容**：GPU Worker 用 Dynamo Planner，前端用 HPA/KEDA

### 观测

| 层面 | 工具 | 指标 |
|------|------|------|
| 应用层 | Dynamo Prometheus metrics | TTFT、吞吐、Token 生成速率 |
| GPU 层 | DCGM Exporter + AKS Managed Prometheus | GPU 利用率、显存 |
| 日志 | Azure Monitor Log Analytics | 请求跟踪 ID、OOM 异常 |
| 追踪 | OpenTelemetry + Azure AppInsights | 端到端调用链 |
| 调优 | KAITO Operator | Batch 参数、TP/PP/DP 配置 |

### 安全

- **镜像安全**：ACR + RBAC + Azure AD 限定拉取权限
- **密钥管理**：K8s Secret 挂载 API Key/模型下载 Token，RBAC 限制访问
- **网络隔离**：NetworkPolicy 隔离控制平面与数据平面

### 故障容错

- Pod 级：Dynamo 自动将请求重路由至健康 Pod
- Node 级：AKS Node Problem Detector 监控 GPU 健康，标记 NoSchedule
- Prefill/Decode Pod 可独立重启，Dynamo 自动调整调度

---

## 风险与替代方案

### 潜在瓶颈

| 风险 | 描述 | 缓解方案 |
|------|------|---------|
| 复杂性 | 调试涉及跨 Pod 通信、缓存一致性 | 完善 Observability，团队培训 |
| Cache Miss | 上下文频繁变化导致缓存命中率低 | Prefix-aware routing + Session Token |
| 网络瓶颈 | 多节点依赖高速互联 | AKS HPC SKU (NDXXv5) + InfiniBand |
| 版本兼容 | Dynamo v1.x 仅支持特定 vLLM 版本 | 测试集群预验证，错开升级顺序 |
| 显存 OOM | 动态 KV offloading 需 NVMe 配合 | `--gpu-memory-utilization 0.8` + ACStor NVMe 池 |
| 团队能力 | 需 MLOps 团队熟悉 K8s + GPU 调优 | 非大规模场景难 justify 收益 |

### 替代方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **单独 vLLM/SGLang** | 简单、文档完善、Azure Managed Endpoint 一键托管 | 单机 GPU 上限，无跨节点调度 | 小规模、低并发 |
| **Ray Serve** | 框架无关、Python 逻辑可扩展、支持多引擎 | 通用性导致性能略逊 | 复杂 AI 微服务 |
| **HuggingFace TGI** | 易用、低学习成本 | Peak 性能弱于 vLLM/SGLang | 快速原型、轻量部署 |
| **NVIDIA NIM** | 开箱即用、内置 TensorRT/Triton/Dynamo | 受限封装，灵活性低 | 企业版标准化部署 |

---

## 总结

在 AKS 上同时使用 NVIDIA Dynamo 与 vLLM/SGLang 部署 LLM 推理服务是一种成熟的高性能解决方案：

**适用条件**：上千 QPS、多模型部署、SLA 苛刻的生产环境
**核心收益**：吞吐线性扩展、TTFT 显著降低、GPU 利用率 ≥90%、成本按需摊薄
**代价**：工程复杂度高、团队能力要求高、运维监控需严格

**决策原则**：
- 单 GPU 够用 → 单用 vLLM/SGLang，简洁高效
- 多 GPU + 高并发 + 严格 SLA → Dynamo + vLLM/SGLang 分层架构
- 需要快速上线 → NVIDIA NIM 开箱即用
- 需要最大灵活性 → Ray Serve 定制方案
