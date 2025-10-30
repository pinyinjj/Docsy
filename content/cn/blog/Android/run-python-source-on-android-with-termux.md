---
title: "使用 Termux 在 Android 运行 Python 源码"
date: 2025-10-28
summary: "在真机用 Termux 运行/调试 Python：安装配置、ADB/scrcpy、部署与 SSH 管理，并提示常见兼容性注意事项。"
tags: ["Android", "Python", "技术文档"]
categories: ["技术文档"]
weight: 10
---

## 1. 为什么是 Termux

- 构建原生 Android App 成本高：需要完整的 SDK/NDK、Gradle、签名、打包与多 ABI 适配，调试周期长。
- 直接验证业务逻辑：很多场景只需在设备上跑 Python 后端/脚本（算法、接口、数据处理），无须先做 APK 封装。
- 环境接近真实设备：在手机本机 I/O、网络、性能与权限模型下验证代码，比纯模拟器/PC 更接近真实表现。
- 快速迭代：通过 ADB/SSH 同步代码，立即运行与观察日志，缩短问题定位与修复时间。

#### 注意事项

- 环境差异：Termux 基于 Android/Linux 用户空间，和标准 Linux 发行版存在差异，某些系统调用/路径不可用。
- Python 包兼容性：依赖原生扩展（C/C++/Fortran）的包在 Termux 上可能无法编译或运行（如依赖特定 glibc/系统接口）。
  - 优先选择纯 Python 包或提供 aarch64 预编译 wheels 的发行版。
  - 必要时安装 `clang`,`rust`,`make`,`pkg-config` 再尝试编译，但仍可能失败。
- 官方不保证兼容：部分上游项目明确不支持 Termux/Android 平台，出现问题时官方可能不修复。
- 版本固定：建议在 `requirements.txt` 固定依赖版本，避免因上游升级导致不可预期的构建/运行失败。

## 2. Termux 安装和配置

...（与本地一致，略） ...
