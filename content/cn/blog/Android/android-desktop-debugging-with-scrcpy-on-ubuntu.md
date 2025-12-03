---
title: "在 Ubuntu 使用 scrcpy 进行 Android 桌面调试"
date: 2025-10-28
summary: "使用scrcpy实现Ubuntu对Android设备的直接控制，包括屏幕镜像、文件传输、复制粘贴等功能的完整配置和使用指南。支持多设备管理和ADB调试。"
tags: ["Android", "Ubuntu", "Linux", "实用工具"]
categories: ["技术文档"]
weight: 10
---

scrcpy 是一个开源的 Android 屏幕镜像工具，允许用户通过 USB 或 WiFi 将Android 设备屏幕镜像到 Ubuntu 桌面，并支持鼠标键盘控制、文件传输、剪贴板同步等功能。

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
- **USB调试**
- **USB调试（安全设置）**
- **USB安装**
- **USB调试（安全设置）**


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


### 3.3 多设备管理

#### 查看连接的设备

```bash
# 列出所有连接的设备
adb devices

# 详细设备信息
adb devices -l

# 查看设备属性
adb shell getprop ro.product.model
```

#### 多设备操作

```bash
# 指定设备执行命令
adb -s 1234567890ABCDEF shell ls /sdcard/

# 向指定设备推送文件
adb -s 1234567890ABCDEF push local_file.txt /sdcard/

# 从指定设备拉取文件
adb -s 1234567890ABCDEF pull /sdcard/remote_file.txt ./

# 安装APK到指定设备
adb -s 1234567890ABCDEF install app.apk
```

#### 混合连接管理

```bash
# 同时管理USB和WiFi连接的设备
adb devices

# 预期输出示例：
# List of devices attached
# 1234567890ABCDEF    device          # USB设备
# 192.168.1.100:5555  device          # WiFi设备
# 192.168.1.101:5555  device          # WiFi设备

# 对USB设备操作
adb -s 1234567890ABCDEF shell ls /sdcard/

# 对WiFi设备操作
adb -s 192.168.1.100:5555 shell ls /sdcard/
```



### 3.5 连接故障排查

#### USB连接问题
```bash
# 检查USB连接
lsusb

# 重启ADB服务
adb kill-server
adb start-server

# 检查设备权限
ls -la /dev/bus/usb/
```

#### WiFi连接问题

**问题1：无法发现设备**
```bash
# 检查网络连通性
ping 192.168.1.100

# 检查端口是否开放
telnet 192.168.1.100 5555

# 检查防火墙设置
sudo ufw status
sudo ufw allow 5555
```

**问题2：连接不稳定**
```bash
# 检查网络质量
ping -c 10 192.168.1.100

# 调整ADB超时设置
export ADB_LOCAL_TRANSPORT_MAX_PORT=5585
export ADB_LOCAL_TRANSPORT_MIN_PORT=5585

# 重启ADB服务
adb kill-server
adb start-server
```

**问题3：配对失败**
```bash
# 清除配对信息
adb pair --clear

# 重新配对
adb pair 192.168.1.100:37017

# 检查配对码是否正确
```

## 4. scrcpy使用指南

### 4.1 基础使用

```bash
# 基本启动（自动选择第一个设备）
scrcpy

# 指定设备启动
scrcpy -s 1234567890ABCDEF

# 指定设备名称启动
scrcpy -s "Galaxy S21"
```

### 4.2 常用参数配置

```bash
# 设置窗口大小
scrcpy --max-size 1920

# 设置比特率（提高画质）
scrcpy --bit-rate 8M

# 设置帧率
scrcpy --max-fps 60

# 全屏启动
scrcpy --fullscreen

# 保持屏幕常亮
scrcpy --stay-awake

# 关闭屏幕（仅镜像）
scrcpy --turn-screen-off
```

### 4.3 高级配置

```bash
# 自定义配置启动
scrcpy \
    --max-size 1920 \
    --bit-rate 8M \
    --max-fps 60 \
    --stay-awake \
    --disable-screensaver \
    --window-title "Android调试" \
    --always-on-top
```

### 4.4 文件传输功能

**通过ADB传输文件**

```bash
# 推送文件到设备
adb push /path/to/local/file.txt /sdcard/Download/

# 从设备拉取文件
adb pull /sdcard/Download/file.txt /path/to/local/

# 批量传输
adb push /path/to/folder/ /sdcard/Download/
```

**通过scrcpy拖拽传输**

1. **启用文件拖拽功能**：
```bash
scrcpy --push-target /sdcard/Download/
```

2. **拖拽文件到scrcpy窗口**，文件会自动传输到Android设备

### 4.5 剪贴板同步

**启用剪贴板同步**

```bash
# 启用剪贴板同步
scrcpy --clipboard-autosync

# 双向剪贴板同步
scrcpy --clipboard-autosync --forward-all-clipboard
```

**剪贴板操作**

- **Ubuntu → Android**：在Ubuntu中复制，在Android应用中粘贴
- **Android → Ubuntu**：在Android中复制，在Ubuntu应用中粘贴

## 5. 故障排查

### 5.1 常见问题

**问题1：设备未识别**
```bash
# 检查USB连接
lsusb

# 重启ADB服务
adb kill-server
adb start-server

# 检查设备权限
ls -la /dev/bus/usb/
```

**问题2：scrcpy启动失败**
```bash
# 检查设备连接
adb devices

# 检查scrcpy版本
scrcpy --version

# 使用详细模式启动
scrcpy --verbose
```

### 5.2 性能优化

```bash
# 降低画质提高性能
scrcpy --max-size 1280 --bit-rate 2M

# 关闭音频（如果不需要）
scrcpy --no-audio

# 使用硬件加速
scrcpy --encoder h264
```

---

## 参考文档

- [scrcpy官方文档](https://github.com/Genymobile/scrcpy)
- [Android ADB官方文档](https://developer.android.com/studio/command-line/adb)
- [Ubuntu Android开发环境配置](https://developer.android.com/studio/install)
