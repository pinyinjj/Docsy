---
title: "QGroundControl 基于官方文档的容器化构建"
date: 2025-09-11
summary: "本文档介绍了如何使用官方推荐的容器化方法，在 Linux 环境下为 QGroundControl v5.0.6 Stable 版本进行二次开发和构建。内容涵盖环境要求、源码获取、Docker 构建流程、运行验证及常见问题。"
tags: ["QGroundControl", "Docker", "地面站", "Qt"]
categories: ["技术文档"]
weight: 10
---


本文档基于 QGroundControl v5.0.6 Stable 的二次开发，使用最简单稳定的容器构建方法，也是官方强烈推荐的构建方法。



### 环境要求
- Linux（已在 Ubuntu 上验证）
- Git、Docker、bash

### 获取源码
- 使用递归方式获取 v5.0.6 Stable，并自动拉取所有子模块（不要直接下载仓库 ZIP 或发布源码包，容易缺少子模块）。

```bash
git clone --recursive --branch v5.0.6 https://github.com/mavlink/qgroundcontrol.git
```

- 拉取完成后，仓库目录大小通常应在 400MB 以上；若明显偏小，请重新以递归方式克隆。

### 构建（Docker）
- 在仓库根目录执行：

```bash
./deploy/docker/run-docker-ubuntu.sh
```

- 首次编译耗时较长（取决于机器配置）。出现如下日志表示编译完成并生成可运行产物：

```bash
Making AppRun file executable:  /project/build/AppDir/AppRun
```

### 运行与版本校验
- 可直接运行生成的 `build/AppDir/AppRun`：

```bash
./build/AppDir/AppRun
```

- 应用打开后，点击左上角图标，在下拉框底部可见版本号为 `v5.0.6 64bit`，以此确认构建版本正确。

### 常用工具与别名（可选）
- 为避免私有仓库配置繁琐，可使用 GitHub Desktop（Linux AppImage 版本）。
- 建议在 `~/.bashrc` 中添加快捷别名：

```bash
# 编辑配置文件
nano ~/.bashrc

# 为 AppImage 增加执行权限
chmod +x ~/GitHubDesktop-linux-x86_64-3.4.13-linux1.AppImage

# 添加别名（可直接在编辑器中追加到 ~/.bashrc）
alias qgcdev='~/qgroundcontrol/build/AppDir/AppRun'
alias github='~/GitHubDesktop-linux-x86_64-3.4.13-linux1.AppImage'

# 使配置生效
source ~/.bashrc

# 快速启动
qgcdev   # 打开二次开发的 QGC v5.0.6
github   # 打开 GitHub Desktop for Linux
```

### 开发工作流
- 每次新增功能或修复请创建独立分支；不要直接推送到 `main`。
- 修改代码后，重复执行 `./deploy/docker/run-docker-ubuntu.sh` 进行增量构建与验证。

### 常见问题
- 子模块缺失：确保使用 `--recursive` 克隆；若仓库体积明显小于 400MB，请重新克隆。
- 构建失败：优先对照官方容器构建指南，确认本地 Docker 环境与网络条件正常。

### 参考文档
- 官方容器构建指南（中文）：[QGC Dev Guide / Getting Started / Container](https://docs.qgroundcontrol.com/Stable_V5.0/zh/qgc-dev-guide/getting_started/container.html)