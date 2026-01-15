---
title: "WSL2 环境下 PX4 SITL 多端口 MAVLink 配置指南"
date: 2025-01-15
summary: "介绍在 WSL2 环境中通过修改 PX4 启动脚本 rcS 实现自动开启多个 MAVLink 端口的方法，解决 SITL 仿真中多个设备同时连接飞控的问题，适用于多智能体控制和可视化场景。"
tags: ["WSL2", "Windows", "PX4", "SITL", "AirSim", "MAVLink", "仿真", "飞控", "QGroundControl"]
categories: ["技术文档"]
weight: 10
draft: false
---

## 1. 概述

本文档介绍在 WSL2 环境下配置 PX4 1.16.0 stable 版本与 AirSim 1.8.1 进行软件在环（SITL）仿真时，如何通过修改 `rcS` 启动脚本实现自动开启多个 MAVLink 端口，解决多个设备（如 QGroundControl, MAVROS, MAVSDK 等）同时连接飞控的问题。

## 2. 环境准备

### 2.1 系统要求

- **操作系统**：Windows 10/11 with WSL2
- **WSL2 发行版**：Ubuntu 20.04 或更高版本
- **PX4 版本**：1.16.0 stable
- **AirSim 版本**：1.8.1
- **PX4 源码路径**：`C:\Users\Administrator\PX4\PX4-Autopilot`


## 3. 自动端口开放配置

### 3.1 问题背景

在 AirSim 的 SITL 文档中，开启 PX4 SITL 的命令为 `make px4_sitl_default none_iris`。在此模式下，PX4 默认绑定的地址（如 UDP 14550/14580 或 TCP 4560 等）**仅能同时接受一个连接**。

当需要使用多个设备（如 QGroundControl, MAVSDK, MAVROS 等）同时连接 SITL 飞控时，需要在 PX4 命令行中手动执行开启端口的命令（如 `mavlink start -u 14550 -o 14550` 等）才能打开另一个端口。

经测试，**可能因 WSL2 的网络配置特殊性**，在 WSL2 上同时部署 **MAVLink Router** 或 **MAVProxy** 均不能实现在真实的机载计算机上实现的串口/端口路由功能。当需要使用多个设备连接 SITL 飞控时，每次启动飞控就需要手动开启多个端口，特别麻烦。

### 3.2 修改 rcS 启动脚本实现自动开启多个端口

通过在 PX4 的启动脚本 `rcS` 中添加 `mavlink start` 命令，可以在每次编译和启动时自动开启多个 MAVLink 端口，实现多个设备同时连接。这在需要同步进行可视化或多智能体控制无人机的仿真场景下十分有用。如果某个设备只需要收到 `MAVLink` 数据，而无需发出控制命令到飞控，则仅需通过 `QGroundControl` 的 MAVLink 转发或其他方式转发即可。

**文件路径**：`C:\Users\Administrator\PX4\PX4-Autopilot\ROMFS\px4fmu_common\init.d-posix\rcS`

在 `rcS` 文件中添加以下内容（建议在文件末尾，MAVLink 相关配置部分之后添加）：

```bash
# 开启额外的 MAVLink UDP 端口
# 端口 14550：用于 QGroundControl 地面站连接
mavlink start -u 14550 -o 14550 -t 192.168.31.88 -r 1000000

# 端口 14560：用于 MAVROS 连接
mavlink start -u 14560 -o 14560 -t 192.168.31.77 -r 1000000

# 端口 14540：用于 MAVSDK-Python 或其他应用连接
mavlink start -u 14540 -o 14540 -t 192.168.31.66 -r 1000000
```

**命令参数说明**：

- `-u <端口>`：指定本地 UDP 端口，PX4 在此端口上监听和发送数据
- `-o <端口>`：指定远程 UDP 端口（通常与本地端口相同）
- `-t <IP地址>`：指定伙伴 IP 地址（可选，用于指定数据发送的目标 IP）。使用此参数可以将 MAVLink 数据直接发送到指定 IP 地址的设备，实现与多个不同设备的定向连接
- `-r <速率>`：设置最大发送数据速率（字节/秒），`1000000` 表示 1MB/s

### 3.3 验证端口开启状态

启动 PX4 SITL 后，可以通过以下方式验证端口是否成功开启：

```bash
# 在 PX4 SITL 的命令行中执行
mavlink status

# 或使用 netstat 检查端口监听状态
netstat -an | grep -E "14540|14550|14560"

# 或使用 ss 命令（Linux）
ss -ulnp | grep -E "14540|14550|14560"
```

如果配置正确，应该能看到多个 UDP 端口处于监听状态，不同的应用可以连接到不同的端口，实现同时访问飞控。

---

## 参考文档

- [PX4 官方文档 - SITL 仿真](https://docs.px4.io/main/en/simulation/)
- [AirSim 官方文档](https://microsoft.github.io/AirSim/)
- [WSL2 网络配置指南](https://docs.microsoft.com/zh-cn/windows/wsl/networking)
