---
title: "Ubuntu 24.04 安装 ROS 2 Jazzy 完整指南"
date: 2025-11-06
summary: "在 Ubuntu Noble 24.04 系统上安装 ROS 2 Jazzy 的完整步骤，包括系统配置、ROS 2 安装、环境配置、FastDDS 通信测试、Turtlesim 模拟器使用和 rqt 图形工具基础配置。"
tags: ["ROS", "ROS 2", "Ubuntu", "Linux", "FastDDS", "仿真", "无人机"]
categories: ["学习笔记"]
weight: 10
draft: false
---

![ROS 2 Jazzy](/Docsy/images/jazzy-small.png)

## 什么是 ROS 2？

ROS 2（Robot Operating System 2）是 ROS 的下一代版本，是一个开源的机器人操作系统框架。ROS 2 专为现代机器人应用设计，提供了分布式计算、实时性能、多平台支持和更好的安全性等特性。

### ROS 2 的主要特点

- **分布式架构**：支持多机器人和多计算机之间的通信
- **实时性能**：提供实时通信和调度能力
- **跨平台支持**：支持 Linux、Windows 和 macOS
- **多种编程语言**：支持 C++、Python、Java 等
- **模块化设计**：通过节点（Node）和话题（Topic）实现松耦合的通信
- **丰富的工具链**：提供命令行工具、可视化工具（rqt）和调试工具

ROS 2 Jazzy 是 ROS 2 的一个长期支持（LTS）版本，支持 Ubuntu Noble 24.04 的 amd64 和 arm64 架构。在网络通畅的情况下，安装较为顺利，未发现明显问题。

## 1. 系统环境准备

### 1.1 设置 Locale

设置系统 locale 为 UTF-8 编码，确保 ROS 2 正常运行：

```bash
# 检查当前 locale
locale

# 如果不是 UTF-8，先安装 locales
sudo apt update && sudo apt install locales

# 生成 en_US.UTF-8 locale
sudo locale-gen en_US en_US.UTF-8

# 更新系统 locale
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

# 设置当前会话的 locale
export LANG=en_US.UTF-8

# 再次检查 locale 确认设置成功
locale
```

### 1.2 添加 ROS 2 APT 源

确保启用 Ubuntu Universe 仓库，并添加 ROS 2 的 APT 源：

```bash
# 安装软件属性管理工具
sudo apt install software-properties-common

# 启用 Universe 仓库
sudo add-apt-repository universe

# 安装 curl（如果尚未安装）
sudo apt update && sudo apt install curl -y

# 获取最新版本的 ROS APT 源包
export ROS_APT_SOURCE_VERSION=$(curl -s https://api.github.com/repos/ros-infrastructure/ros-apt-source/releases/latest | grep -F "tag_name" | awk -F\" '{print $4}')

# 下载 ROS 2 APT 源 deb 包
curl -L -o /tmp/ros2-apt-source.deb "https://github.com/ros-infrastructure/ros-apt-source/releases/download/${ROS_APT_SOURCE_VERSION}/ros2-apt-source_${ROS_APT_SOURCE_VERSION}.$(. /etc/os-release && echo ${UBUNTU_CODENAME:-${VERSION_CODENAME}})_all.deb"

# 安装 APT 源包
sudo dpkg -i /tmp/ros2-apt-source.deb
```

### 1.3 安装开发工具

```bash
# 更新包列表并安装 ROS 开发工具
sudo apt update && sudo apt install ros-dev-tools
```

## 2. 安装 ROS 2

### 2.1 安装 ROS 2 Desktop

```bash
# 更新系统包
sudo apt update
sudo apt upgrade

# 安装 ROS 2 Jazzy Desktop（包含可视化工具）
sudo apt install ros-jazzy-desktop
```

### 2.2 设置环境变量

```bash
# 临时设置当前会话的环境变量
source /opt/ros/jazzy/setup.bash
```

## 3. 测试 FastDDS 通信

FastDDS 是 ROS 2 的默认通信中间件。通过以下步骤测试安装是否成功：

1. **在第一个终端中启动 talker 节点**：

```bash
ros2 run demo_nodes_cpp talker
```

2. **在第二个终端中启动 listener 节点**：

```bash
# 先设置环境变量
source /opt/ros/jazzy/setup.bash

# 运行 listener
ros2 run demo_nodes_py listener
```

如果两个终端都能正常打印消息，说明安装成功：

![FastDDS 测试](/Docsy/images/fastdds_demo.png)

## 4. 配置 Shell 启动脚本

ROS 2 的 shell 工作区概念允许在同一台电脑上同时安装多个不同版本的 ROS，通过启动脚本来切换版本。如果不加载安装文件，您将无法访问 ROS 2 命令，也无法查找或使用 ROS 2 软件包。

### 4.1 添加到 ~/.bashrc

```bash
# 编辑 ~/.bashrc 文件（使用您喜欢的编辑器，如 nano、vim 或 subl）
nano ~/.bashrc

# 或者使用 Sublime Text
subl ~/.bashrc
```

在文件末尾添加以下内容：

```bash
source /opt/ros/jazzy/setup.bash
```

### 4.2 使配置生效

```bash
# 重新加载配置
source ~/.bashrc
```

### 4.3 验证配置

打开一个新的命令行窗口，直接输入 `ros2`，如果显示如下内容，说明配置成功：

![ROS 2 初始化](/Docsy/images/ros2_init.png)

## 5. 使用 Turtlesim

Turtlesim 是一个轻量级的 ROS 2 学习模拟器。它以最基本的层面演示了 ROS 2 的功能，让您了解以后使用真实机器人或机器人模拟器时会遇到的问题。

### 5.1 安装 Turtlesim

```bash
sudo apt update
sudo apt install ros-jazzy-turtlesim
```

### 5.2 验证安装

```bash
ros2 pkg executables turtlesim
```

如果显示以下内容，说明安装成功：

```text
turtlesim draw_square
turtlesim mimic
turtlesim turtle_teleop_key
turtlesim turtlesim_node
```

### 5.3 运行 Turtlesim

1. **启动 Turtlesim 节点**：

```bash
ros2 run turtlesim turtlesim_node
```

2. **在另一个终端中启动键盘控制节点**：

```bash
ros2 run turtlesim turtle_teleop_key
```

保持 `turtle_teleop_key` 的窗口处于激活状态，通过方向键可以控制乌龟移动。此时乌龟指代的是无人机的移动和控制方式。

![Turtlesim 键盘控制](/Docsy/images/turtle_teleop_key.png)

## 6. 安装和使用 rqt

rqt 是 ROS 2 的图形用户界面 (GUI) 工具。rqt 中的所有操作都可以在命令行中完成，但 rqt 提供了一种更友好的方式来操作 ROS 2 元素。

### 6.1 安装 rqt

```bash
sudo apt update
sudo apt install '~nros-jazzy-rqt*'
```

### 6.2 运行 rqt

```bash
rqt
```

### 6.3 使用 rqt 调用服务

在 Turtlesim 运行时，可以通过 rqt 调用服务：

1. 从下拉菜单选择 **Plugins** → **Services** → **Service Caller**
2. 选择服务 `/spawn`
3. 在此处可以直接调整生成位置（x、y 坐标）、实例名称等参数
4. 点击 **Call** 按钮

![rqt 服务调用器](/Docsy/images/rqt_services_servicecaller.png)

如果服务调用成功，您应该会看到一只新的海龟（同样是随机设计的）在您输入的 x 和 y 坐标处生成。

![调用 spawn 服务](/Docsy/images/call_spawn.png)

### 6.4 控制新创建的海龟实例

如果要控制新创建的实例 `turtle2`，可以在新的终端中执行：

```bash
ros2 run turtlesim turtle_teleop_key --ros-args --remap turtle1/cmd_vel:=turtle2/cmd_vel
```

然后在这个终端控制即可。

如果您刷新 rqt 中的服务列表，您还会看到除了 `/turtle1/...` 之外，现在还有与新海龟相关的服务 `/turtle2/...`。

---

## 参考文档

- [ROS 2 Jazzy 官方安装指南](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debians.html)
- [ROS 2 官方文档](https://docs.ros.org/en/jazzy/)
