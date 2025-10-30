---
title: "在Ubuntu使用scrcpy进行Android桌面调试"
date: 2025-10-28
summary: "使用scrcpy实现Ubuntu对Android设备的直接控制，包括屏幕镜像、文件传输、复制粘贴等功能的完整配置和使用指南。支持多设备管理和ADB调试。"
tags: ["Android", "Ubuntu", "技术文档", "Linux"]
categories: ["技术文档"]
weight: 10
---

scrcpy是一个开源的Android屏幕镜像工具，允许用户通过USB或WiFi将Android设备屏幕镜像到Ubuntu桌面，并支持鼠标键盘控制、文件传输、剪贴板同步等功能。

## 1. 环境准备

### 1.1 安装依赖

```bash
# 更新包列表
sudo apt update

# 安装基础依赖
sudo apt install -y adb scrcpy

# 安装额外工具（可选）
sudo apt install -y android-tools-adb android-tools-fastboot
```

### 1.2 验证安装

```bash
# 检查ADB版本
adb version

# 检查scrcpy版本
scrcpy --version

# 检查设备连接
adb devices
```

## 2. Android设备配置

### 2.1 启用开发者选项

1. **进入设置** → **关于手机**
2. **连续点击"版本号"7次**，直到出现"您已处于开发者模式"
3. **返回设置** → **开发者选项**

### 2.2 启用USB调试

在开发者选项中启用：
- ✅ **USB调试**
- ✅ **USB调试（安全设置）**
- ✅ **USB安装**（可选，用于安装APK）
- ✅ **USB调试（安全设置）**

### 2.3 连接设备

```bash
# 通过USB连接设备
adb devices

# 预期输出示例：
# List of devices attached
# 1234567890ABCDEF    device
# 9876543210FEDCBA    device
```

## 3. ADB设备连接与管理

### 3.1 USB连接方式

#### 基础USB连接

```bash
# 通过USB连接设备
adb devices

# 预期输出示例：
# List of devices attached
# 1234567890ABCDEF    device
# 9876543210FEDCBA    device
```

#### USB连接故障排查

```bash
# 检查USB连接
lsusb

# 重启ADB服务
adb kill-server
adb start-server

# 检查设备权限
ls -la /dev/bus/usb/

# 添加udev规则（权限被拒绝时）
sudo nano /etc/udev/rules.d/51-android.rules
# 添加以下内容（替换VENDOR_ID）
SUBSYSTEM=="usb", ATTR{idVendor}=="VENDOR_ID", MODE="0666", GROUP="plugdev"

# 重新加载规则
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### 3.2 WiFi连接方式

#### WiFi调试原理

WiFi调试通过TCP/IP协议实现ADB连接，无需物理USB连接。这种方式特别适合：
- 设备距离计算机较远
- 需要同时连接多个设备
- 避免频繁插拔USB线
- 在设备充电时进行调试

#### 基础WiFi调试设置

**方法一：通过USB初始化（推荐）**

```bash
# 1. 通过USB连接设备
adb devices

# 2. 启用TCP/IP调试（端口5555）
adb tcpip 5555

# 3. 断开USB连接

# 4. 通过WiFi连接（需要知道设备IP）
adb connect 192.168.1.100:5555

# 5. 验证连接
adb devices
```

**方法二：通过WiFi直接连接（Android 11+）**

```bash
# 1. 在Android设备上启用"无线调试"
# 设置 → 开发者选项 → 无线调试

# 2. 点击"使用配对码配对设备"

# 3. 在Ubuntu上配对设备
adb pair 192.168.1.100:37017

# 4. 输入配对码

# 5. 连接设备
adb connect 192.168.1.100:5555
```

#### 获取设备IP地址

**方法一：通过Android设备查看**
```bash
# 在Android设备上查看IP
# 设置 → WiFi → 点击已连接的网络 → 查看IP地址
```

**方法二：通过ADB命令查看**
```bash
# 通过USB连接时查看IP
adb shell ip route | grep wlan

# 或者
adb shell ifconfig wlan0 | grep "inet addr"
```

**方法三：通过网络扫描**
```bash
# 安装网络扫描工具
sudo apt install nmap

# 扫描局域网中的Android设备
nmap -sn 192.168.1.0/24

# 扫描特定端口
nmap -p 5555 192.168.1.0/24
```

#### WiFi连接管理脚本

**基础连接脚本 `wifi_connect.sh`**

```bash
#!/bin/bash

# WiFi连接脚本
DEVICE_IP=$1
PORT=${2:-5555}

if [ -z "$DEVICE_IP" ]; then
    echo "用法: $0 <设备IP地址> [端口]"
    echo "示例: $0 192.168.1.100"
    echo "示例: $0 192.168.1.100 6666"
    exit 1
fi

echo "🔌 正在连接设备 $DEVICE_IP:$PORT..."

# 检查网络连通性
ping -c 1 $DEVICE_IP > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 无法ping通设备 $DEVICE_IP"
    echo "请检查："
    echo "1. 设备IP地址是否正确"
    echo "2. 设备是否在同一WiFi网络"
    echo "3. 设备是否在线"
    exit 1
fi

# 尝试连接
adb connect $DEVICE_IP:$PORT

if [ $? -eq 0 ]; then
    echo "✅ 连接成功"
    adb devices
else
    echo "❌ 连接失败，请检查："
    echo "1. 设备是否启用了无线调试"
    echo "2. 端口是否被占用"
    echo "3. 防火墙是否阻止连接"
    echo "4. 设备是否需要重新配对"
fi
```

...（后续略）
