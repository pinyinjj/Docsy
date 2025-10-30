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

**设备发现脚本 `wifi_discover.sh`**

```bash
#!/bin/bash

# WiFi设备发现脚本
echo "🔍 正在扫描局域网中的Android设备..."

# 获取本机IP段
LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
NETWORK=$(echo $LOCAL_IP | cut -d. -f1-3).0/24

echo "📡 扫描网络: $NETWORK"

# 扫描ADB端口
DEVICES=$(nmap -p 5555 --open $NETWORK 2>/dev/null | grep -E "Nmap scan report|5555/tcp" | grep -B1 "5555/tcp" | grep "Nmap scan report" | awk '{print $5}')

if [ -z "$DEVICES" ]; then
    echo "❌ 未发现任何Android设备"
    echo "请确保："
    echo "1. 设备已启用无线调试"
    echo "2. 设备与计算机在同一网络"
    echo "3. 设备已通过USB初始化过TCP/IP调试"
else
    echo "📱 发现以下设备："
    for device in $DEVICES; do
        echo "  - $device:5555"
    done
    
    echo ""
    echo "💡 连接命令示例："
    for device in $DEVICES; do
        echo "  adb connect $device:5555"
    done
fi
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

### 3.4 设备管理脚本

#### 通用设备管理脚本 `device_manager.sh`

```bash
#!/bin/bash

# 设备管理脚本
DEVICE_LIST=$(adb devices | grep -v "List of devices" | grep "device" | awk '{print $1}')

if [ -z "$DEVICE_LIST" ]; then
    echo "❌ 没有检测到连接的设备"
    exit 1
fi

echo "📱 检测到以下设备："
echo "$DEVICE_LIST"
echo ""

# 选择设备
select device in $DEVICE_LIST "退出"; do
    case $device in
        "退出")
            echo "👋 退出设备管理"
            exit 0
            ;;
        *)
            if [ -n "$device" ]; then
                echo "✅ 已选择设备: $device"
                export SELECTED_DEVICE=$device
                break
            else
                echo "❌ 无效选择，请重试"
            fi
            ;;
    esac
done
```

#### WiFi自动重连脚本 `wifi_auto_reconnect.sh`

```bash
#!/bin/bash

# WiFi自动重连脚本
DEVICE_IP=$1
PORT=${2:-5555}
CHECK_INTERVAL=${3:-30}

if [ -z "$DEVICE_IP" ]; then
    echo "用法: $0 <设备IP地址> [端口] [检查间隔秒数]"
    echo "示例: $0 192.168.1.100 5555 30"
    exit 1
fi

echo "🔄 启动自动重连监控..."
echo "设备: $DEVICE_IP:$PORT"
echo "检查间隔: ${CHECK_INTERVAL}秒"
echo "按 Ctrl+C 停止监控"
echo ""

while true; do
    # 检查设备是否连接
    if ! adb devices | grep -q "$DEVICE_IP:$PORT"; then
        echo "$(date): ❌ 设备断开，尝试重连..."
        adb connect $DEVICE_IP:$PORT
        
        if adb devices | grep -q "$DEVICE_IP:$PORT"; then
            echo "$(date): ✅ 重连成功"
        else
            echo "$(date): ❌ 重连失败"
        fi
    else
        echo "$(date): ✅ 设备连接正常"
    fi
    
    sleep $CHECK_INTERVAL
done
```

#### 一键启动脚本 `start_scrcpy.sh`

```bash
#!/bin/bash

# 一键启动scrcpy脚本
echo "🚀 启动scrcpy Android调试..."

# 检查设备连接
DEVICES=$(adb devices | grep -v "List of devices" | grep "device" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ 没有检测到连接的设备"
    echo "请确保："
    echo "1. 设备已连接并启用USB调试"
    echo "2. 已授权计算机调试"
    exit 1
elif [ "$DEVICES" -eq 1 ]; then
    echo "✅ 检测到1个设备，直接启动scrcpy"
    scrcpy --max-size 1920 --bit-rate 8M --stay-awake
else
    echo "📱 检测到多个设备，请选择："
    adb devices
    echo ""
    read -p "请输入设备ID: " device_id
    scrcpy -s "$device_id" --max-size 1920 --bit-rate 8M --stay-awake
fi
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

**问题2：权限被拒绝**
```bash
# 添加udev规则
sudo nano /etc/udev/rules.d/51-android.rules

# 添加以下内容（替换VENDOR_ID）
SUBSYSTEM=="usb", ATTR{idVendor}=="VENDOR_ID", MODE="0666", GROUP="plugdev"

# 重新加载规则
sudo udevadm control --reload-rules
sudo udevadm trigger
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

### 3.6 安全注意事项

#### USB调试安全
- 仅在受信任的计算机上启用
- 使用完毕后及时关闭
- 定期检查已授权的设备

#### WiFi调试安全
- 仅在受信任的WiFi网络中使用
- 避免在公共WiFi上启用无线调试
- 使用强密码保护WiFi网络
- 定期检查已配对的设备
- 使用完毕后及时断开连接

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

## 5. 文件传输功能

### 5.1 通过ADB传输文件

```bash
# 推送文件到设备
adb push /path/to/local/file.txt /sdcard/Download/

# 从设备拉取文件
adb pull /sdcard/Download/file.txt /path/to/local/

# 批量传输
adb push /path/to/folder/ /sdcard/Download/
```

### 5.2 通过scrcpy拖拽传输

1. **启用文件拖拽功能**：
```bash
scrcpy --push-target /sdcard/Download/
```

2. **拖拽文件到scrcpy窗口**，文件会自动传输到Android设备

### 5.3 文件传输脚本

创建文件传输脚本 `file_transfer.sh`：

```bash
#!/bin/bash

# 文件传输脚本
DEVICE_ID=$1
FILE_PATH=$2
TARGET_PATH="/sdcard/Download/"

if [ -z "$DEVICE_ID" ] || [ -z "$FILE_PATH" ]; then
    echo "用法: $0 <设备ID> <文件路径>"
    echo "示例: $0 1234567890ABCDEF /home/user/document.pdf"
    exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
    echo "❌ 文件不存在: $FILE_PATH"
    exit 1
fi

echo "📤 正在传输文件..."
adb -s "$DEVICE_ID" push "$FILE_PATH" "$TARGET_PATH"

if [ $? -eq 0 ]; then
    echo "✅ 文件传输成功"
    echo "📁 目标位置: $TARGET_PATH$(basename "$FILE_PATH")"
else
    echo "❌ 文件传输失败"
    exit 1
fi
```

## 6. 剪贴板同步

### 6.1 启用剪贴板同步

```bash
# 启用剪贴板同步
scrcpy --clipboard-autosync

# 双向剪贴板同步
scrcpy --clipboard-autosync --forward-all-clipboard
```

### 6.2 剪贴板操作

- **Ubuntu → Android**：在Ubuntu中复制，在Android应用中粘贴
- **Android → Ubuntu**：在Android中复制，在Ubuntu应用中粘贴

## 7. 故障排查

### 7.1 常见问题

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

**问题2：权限被拒绝**
```bash
# 添加udev规则
sudo nano /etc/udev/rules.d/51-android.rules

# 添加以下内容（替换VENDOR_ID）
SUBSYSTEM=="usb", ATTR{idVendor}=="VENDOR_ID", MODE="0666", GROUP="plugdev"

# 重新加载规则
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**问题3：scrcpy启动失败**
```bash
# 检查设备连接
adb devices

# 检查scrcpy版本
scrcpy --version

# 使用详细模式启动
scrcpy --verbose
```

### 7.2 性能优化

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
