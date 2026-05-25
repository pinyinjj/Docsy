---
title: "QGroundControl Docker 进阶构建指南"
date: 2025-10-28
summary: "使用Docker容器构建QGroundControl Android APK和Ubuntu的完整指南，包括环境配置、构建流程、签名管理、密钥生成和故障排查。提供交互式构建脚本和完整的Dockerfile配置。"
tags: ["QGroundControl", "Docker", "容器化", "Qt", "CMake", "编译", "地面站", "Android", "Ubuntu"]
categories: ["技术文档"]
weight: 10
---

> **版本约束：** 本文档基于 QGroundControl 5.0.6 版本编写

## 1. Android 构建


```bash
# 在项目根目录执行
./deploy/docker/run-docker-android.sh
```

### 依赖版本

| 组件 | 版本 |
|------|------|
| 基础镜像 | Ubuntu 22.04 |
| Java | OpenJDK 17 |
| Qt | 6.6.3 |
| Android SDK | 34 |
| Build Tools | 34.0.0 |
| NDK | 25.1.8937393 (25B) |
| Platform | android-28 (Android 9) |
| 构建工具 | CMake + Ninja |
| 时区 | Asia/Shanghai |

**Qt 版本详情：**

**为什么 Android 使用 Qt 6.6.3？**

在官方文档中，对QGC v5.0.6 的 Qt 版本要求明确指定为6.8.3,但因为NDK和Herelink兼容性问题，只能选择6.6.3进行编译。
1. **NDK 兼容性** - Qt 6.6.3 与 Android NDK 25.1.8937393 有最佳兼容性
2. **Herelink 支持** - 该版本对 Herelink 设备有完整的支持
3. **构建工具链** - 与 CMake 3.24+ 和 Android SDK 34 配合良好


**安装的 Qt 模块：**
- qtcharts, qtpositioning, qtspeech, qt5compat
- qtmultimedia, qtserialport, qtimageformats
- qtshadertools, qtconnectivity, qtquick3d
- qtsensors, qtlocation

### 1.1 支持版本

**架构支持：**
构建同时支持两种架构：
- `armeabi-v7a`（32位 ARM）
- `arm64-v8a`（64位 ARM）

**Android 版本支持：**

| 项目 | 版本 | 说明 |
|------|------|------|
| **最低版本 (minSdk)** | API 28 (Android 9.0) | 设备必须运行 Android 9.0 或更高版本 |
| **目标版本 (targetSdk)** | API 35 (Android 15) | 针对 Android 15 优化 |
| **编译版本 (compileSdk)** | API 34 (Android 14) | 使用 Android 14 SDK 编译 |

- ✅ Android 9.0 (Pie, API 28)
- ✅ Android 10 (Q, API 29)
- ✅ Android 11 (R, API 30)
- ✅ Android 12 (S, API 31)
- ✅ Android 12L (Sv2, API 32)
- ✅ Android 13 (T, API 33)
- ✅ Android 14 (U, API 34)
- ✅ Android 15 (V, API 35)


### 1.2 构建说明

**构建输出：**
```text
build/shadow_build_dir/android-build/build/outputs/apk/release/android-build-release.apk
```


**安装APK到设备：**

如果使用wifi连接adb设备

```bash
#在usb连接时
adb tcpip 5555
#之后使用
adb connect {IP}:5555
```

```bash
# 使用adb安装APK到连接的Android设备
adb install build/shadow_build_dir/android-build/build/outputs/apk/release/android-build-release-signed.apk

# 如果设备上已存在旧版本，使用以下命令强制覆盖安装
adb install -r build/shadow_build_dir/android-build/build/outputs/apk/release/android-build-release-signed.apk

# 查看连接的设备
adb devices

# 卸载旧版本（如果需要）
adb uninstall org.mavlink.qgroundcontrol
```


### 1.3 APK 签名

**为什么需要签名？**

1. **系统要求** - Android 系统强制要求所有 APK 必须签名才能安装，未签名的 APK 无法运行

2. **应用身份** - 签名是应用的唯一标识，用于：
   - 验证应用来源和开发者身份
   - 防止应用被篡改或伪造
   - 建立应用之间的信任关系

3. **应用更新** - 只有使用**相同密钥**签名的新版本才能覆盖安装旧版本
   - 更换密钥后，用户必须先卸载旧版本（会丢失数据）
   - 无法在应用市场（如 Google Play）更新应用

4. **安全保障** - 签名机制确保 APK 在分发过程中未被修改

**生成密钥库：**

使用以下脚本自动生成 Android 发布密钥库：

```bash
#!/usr/bin/env bash

# Script to create Android release keystore
# Make sure to install JDK first: sudo apt install openjdk-17-jdk-headless -y

set -e

echo "============================================"
echo "Android Release Keystore Generator"
echo "============================================"
echo ""

# Configuration - Edit these values
KEYSTORE_NAME="android_release_new.keystore"
KEY_ALIAS="qgc_release"
KEY_PASSWORD="{yourpasswd}"  # Change this!
STORE_PASSWORD="{yourpasswd}"  # Change this!
VALIDITY_DAYS=10000  # About 27 years

# Distinguished Name (DN) information
DN_CN="QGroundControl"  # Common Name
DN_OU="Development"     # Organizational Unit
DN_O="QGroundControl"   # Organization
DN_L="City"            # Locality/City
DN_S="State"           # State
DN_C="US"              # Country Code (2 letters)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE_PATH="$SCRIPT_DIR/$KEYSTORE_NAME"

echo "Keystore will be created at: $KEYSTORE_PATH"
echo "Key alias: $KEY_ALIAS"
echo ""

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo "ERROR: keytool not found!"
    echo "Please install JDK first:"
    echo "  sudo apt install openjdk-17-jdk-headless -y"
    exit 1
fi

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
    read -p "Keystore already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    rm -f "$KEYSTORE_PATH"
fi

# Generate keystore
echo "Generating keystore..."
keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $VALIDITY_DAYS \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$DN_CN, OU=$DN_OU, O=$DN_O, L=$DN_L, S=$DN_S, C=$DN_C"

echo ""
echo "============================================"
echo "Keystore created successfully!"
echo "============================================"
echo ""
echo "Add these lines to your deploy/docker/run-docker-android.sh:"
echo ""
echo "QT_ANDROID_KEYSTORE_PATH=\"/project/source/deploy/android/$KEYSTORE_NAME\""
echo "QT_ANDROID_KEYSTORE_ALIAS=\"$KEY_ALIAS\""
echo "QT_ANDROID_KEYSTORE_STORE_PASS=\"$STORE_PASSWORD\""
echo "QT_ANDROID_KEYSTORE_KEY_PASS=\"$KEY_PASSWORD\""
echo ""
echo "⚠️  IMPORTANT: Keep these passwords safe!"
echo "⚠️  Backup your keystore file - you cannot recover it if lost!"
echo ""

# Verify the keystore
echo "Verifying keystore..."
keytool -list -v -keystore "$KEYSTORE_PATH" -storepass "$STORE_PASSWORD" | head -20
```

**使用步骤：**

1. **安装 JDK（如果未安装）：**
   ```bash
   sudo apt install openjdk-17-jdk-headless -y
   ```

2. **修改脚本配置：**
   - 编辑 `KEY_PASSWORD` 和 `STORE_PASSWORD` 为您的密码
   - 根据需要修改 DN 信息（组织名称、城市等）

3. **运行脚本：**
   ```bash
   chmod +x create_keystore.sh
   ./create_keystore.sh
   ```

4. **配置构建脚本：**
   将生成的配置信息添加到 `run-docker-android.sh` 中

**密钥配置：**

密钥文件：`deploy/android/android_release.keystore`

配置位置：`deploy/docker/run-docker-android.sh`
```bash
QT_ANDROID_KEYSTORE_PATH="/project/source/deploy/android/android_release.keystore"
QT_ANDROID_KEYSTORE_ALIAS="qgc_release"
QT_ANDROID_KEYSTORE_STORE_PASS="{yourpasswd}"
QT_ANDROID_KEYSTORE_KEY_PASS="{yourpasswd}"
```

**密钥管理建议：**
- ⚠️ 不要丢失密钥文件和密码
- ⚠️ 更换密钥将导致应用无法覆盖升级
- ⚠️ 生产环境应使用独立的发布密钥
- ⚠️ 定期备份密钥库文件

### 1.4 故障排查

**清理构建缓存：**
```bash
sudo rm -rf build/shadow_build_dir
```

**查看构建日志：**
```bash
docker ps  # 找到容器 ID
docker logs -f <container_id>
```

**重新构建 Docker 镜像：**
```bash
docker rmi qgc-android-docker
./deploy/docker/run-docker-android.sh
```

---

## 2. Ubuntu 构建

### 2.1 依赖版本

| 组件 | 版本 |
|------|------|
| 基础镜像 | Ubuntu 22.04 |
| Qt | 6.8.3 |
| 构建工具 | CMake + Ninja |
| 时区 | Asia/Shanghai |


**安装的 Qt 模块：**
- qtcharts, qtlocation, qtpositioning, qtspeech, qt5compat
- qtmultimedia, qtserialport, qtimageformats
- qtshadertools, qtconnectivity, qtquick3d, qtsensors

### 2.2 快速开始

```bash
./deploy/docker/run-docker-ubuntu.sh
```

**构建输出：**
- 路径：`build/AppDir/usr/bin/`
- 可执行文件：`QGroundControl`

**运行：**
```bash
./build/AppDir/usr/bin/QGroundControl
```

---

## 验证编译结果

**在每次构建完成后，请务必验证以下信息：**

#### 1. 检查版本号
构建完成后，在QGroundControl中查看版本信息：
- **Android版本：** 设置 → 关于 → 版本信息
- **Ubuntu版本：** 帮助 → 关于QGroundControl

**预期版本信息：**
- 主版本：5.0.6
- 构建日期：应与您的构建时间一致
- Git提交：应与您使用的源码版本一致

#### 2. 检查构建时间戳
```bash
# Android APK
ls -la build/shadow_build_dir/android-build/build/outputs/apk/release/android-build-release-signed.apk

# Ubuntu可执行文件
ls -la build/AppDir/usr/bin/QGroundControl
```

#### 3. 功能验证清单
- 应用正常启动
- 连接设备功能正常
- 航点规划功能可用
- 设置界面正常显示
- 版本信息正确显示

**如果版本号或构建时间不正确，说明更新内容未实际编译，请重新执行构建流程。**

---

## 3. 为什么使用 Docker？

1. **环境一致性** - 所有依赖预装在镜像中
2. **简化配置** - 无需手动安装 Qt、SDK、NDK
3. **隔离构建** - 不污染主机环境
4. **可重复性** - 任何机器都能获得相同的构建结果

### 3.1 网络优化

使用 `--network=host` 继承主机 DNS 配置，提高下载速度。

### 3.2 构建参数

CMake 配置参数：
- `CMAKE_BUILD_TYPE=Release` - 发布版本
- `QT_ANDROID_BUILD_ALL_ABIS=OFF` - 仅构建指定架构
- `QT_ANDROID_ABIS="armeabi-v7a;arm64-v8a"` - 32位和64位ARM
- `QT_ANDROID_SIGN_APK=ON` - 启用APK签名
- `ANDROID_PLATFORM=android-28` - 最低支持 Android 9

---

## 4. 修改版构建脚本

### 4.1 Android 构建脚本

以下是修改版的 Android 构建脚本 `run-docker-android.sh`：

```bash
#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# ============================================================
# Android APK Signing Configuration
# ============================================================
QT_ANDROID_KEYSTORE_PATH="/project/source/deploy/android/android_release.keystore"
QT_ANDROID_KEYSTORE_ALIAS="qgc_release"
QT_ANDROID_KEYSTORE_STORE_PASS="{yourpasswd}"
QT_ANDROID_KEYSTORE_KEY_PASS="{yourpasswd}"
# ============================================================

# Define variables for better maintainability
DOCKERFILE_PATH="./deploy/docker/Dockerfile-build-android"
IMAGE_NAME="qgc-android-docker"
SOURCE_DIR="$(pwd)"
BUILD_DIR="${SOURCE_DIR}/build"

# Default values
QGC_ENABLE_HERELINK=OFF
QT_ANDROID_SIGN_APK=ON
REBUILD_IMAGE=false
FULL_CLEAN=false

# Interactive mode for cleanup selection
echo "============================================"
echo "QGroundControl Android 构建选项"
echo "============================================"
echo ""
echo "请选择构建模式:"
echo "1) 增量编译 (最快，保留所有缓存) - 日常开发推荐"
echo "2) 完全清理 (删除构建目录和Docker镜像) - 30-60分钟"
echo "3) 重新构建Docker镜像"
echo "4) 退出"
echo ""

while true; do
    read -p "请输入选择 (1-4): " choice
    case $choice in
        1)
            echo "选择: 增量编译"
            break
            ;;
        2)
            echo "选择: 完全清理"
            FULL_CLEAN=true
            REBUILD_IMAGE=true
            break
            ;;
        3)
            echo "选择: 重新构建Docker镜像"
            REBUILD_IMAGE=true
            break
            ;;
        4)
            echo "退出脚本"
            exit 0
            ;;
        *)
            echo "无效选择，请输入 1-4"
            ;;
    esac
done
echo ""

# Ask about Herelink support
echo "============================================"
echo "Herelink 支持配置"
echo "============================================"
echo ""
while true; do
    read -p "是否启用 Herelink 支持? (y/n): " herelink_choice
    case $herelink_choice in
        [Yy]*)
            QGC_ENABLE_HERELINK=ON
            echo "已启用 Herelink 支持"
            break
            ;;
        [Nn]*)
            QGC_ENABLE_HERELINK=OFF
            echo "未启用 Herelink 支持"
            break
            ;;
        *)
            echo "请输入 y 或 n"
            ;;
    esac
done
echo ""

# Handle full clean: delete everything
if [ "$FULL_CLEAN" = true ]; then
    echo "============================================"
    echo "执行完全清理..."
    echo "============================================"
    
    # Delete build directory
    if [ -d "${BUILD_DIR}" ]; then
        echo "清理构建目录: ${BUILD_DIR}"
        sudo rm -rf "${BUILD_DIR}" 2>/dev/null || true
        echo "✓ 构建目录已清理"
    fi
    
    # Delete Docker image
    if docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1; then
        echo "删除Docker镜像: ${IMAGE_NAME}"
        docker rmi "${IMAGE_NAME}" 2>/dev/null || true
        echo "✓ Docker镜像已删除"
    fi
    
    echo "完全清理完成！"
    echo ""
fi

# Create build directory if it doesn't exist
mkdir -p "${BUILD_DIR}"

# Check if Docker image exists, build only if needed
if ! docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1 || [ "$REBUILD_IMAGE" = true ]; then
    if [ "$REBUILD_IMAGE" = true ]; then
        echo "============================================"
        echo "重新构建Docker镜像..."
        echo "============================================"
    else
        echo "============================================"
        echo "构建Docker镜像..."
        echo "============================================"
    fi
    docker build --file "${DOCKERFILE_PATH}" \
        --build-arg QGC_ENABLE_HERELINK=$QGC_ENABLE_HERELINK \
        --network=host \
        -t "${IMAGE_NAME}" "${SOURCE_DIR}"
    echo "✓ Docker镜像构建完成"
    echo ""
fi

# Run the Docker container with adjusted mount points and DNS configuration
echo "============================================"
echo "启动Docker容器进行构建..."
echo "============================================"

docker run --rm \
    --network=host \
    -v "${SOURCE_DIR}:/project/source" \
    -v "${BUILD_DIR}:/workspace/build" \
    -e QT_ANDROID_SIGN_APK=$QT_ANDROID_SIGN_APK \
    -e QT_ANDROID_KEYSTORE_PATH=$QT_ANDROID_KEYSTORE_PATH \
    -e QT_ANDROID_KEYSTORE_ALIAS=$QT_ANDROID_KEYSTORE_ALIAS \
    -e QT_ANDROID_KEYSTORE_STORE_PASS=$QT_ANDROID_KEYSTORE_STORE_PASS \
    -e QT_ANDROID_KEYSTORE_KEY_PASS=$QT_ANDROID_KEYSTORE_KEY_PASS \
    "${IMAGE_NAME}"

echo "============================================"
echo "修复文件权限..."
echo "============================================"

# Fix permissions so you can modify build directory without sudo next time
sudo chown -R $(id -u):$(id -g) "${BUILD_DIR}" 2>/dev/null || true

echo "✓ 构建完成！"
echo "构建输出位置: ${BUILD_DIR}"
echo ""
echo "============================================"
echo "版本验证提示"
echo "============================================"
echo "请验证以下信息确保更新内容已实际编译："
echo "1. 检查APK版本号：安装后查看 设置→关于→版本信息"
echo "2. 检查构建时间：ls -la ${BUILD_DIR}/shadow_build_dir/android-build/build/outputs/apk/release/android-build-release-signed.apk"
echo "3. 确认版本号显示为 5.0.6 且构建时间正确"
echo "============================================"
```

**对应的 Dockerfile：**

以下是 Android 构建使用的 `Dockerfile-build-android`：

```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

COPY tools/setup/install-dependencies-debian.sh /tmp/qt/
RUN chmod +x /tmp/qt/*.sh && /tmp/qt/install-dependencies-debian.sh

# Configure DNS for better network connectivity in Docker container
# Note: Docker will override this, but we'll test with available tools

# Set environment variables for Android SDK, NDK, and paths
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_NDK_ROOT=$ANDROID_SDK_ROOT/ndk/25.1.8937393
ENV ANDROID_HOME=$ANDROID_SDK_ROOT
ENV ANDROID_BUILD_TOOLS=$ANDROID_SDK_ROOT/build-tools/34.0.0

# Set apt-get to non-interactive and configure time zone
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# Configure time zone and install dependencies
# Use official Ubuntu sources only
RUN echo "=== Verifying DNS configuration ===" && \
    cat /etc/resolv.conf && \
    echo "=== Updating package lists ===" && \
    apt-get update && \
    apt-get install -y tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure --frontend noninteractive tzdata && \
    apt-get install -y \
    apt-utils \
    build-essential \
    libpulse-dev \
    libxcb-glx0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-render0 \
    libxcb-shape0 \
    libxcb-shm0 \
    libxcb-sync1 \
    libxcb-util1 \
    libxcb-xfixes0 \
    libxcb-xinerama0 \
    libxcb1 \
    libxkbcommon-dev \
    libxkbcommon-x11-0 \
    libxcb-xkb-dev \
    python3 \
    python3-pip \
    wget \
    unzip \
    git \
    openjdk-17-jdk \
    curl \
    locales \
    ninja-build \
    software-properties-common \
    lsb-release

# Install newer CMake version
RUN wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null && \
    apt-add-repository "deb https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" && \
    apt-get update && \
    apt-get install -y cmake

# Set JAVA_HOME and update PATH
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Install Android SDK and NDK
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-12266719_latest.zip -O /opt/cmdline-tools.zip && \
    unzip /opt/cmdline-tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools && \
    mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools/* $ANDROID_SDK_ROOT/cmdline-tools/latest/ && \
    rm -rf $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools && \
    rm /opt/cmdline-tools.zip && \
    yes | $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_SDK_ROOT --licenses && \
    $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_SDK_ROOT "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;25.1.8937393"

# Build arguments for Qt version selection
ARG QGC_ENABLE_HERELINK=OFF
ARG QT_VERSION_6_6_3="6.6.3"

# Qt setup and environment variables
# Use Qt 6.6.3 as default (known to work)
ENV QT_VERSION="6.6.3"
ENV QT_PATH="/opt/Qt"
ENV QT_HOST="linux"
ENV QT_HOST_ARCH="gcc_64"
ENV QT_HOST_ARCH_DIR="linux_gcc_64"
ENV QT_TARGET="android"
ENV QT_TARGET_ARCH_ARMV7="android_armv7"
ENV QT_TARGET_ARCH_ARM64="android_arm64_v8a"
ENV QT_MODULES="qtcharts qtpositioning qtspeech qt5compat qtmultimedia qtserialport qtimageformats qtshadertools qtconnectivity qtquick3d qtsensors qtlocation"

# Install aqtinstall
RUN python3 -m pip install setuptools wheel py7zr aqtinstall && \
    mkdir -p $QT_PATH

# Install Qt desktop version with retry logic (split into separate RUN for better caching)
RUN export QT_VERSION="$QT_VERSION_6_6_3" && \
    echo "=== Installing Qt Desktop $QT_VERSION ===" && \
    for i in 1 2 3; do \
        echo "Attempt $i of 3..." && \
        aqt install-qt $QT_HOST desktop $QT_VERSION $QT_HOST_ARCH -O $QT_PATH -m $QT_MODULES && break || \
        if [ $i -eq 3 ]; then \
            echo "ERROR: Failed to install Qt desktop version after 3 attempts" && exit 1; \
        else \
            echo "Retrying in 5 seconds..." && sleep 5; \
        fi \
    done

# Install Qt Android ARMv7 version with retry logic
RUN export QT_VERSION="$QT_VERSION_6_6_3" && \
    echo "=== Installing Qt Android ARMv7 $QT_VERSION ===" && \
    for i in 1 2 3; do \
        echo "Attempt $i of 3..." && \
        aqt install-qt $QT_HOST $QT_TARGET $QT_VERSION $QT_TARGET_ARCH_ARMV7 -O $QT_PATH -m $QT_MODULES --autodesktop && break || \
        if [ $i -eq 3 ]; then \
            echo "ERROR: Failed to install Qt Android ARMv7 version after 3 attempts" && exit 1; \
        else \
            echo "Retrying in 5 seconds..." && sleep 5; \
        fi \
    done

# Install Qt Android ARM64 version with retry logic
RUN export QT_VERSION="$QT_VERSION_6_6_3" && \
    echo "=== Installing Qt Android ARM64 $QT_VERSION ===" && \
    for i in 1 2 3; do \
        echo "Attempt $i of 3..." && \
        aqt install-qt $QT_HOST $QT_TARGET $QT_VERSION $QT_TARGET_ARCH_ARM64 -O $QT_PATH -m $QT_MODULES --autodesktop && break || \
        if [ $i -eq 3 ]; then \
            echo "ERROR: Failed to install Qt Android ARM64 version after 3 attempts" && exit 1; \
        else \
            echo "Retrying in 5 seconds..." && sleep 5; \
        fi \
    done && \
    echo "=== Qt installation completed successfully ==="

# Set Qt-related environment variables for ARMv7 and ARM64 architectures
# Using Qt 6.6.3
RUN export QT_VERSION="$QT_VERSION_6_6_3" && \
    echo "export QT_ROOT_DIR_ARMV7=$QT_PATH/$QT_VERSION/$QT_TARGET_ARCH_ARMV7" >> /etc/environment && \
    echo "export QT_ROOT_DIR_ARM64=$QT_PATH/$QT_VERSION/$QT_TARGET_ARCH_ARM64" >> /etc/environment && \
    echo "export QT_HOST_PATH=$QT_PATH/$QT_VERSION/$QT_HOST_ARCH" >> /etc/environment

# Set default values (will be overridden by the RUN command above)
ENV QT_ROOT_DIR_ARMV7=$QT_PATH/6.6.3/$QT_TARGET_ARCH_ARMV7
ENV QT_ROOT_DIR_ARM64=$QT_PATH/6.6.3/$QT_TARGET_ARCH_ARM64
ENV QT_HOST_PATH=$QT_PATH/6.6.3/$QT_HOST_ARCH
ENV QT_PLUGIN_PATH_ARMV7=$QT_ROOT_DIR_ARMV7/plugins
ENV QT_PLUGIN_PATH_ARM64=$QT_ROOT_DIR_ARM64/plugins
ENV QML2_IMPORT_PATH_ARMV7=$QT_ROOT_DIR_ARMV7/qml
ENV QML2_IMPORT_PATH_ARM64=$QT_ROOT_DIR_ARM64/qml
ENV PKG_CONFIG_PATH_ARMV7=$QT_ROOT_DIR_ARMV7/lib/pkgconfig:$PKG_CONFIG_PATH
ENV PKG_CONFIG_PATH_ARM64=$QT_ROOT_DIR_ARM64/lib/pkgconfig:$PKG_CONFIG_PATH
ENV LD_LIBRARY_PATH_ARMV7=$QT_ROOT_DIR_ARMV7/lib:$LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH_ARM64=$QT_ROOT_DIR_ARM64/lib:$LD_LIBRARY_PATH

# Consolidate PATH settings
ENV PATH=$JAVA_HOME/bin:/usr/lib/ccache:$QT_HOST_PATH/bin:$QT_ROOT_DIR_ARMV7/bin:$QT_ROOT_DIR_ARM64/bin:$PATH:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_BUILD_TOOLS:$ANDROID_NDK_ROOT

RUN locale-gen en_US.UTF-8 && update-locale LANG=en_US.UTF-8

RUN git config --global --add safe.directory /project/source

# Set working directory
WORKDIR /project/build

# Build the project
CMD echo "=== Build Environment Verification ===" && \
    echo "QGC_ENABLE_HERELINK: $QGC_ENABLE_HERELINK" && \
    echo "Android SDK: $ANDROID_SDK_ROOT" && \
    echo "Android NDK: $ANDROID_NDK_ROOT" && \
    echo "Qt Host Path: $QT_HOST_PATH" && \
    ls -la $ANDROID_SDK_ROOT || (echo "ERROR: Android SDK not found" && exit 1) && \
    ls -la $ANDROID_NDK_ROOT || (echo "ERROR: Android NDK not found" && exit 1) && \
    ls -la $QT_HOST_PATH || (echo "ERROR: Qt host installation not found" && exit 1) && \
    echo "=== Creating build directory ===" && \
    mkdir -p /workspace/build/shadow_build_dir && \
    cd /workspace/build/shadow_build_dir && \
    echo "=== Running CMake configuration ===" && \
    qt-cmake -S /project/source -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DQT_HOST_PATH=$QT_HOST_PATH \
        -DQT_ANDROID_BUILD_ALL_ABIS=OFF \
        -DQT_ANDROID_ABIS="armeabi-v7a;arm64-v8a" \
        -DQT_DEBUG_FIND_PACKAGE=ON \
        -DANDROID_PLATFORM=android-28 \
        -DANDROID_BUILD_TOOLS=$ANDROID_SDK_ROOT/build-tools/34.0.0 \
        -DANDROID_SDK_ROOT=$ANDROID_SDK_ROOT \
        -DQT_ANDROID_SIGN_APK=${QT_ANDROID_SIGN_APK:-ON} \
        -DQGC_ENABLE_HERELINK=$QGC_ENABLE_HERELINK \
        -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake || (echo "ERROR: CMake configuration failed" && exit 1) && \
    echo "=== Starting build process ===" && \
    cmake --build . --target all --config Release || (echo "ERROR: Build failed" && exit 1) && \
    echo "=== Build completed successfully ==="
```

**脚本特点：**
- 交互式构建模式选择（增量编译/完全清理/重新构建镜像）
- 自动配置 APK 签名参数
- Herelink 支持可选配置
- 智能缓存管理
- 自动权限修复

### 4.2 Ubuntu 构建脚本

以下是修改版的 Ubuntu 构建脚本 `run-docker-ubuntu.sh`：

```bash
#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables for better maintainability
DOCKERFILE_PATH="./deploy/docker/Dockerfile-build-ubuntu"
IMAGE_NAME="qgc-ubuntu-docker"
SOURCE_DIR="$(pwd)"
BUILD_DIR="${SOURCE_DIR}/build"
CCACHE_DIR="${SOURCE_DIR}/.ccache"
CMAKE_CACHE_DIR="${SOURCE_DIR}/.cmake-cache"

# Default values
REBUILD_IMAGE=false
CLEAN_BUILD=false
FULL_CLEAN=false

# Interactive mode for cleanup selection
echo "============================================"
echo "QGroundControl Ubuntu 构建选项"
echo "============================================"
echo ""
echo "请选择构建模式:"
echo "1) 增量编译 (最快，保留所有缓存) - 日常开发推荐"
echo "2) 完全清理 (删除构建、缓存、Docker镜像) - 30-60分钟"
echo "3) 重新构建Docker镜像"
echo "4) 退出"
echo ""

while true; do
    read -p "请输入选择 (1-4): " choice
    case $choice in
        1)
            echo "选择: 增量编译"
            break
            ;;
        2)
            echo "选择: 完全清理"
            FULL_CLEAN=true
            CLEAN_BUILD=true
            REBUILD_IMAGE=true
            break
            ;;
        3)
            echo "选择: 重新构建Docker镜像"
            REBUILD_IMAGE=true
            break
            ;;
        4)
            echo "退出脚本"
            exit 0
            ;;
        *)
            echo "无效选择，请输入 1-4"
            ;;
    esac
done
echo ""

# Handle full clean: delete everything
if [ "$FULL_CLEAN" = true ]; then
    echo "============================================"
    echo "执行完全清理..."
    echo "============================================"
    
    # Delete build directory
    if [ -d "${BUILD_DIR}" ]; then
        echo "清理构建目录: ${BUILD_DIR}"
        sudo rm -rf "${BUILD_DIR}" 2>/dev/null || true
        echo "✓ 构建目录已清理"
    fi
    
    # Delete ccache
    if [ -d "${CCACHE_DIR}" ]; then
        echo "清理ccache缓存: ${CCACHE_DIR}"
        sudo rm -rf "${CCACHE_DIR}" 2>/dev/null || true
        echo "✓ ccache缓存已清理"
    fi
    
    # Delete cmake cache
    if [ -d "${CMAKE_CACHE_DIR}" ]; then
        echo "清理cmake缓存: ${CMAKE_CACHE_DIR}"
        sudo rm -rf "${CMAKE_CACHE_DIR}" 2>/dev/null || true
        echo "✓ cmake缓存已清理"
    fi
    
    # Delete Docker image
    if docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1; then
        echo "删除Docker镜像: ${IMAGE_NAME}"
        docker rmi "${IMAGE_NAME}" 2>/dev/null || true
        echo "✓ Docker镜像已删除"
    fi
    
    echo "完全清理完成！"
    echo ""
fi

# Create cache directories if they don't exist
mkdir -p "${CCACHE_DIR}"
mkdir -p "${CMAKE_CACHE_DIR}"
mkdir -p "${BUILD_DIR}"

# Check if Docker image exists, build only if needed
if ! docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1 || [ "$REBUILD_IMAGE" = true ]; then
    if [ "$REBUILD_IMAGE" = true ]; then
        echo "============================================"
        echo "重新构建Docker镜像..."
        echo "============================================"
    else
        echo "============================================"
        echo "构建Docker镜像..."
        echo "============================================"
    fi
    docker build --file "${DOCKERFILE_PATH}" -t "${IMAGE_NAME}" "${SOURCE_DIR}"
    echo "✓ Docker镜像构建完成"
    echo ""
fi

# Clean build artifacts only if requested or for QML changes
if [ "$CLEAN_BUILD" = true ] && [ "$FULL_CLEAN" = false ]; then
    echo "============================================"
    echo "清理构建目录..."
    echo "============================================"
    sudo rm -rf "${BUILD_DIR}"/* 2>/dev/null || true
    echo "✓ 构建目录已清理"
    echo ""
elif [ -d "${BUILD_DIR}" ] && [ "$FULL_CLEAN" = false ]; then
    # Only clean QML-related artifacts for incremental builds
    echo "清理QML相关文件..."
    sudo rm -rf "${BUILD_DIR}/qml/" \
                "${BUILD_DIR}"/*.qrc \
                "${BUILD_DIR}"/*_autogen/ \
                "${BUILD_DIR}/qgroundcontrol.qrc" 2>/dev/null || true
    echo "✓ QML相关文件已清理"
fi

# Stop any running QGroundControl instances before building
QGC_PROCESSES=$(pgrep -f "QGroundControl|qgroundcontrol" || true)

if [ -n "${QGC_PROCESSES}" ]; then
    echo "============================================"
    echo "停止运行中的QGroundControl进程..."
    echo "============================================"
    
    # Try graceful shutdown first (SIGTERM)
    echo "发送优雅关闭信号..."
    pkill -TERM -f "QGroundControl|qgroundcontrol" 2>/dev/null || true
    
    # Wait up to 5 seconds for graceful shutdown
    echo "等待进程优雅关闭..."
    for i in {1..5}; do
        if ! pgrep -f "QGroundControl|qgroundcontrol" > /dev/null 2>&1; then
            echo "✓ 进程已优雅关闭"
            break
        fi
        echo "等待中... ($i/5)"
        sleep 1
    done
    
    # Force kill if still running
    if pgrep -f "QGroundControl|qgroundcontrol" > /dev/null 2>&1; then
        echo "强制终止进程..."
        pkill -KILL -f "QGroundControl|qgroundcontrol" 2>/dev/null || true
        sleep 1
        echo "✓ 进程已强制终止"
    fi
    echo ""
fi

# Run the Docker container with necessary permissions and volume mounts
echo "============================================"
echo "启动Docker容器进行构建..."
echo "============================================"

docker run \
  --rm \
  --cap-add SYS_ADMIN \
  --device /dev/fuse \
  --security-opt apparmor:unconfined \
  -v "${SOURCE_DIR}:/project/source" \
  -v "${BUILD_DIR}:/project/build" \
  -v "${CCACHE_DIR}:/ccache" \
  -v "${CMAKE_CACHE_DIR}:/cmake-cache" \
  -e CCACHE_DIR=/ccache \
  "${IMAGE_NAME}"

echo "============================================"
echo "修复文件权限..."
echo "============================================"

# Fix permissions so you can modify build directory without sudo next time
sudo chown -R $(id -u):$(id -g) "${BUILD_DIR}" "${CCACHE_DIR}" "${CMAKE_CACHE_DIR}" 2>/dev/null || true

echo "✓ 构建完成！"
echo "构建输出位置: ${BUILD_DIR}"
echo ""
echo "============================================"
echo "版本验证提示"
echo "============================================"
echo "请验证以下信息确保更新内容已实际编译："
echo "1. 检查版本号：运行 ./${BUILD_DIR}/AppDir/usr/bin/QGroundControl 后查看 帮助→关于QGroundControl"
echo "2. 检查构建时间：ls -la ${BUILD_DIR}/AppDir/usr/bin/QGroundControl"
echo "3. 确认版本号显示为 5.0.6 且构建时间正确"
echo "============================================"
```

**对应的 Dockerfile：**

以下是 Ubuntu 构建使用的 `Dockerfile-build-ubuntu`：

```dockerfile
FROM ubuntu:22.04

ARG QT_VERSION=6.8.3
ARG QT_MODULES="qtcharts qtlocation qtpositioning qtspeech qt5compat qtmultimedia qtserialport qtimageformats qtshadertools qtconnectivity qtquick3d qtsensors"

ENV DEBIAN_FRONTEND noninteractive

ENV DISPLAY :99

ENV QT_PATH /opt/Qt
ENV QT_DESKTOP $QT_PATH/${QT_VERSION}/gcc_64

ENV PATH /usr/lib/ccache:$QT_DESKTOP/bin:$PATH

COPY tools/setup/install-dependencies-debian.sh /tmp/qt/
RUN /tmp/qt/install-dependencies-debian.sh

COPY tools/setup/install-qt-debian.sh /tmp/qt/
RUN /tmp/qt/install-qt-debian.sh

RUN locale-gen en_US.UTF-8 && dpkg-reconfigure locales

RUN git config --global --add safe.directory /project/source

WORKDIR /project/build
CMD cmake -S /project/source -B . -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache ; \
    cmake --build . --target all --config Release ; \
    cmake --install . --config Release
```

**脚本特点：**
- 交互式构建模式选择
- 智能缓存管理（ccache + cmake cache）
- 自动进程管理（优雅关闭运行中的QGC）
- QML文件增量清理
- 完整的权限修复

### 4.3 脚本使用说明

**Android 脚本使用：**
```bash
# 给脚本执行权限
chmod +x run-docker-android.sh

# 运行脚本
./run-docker-android.sh
```

**Ubuntu 脚本使用：**
```bash
# 给脚本执行权限
chmod +x run-docker-ubuntu.sh

# 运行脚本
./run-docker-ubuntu.sh
```

---

## 5. 参考文档

- [QGC 官方容器构建指南](https://docs.qgroundcontrol.com/Stable_V5.0/zh/qgc-dev-guide/getting_started/container.html)
- [Android 开发者文档](https://developer.android.com/studio/build/building-cmdline)
- [Qt for Android 文档](https://doc.qt.io/qt-6/android-getting-started.html)
