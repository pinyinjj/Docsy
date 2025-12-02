---
title: "使用 Termux 在 Android 运行 Python 源码"
date: 2025-10-28
summary: "在真机用 Termux 运行/调试 Python：安装配置、ADB/scrcpy、部署与 SSH 管理，并提示常见兼容性注意事项。"
tags: ["Android", "Python"]
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

### 安装 Termux

**方法一：通过应用商店**
1. 从 F-Droid 或 Google Play 安装 Termux
2. 打开 Termux 应用

**方法二：通过 ADB 安装 APK**
```bash
# 下载 Termux APK 文件
# 从 https://f-droid.org/packages/com.termux/ 下载最新版本

# 通过 ADB 安装
adb install termux.apk

# 或者强制安装（覆盖现有版本）
adb install -r termux.apk

# 检查安装是否成功
adb shell pm list packages | grep termux
```

### ADB 连接与 scrcpy 远程桌面

**USB 连接（推荐）**
```bash
# 在开发机上执行
# 1. 使用 USB 线连接设备
# 2. 在设备上启用 USB 调试
# 3. 检查连接
adb devices

# 如果显示设备，说明连接成功
# 运行scrcpy打开安卓桌面
scrcpy
```

**无线 ADB 连接**

```bash
# 在开发机上执行
# 1. 确保两个设备在同一网段下，通过 USB 连接并启用无线调试
adb tcpip 5555

adb connect 192.168.1.100:5555

# 4. 检查连接
adb devices

# 运行scrcpy打开安卓桌面
scrcpy
```

### 基础环境配置

#### 1. 更新包管理器
```bash
# 在 Termux 中
# 更新包列表和系统
pkg update && pkg upgrade

# 清理缓存
pkg clean
```

#### 2. 一键安装所有依赖
```bash
# 在 Termux 中
# 安装核心依赖（纯 Python 项目，无需编译工具）
pkg install -y python python-pip git curl wget openssh iproute2 net-tools htop procps rsync tree neofetch android-tools rust clang make pkg-config

```

## 3. 项目部署

### 克隆项目
```bash
# 在 Termux 中
git clone url-to-project
cd url-to-project
```

### 安装依赖
```bash
# 在 Termux 中
# 安装 Python 依赖
pip install -r requirements.txt
```

### 运行项目
```bash
# 在 Termux 中
# 后台运行
nohup python start_backend.py > drone.log 2>&1 &

# 检查运行状态
ps aux | grep python
curl http://localhost:8000/health
```

### 文件传输
```bash
# 在开发机上执行
# 通过 ADB 传输文件
adb push local_file.txt /data/data/com.termux/files/home/

# 从设备拉取文件
adb pull /data/data/com.termux/files/home/log.log ./
```

## 4. 使用 Termius 进行 SSH/SFTP 管理（推荐）

Termius 是一款跨平台的 SSH 客户端，适合管理 Termux 主机：

- 可以为常用主机保存连接信息（主机、端口、用户名、密码/密钥）。
- 支持命令片段（Snippets），可一键执行常用指令（如重启服务、查看日志）。
- 内置 SFTP 文件管理，可直接浏览 `~` 与项目目录、上传/下载、查看与编辑文件。
- 云同步（可选），多设备共享配置；也可本地仅存储，避免隐私外泄。

示例配置：

1) 新建 Host：
   - Address: `localhost`（或手机局域网 IP）
   - Port: `8022`（对应 `adb forward tcp:8022 tcp:22`）
   - Username: `u0_a...`（Termux 默认交互用户，或留空用密码登录）
   - Password: 设置为你在 Termux 中的密码（如 `termux123`，建议修改）

2) 新建 Snippet（命令片段）：
   - 查看服务日志：`tail -f ~/path-to-project/log.log`
   - 重启服务：`pkill -f "python start_backend.py" && nohup python ~/path-to-project/start_backend.py > ~/path-to-project/log.log 2>&1 &`

3) 使用 SFTP：
   - 直接进入 `~/path-to-project/`，上传/下载 `requirements.txt`，`log.log` 等文件。
   - 可视化查看目录结构，便于排查路径与权限问题。

---

## 参考文档

- [Termux 官网](https://termux.dev)
- [Termux Wiki](https://wiki.termux.com)
- [F-Droid Termux 页面](https://f-droid.org/packages/com.termux/)
- [Android ADB 文档](https://developer.android.com/tools/adb)
- [scrcpy 项目主页](https://github.com/Genymobile/scrcpy)
