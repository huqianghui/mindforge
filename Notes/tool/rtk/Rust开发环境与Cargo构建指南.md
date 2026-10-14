---
title: Rust 开发环境与 Cargo 构建指南
created: 2026-04-15
tags:
  - rust
  - cargo
  - rustup
  - cli
  - rtk
---

# Rust 开发环境与 Cargo 构建指南

本文整理 Rust 工具链的核心概念和日常开发命令，以 RTK 项目为实例。

---

## 1. 三者关系：rustup / rustc / cargo

```
rustup（工具链管理器）
  ├── rustc（编译器）      — 把 .rs 源码编译成二进制
  ├── cargo（包管理+构建）  — 管理依赖、调用 rustc、运行测试
  └── std library（标准库） — Rust 标准库
```

### rustup — 版本管理器

安装脚本：https://sh.rustup.rs

rustup 是 Rust 的版本管理工具，类似于 Node.js 的 nvm 或 Python 的 pyenv。它负责：

- 安装和管理 rustc、cargo、标准库
- 切换 Rust 版本（stable / nightly / beta）
- 更新工具链（`rustup update`）

你只需要运行一次安装脚本，它会把 rustc、cargo 等全部装好。

### rustc — 编译器

底层的 Rust 编译器。理论上可以直接用：

```bash
rustc main.rs -o myapp    # 编译单个文件
```

但实际项目没人这样用，因为要手动管理依赖和编译顺序，非常麻烦。

### cargo — 构建系统 + 包管理器

日常开发**只用 cargo**，它在背后自动调用 rustc：

```bash
cargo build    # 读取 Cargo.toml，下载依赖，调用 rustc 编译所有文件
cargo test     # 编译测试，然后运行
cargo run      # 编译，然后执行
```

---

## 2. Crate——Rust 的核心概念

**Crate** 是 Rust 里的"编译单元 + 包发布单元"，可以理解为 Rust 世界里的"模块包"。

最实用的理解：

- 一个 crate 是**一次编译的基本单位**
- 一个 crate 会产出一个目标：可执行程序或库
- 在 crates.io 上发布的依赖，基本也是一个个 crate

### 两类 Crate

| 类型 | 入口文件 | 产出 | 示例 |
|------|---------|------|------|
| **Binary crate**（可执行） | `src/main.rs` | 可执行文件 | RTK 项目本身 |
| **Library crate**（库） | `src/lib.rs` | 供其他 crate 调用 | anyhow、regex |

### 在 RTK 项目中的对应

- 当前项目 `rtk` 本身就是一个 crate（由 `Cargo.toml` 定义）
- `[dependencies]` 里写的 `anyhow`、`clap`、`regex` 都是外部 crate

### 与其他语言类比

| Rust | 其他语言 | 说明 |
|------|---------|------|
| crate | Go 的 module/package | 混合概念 |
| crate | npm 的 package | 用于依赖发布 |
| — | — | 但 Rust 的 crate 更强调"**编译边界**" |

### Crate vs Package（易混淆）

- **Package**（Cargo package）是 Cargo 的项目层概念——对应一个 `Cargo.toml`
- 一个 package 可以包含**一个或多个 crate**（例如一个库 crate + 多个二进制 crate）

---

## 3. 与其他语言的类比

| Rust | Node.js | Python | Java |
|------|---------|--------|------|
| rustup | nvm | pyenv | sdkman |
| rustc | node (V8) | python | javac |
| cargo | npm / pnpm | pip + setuptools | maven / gradle |
| Cargo.toml | package.json | pyproject.toml | pom.xml |
| crates.io | npmjs.com | pypi.org | Maven Central |

**简单说**：
- 你只需要跟 **cargo** 打交道，它处理一切
- **rustc** 在背后被 cargo 自动调用，你不需要直接使用
- **rustup** 只在安装/更新 Rust 版本时用

---

## 4. 开发模式运行（以 RTK 为例）

开发时最常用的几条命令：

```bash
# 进入项目根目录
cd /Users/huqianghui/Downloads/1.github/rtk

# 开发模式编译
cargo build

# 直接运行程序
cargo run -- --help

# 运行某个具体命令
cargo run -- gain
cargo run -- git status
```

> **`--` 很重要**——它表示后面的参数传给 rtk 程序本身，而不是传给 cargo。

---

## 5. 常见疑问

### 入口函数是不是默认 main.rs？

**是**。如果 `Cargo.toml` 里没有显式写 `[[bin]]` 配置，Cargo 默认把 `src/main.rs` 当作可执行程序入口（`main` 函数）。

### 依赖"安装"到哪里？

分两层：

| 层级 | 位置 | 说明 |
|------|------|------|
| **依赖源码与下载缓存**（全局） | `~/.cargo/registry`、`~/.cargo/git` | 所有项目共享，下载一次即可 |
| **依赖编译产物**（项目内） | `target/debug`、`target/release` | 每个项目独立编译 |

所以不像 npm 那样在项目里有 `node_modules`；**Rust 是全局缓存 + 项目构建产物**。

### 依赖都打进最终包了吗？

- 大多数 Rust crate 代码会被**静态链接**进最终二进制（尤其是纯 Rust 依赖）
- 但仍可能依赖**系统动态库**（例如 macOS 系统库）
- RTK 项目里 `rusqlite` 开了 `bundled` 特性，SQLite 会随构建一起打包（不依赖系统已有的 sqlite 开发包）

**一句话**：最终的 `rtk` 可执行文件通常已经包含绝大多数业务依赖逻辑，但不等于"完全零系统依赖"。

---

## 6. 发布构建与安装

### 生成正式可发布的二进制

```bash
cargo build --release
```

编译完成后，二进制在：

```
target/release/rtk
```

可以这样运行：

```bash
./target/release/rtk --help
./target/release/rtk gain
./target/release/rtk git status
```

### 安装到本机命令

```bash
cargo install --path .
```

安装后就可以直接使用：

```bash
rtk --help
rtk gain
rtk git status
```

> RTK 本质上是一个 CLI 代理工具，所以"运行项目"通常不是启动 Web 服务，而是执行这个命令行程序本身。

---

## 7. 质量检查三件套

开发过程中建议顺手跑一下质量检查：

```bash
cargo fmt --all          # 代码格式化
cargo clippy --all-targets   # Lint 检查（类似 ESLint）
cargo test --all         # 运行全部测试
```

| 命令 | 作用 | 类比 |
|------|------|------|
| `cargo fmt` | 代码格式化 | Prettier / Black |
| `cargo clippy` | Lint 静态分析 | ESLint / Ruff |
| `cargo test` | 单元测试 + 集成测试 | Jest / pytest |

---

## 参考资料

- [Rust 官方文档](https://doc.rust-lang.org/book/)
- [Cargo 手册](https://doc.rust-lang.org/cargo/)
- [RTK GitHub 仓库](https://github.com/rtk-ai/rtk)
- [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](RTK系列01：Rust-Token-Killer简介.md)
