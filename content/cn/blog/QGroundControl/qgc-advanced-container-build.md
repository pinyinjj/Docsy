---
title: "QGroundControl Docker 进阶构建指南"
date: 2025-10-28
summary: "使用Docker容器构建QGroundControl Android APK和Ubuntu的完整指南，包括环境配置、构建流程、签名管理、密钥生成和故障排查。提供交互式构建脚本和完整的Dockerfile配置。"
tags: ["QGroundControl", "Docker", "容器化", "Qt", "CMake", "编译", "技术文档", "地面站", "Android", "Ubuntu"]
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
```
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

...（内容同原文，略） ...

## 2. Ubuntu 构建

...（内容同原文，略） ...

## 3. 为什么使用 Docker？

...（内容同原文，略） ...

## 4. 修改版构建脚本

...（内容同原文，略） ...

## 参考文档

- [QGC 官方容器构建指南](https://docs.qgroundcontrol.com/Stable_V5.0/zh/qgc-dev-guide/getting_started/container.html)
- [Android 开发者文档](https://developer.android.com/studio/build/building-cmdline)
- [Qt for Android 文档](https://doc.qt.io/qt-6/android-getting-started.html)
