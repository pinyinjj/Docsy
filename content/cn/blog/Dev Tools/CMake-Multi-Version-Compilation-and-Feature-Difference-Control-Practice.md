---
title: "Cmake 多版本编译与功能差异控制实践"
date: 2026-7-22
summary: "面向基于 Qt/QML 的 QGroundControl 项目，分享通过单一编译脚本实现多版本功能切换的方法，并利用 Touch 技巧绕过编译缓存导致的版本残留问题。"
tags: ["Qt", "QGroundControl", "编译", "C++", "Docker", "Android", "二次开发"]
categories: ["技术文档"]
weight: 10
draft: false
---

在基于 Qt/QML 的 QGroundControl 大型项目开发中，同一套代码往往需要针对不同场景发布不同版本，例如通用版、室内版与两栖版。本文档分享通过单一编译脚本实现多版本功能切换的方法，并说明如何处理编译缓存带来的版本残留问题，供开发者在类似场景中参考。

## 1. 脚本流程

实现不同版本显示不同的界面功能，需要建立一条从 Shell 脚本到编译器，再到 C++，最终到 QML 界面的完整数据链路。整体流转关系如下：

{{< mermaid size="l" >}}
graph LR;
    A["Shell 脚本<br/>build_docker.sh"] -->|注入 DEFINES 宏| B["编译器<br/>qmake / make"];
    B -->|预编译指令| C["C++ 单例<br/>GlobalBridge"];
    C -->|Q_PROPERTY 暴露| D["QML 界面<br/>动态渲染"];
{{< /mermaid >}}

该链路以宏定义作为版本标识，逐层向上传递，最终在界面层完成差异化渲染。以下各节按照数据流向依次说明每一层的职责与实现。

### 1.1 编译脚本注入宏定义

编译入口位于 `build_docker.sh`，脚本通过接收环境变量或交互式输入，向 `qmake` 传递不同的预编译宏（`DEFINES`）。核心分支逻辑如下：

```bash
if [ "$COMPILE_MODE" == "indoor" ]; then
    QMAKE_EXTRA_ARGS="DEFINES+=MODE_INDOOR"
elif [ "$COMPILE_MODE" == "amphibious" ]; then
    QMAKE_EXTRA_ARGS="DEFINES+=MODE_AMPHIBIOUS"
else
    QMAKE_EXTRA_ARGS="DEFINES+=MODE_GENERAL"
fi
```

不同的编译模式对应不同的宏名称，该宏将在编译阶段被 C++ 层读取，成为版本差异的源头。

### 1.2 C++ 桥接读取宏定义

C++ 层创建一个全局单例 `GlobalBridge`，通过预编译指令 `#if defined()` 读取编译器传来的宏，并以 `Q_PROPERTY` 暴露给前端。关键实现如下：

```cpp
// GlobalBridge.h
Q_PROPERTY(QString compileMode READ compileMode CONSTANT)

QString compileMode() const {
#if defined(MODE_INDOOR)
    return "indoor";
#elif defined(MODE_AMPHIBIOUS)
    return "amphibious";
#else
    return "general";
#endif
}
```

`compileMode` 属性在编译期即被固定为对应字符串，QML 层可直接读取该属性判断当前版本。

### 1.3 QML 动态渲染

QML 界面导入全局单例，利用 Qt 的属性绑定机制动态控制组件的可见性。以在室内模式下隐藏侧边栏为例：

```qml
import GlobalBridge 1.0

// 控制侧边栏显隐
visible: GlobalBridge.compileMode !== "indoor"
```

属性绑定在编译产物运行时生效，无需额外的分支代码即可完成组件级别的差异化控制。

## 2. 产物隔离

为避免不同版本之间的安装包相互覆盖，同时便于区分安装包，需要在脚本阶段对产物进行定制。产物隔离包含应用名称的动态修改与产物文件的分流归档两个环节。

### 2.1 动态修改应用名称

执行编译前，脚本使用 `sed` 动态修改 Android 的配置文件，确保安装到手机上的应用名称与当前版本一致。替换命令如下：

```bash
# 将 android:label="xxx" 替换为当前模式的中文名称
sed -i -E 's/android:label="[^"]+"/android:label="'"${APP_NAME_CN}"'"/g' android/AndroidManifest.xml
```

该命令在编译前修改清单文件，使不同版本在设备上呈现各自的中文名称，从视觉上完成区分。

### 2.2 产物的时间戳归档

编译完成后，脚本根据编译模式创建对应的中文文件夹，并追加时间戳重命名 APK，以便版本回溯。归档逻辑如下：

```bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="${SOURCE_DIR}/编译产物/${MODE_CN}"
mkdir -p "${OUTPUT_DIR}"
cp "${APK_PATH}" "${OUTPUT_DIR}/${MODE_CN}_${TIMESTAMP}.apk"
```

各版本产物按模式分目录存放，文件名携带精确到秒的时间戳，可清晰追溯每一次编译的产物来源。

## 3. 编译缓存的处理

多版本切换过程中，编译缓存可能导致新版本沿用旧版本的逻辑。本节说明缓存残留的成因，并对比两种处理方式。

### 3.1 缓存残留的成因

现代编译系统（如 Make, Ccache）依赖文件时间戳来加速编译，通过对比源文件与目标产物（`.o` 文件）的时间戳，判断某个文件是否需要重新编译。这一机制在源码变更时高效，但在仅切换命令行参数时会出现盲区。

当开发者在 `build_docker.sh` 中从 `indoor` 切换到 `general` 时，传给 `qmake` 的命令行参数虽然发生变化，但 `GlobalBridge.cpp` 与 `GlobalBridge.h` 的源码并未被修改，其时间戳保持不变。因此 `make` 判定该文件无需重新编译，直接链接了上一次生成的 `.o` 缓存文件。最终产物仍运行在旧版本的逻辑中，形成难以察觉的版本残留问题。

### 3.2 全量清理方式

一种直接的处理方式是每次编译前执行 `make clean`，清空所有缓存后再重新构建。该方式能够彻底消除缓存残留，但存在明显的性能代价。

- **代价**：即使启用 Ccache，也会触发全量依赖树扫描，显著增加编译耗时。

对于频繁切换版本的场景，全量清理带来的重复构建开销较大，因此更适合作为兜底手段而非常规流程。

### 3.3 时间戳更新方式

判断编译模式的代码集中于 `GlobalBridge.h`，因此开发者只需在执行 `make` 之前，用 `touch` 命令更新该文件的时间戳，即可实现精准的局部重编译：

```bash
# 在 qmake 之后，make 之前执行
touch /project/source/src/GlobalBridge.h && make -j$(nproc)
```

该方式的工作原理如下：

1. `touch` 将 `GlobalBridge.h` 的最后修改时间更新为当前时刻。
2. `make` 扫描依赖树时，发现 `GlobalBridge.h` 的时间戳比对应的 `GlobalBridge.o` 缓存更新。
3. 编译器丢弃该文件的缓存并重新编译。
4. 重新编译过程读取到最新的 `DEFINES` 宏，仅耗时约 1 至 2 秒即可完成版本切换。

相比全量清理，时间戳更新方式仅重编译受影响的单个文件，在保证版本正确的同时将编译开销控制在最低。

综上，通过在脚本层注入宏定义、在 C++ 层桥接读取、在 QML 层动态渲染这条数据链路，配合产物隔离与 `touch` 缓存更新技巧，开发者可在单一代码库中高效维护并发布多个功能差异化的版本。