---
title: "基于 GPU Shader 投影的多机点云实时渲染实现"
date: 2026-07-06
summary: "本文深入解析基于 GPU Vertex Shader 投影的点云渲染管线，涵盖从 HTTP 异步数据拉取、Zstd 解压与字节 Unshuffle 管线、SoA 到 AoS 数据重组、GPU 端 MVP 矩阵投影变换，到多机轨迹渲染与 3D 锥体方向指示器的完整技术链路，并分析其无人机跟随动画等交互特性。"
tags: ["Qt", "C++", "无人机", "前端", "点云", "QGroundControl"]
categories: ["技术文档"]
weight: 30
draft: false
---

本文档基于 Qt 5.15 / Qt 6.x 的 Qt Quick SceneGraph 模块（非 Qt Quick 3D），通过自定义 `QSGMaterial` 与手写 GLSL Shader，在二维渲染管线中实现 GPU 端 MVP 矩阵投影变换，为无人机蜂群地面控制站提供三维点云与多机轨迹的实时可视化能力。

> **Qt 版本选型背景**：Qt 5.15 中的 Qt Quick 3D 默认采用离屏渲染（Offscreen Rendering）架构，三维场景首先渲染至离屏纹理（Render Target/FBO），随后作为纹理与 Qt Quick 二维场景进行合成。这种两阶段渲染流程引入了额外的 Render Pass、纹理采样以及显存带宽开销，在大规模动态点云等高吞吐实时渲染场景下会增加 GPU 渲染负担。Qt 6 虽然默认仍采用 Offscreen 模式，但新增了 Underlay、Overlay 和 Inline 等 RenderMode，可在部分场景下直接渲染至窗口，从而避免默认的离屏纹理合成过程。
>
> 此外，Qt 5.15 的 `QQuick3DGeometry` 虽已支持自定义几何体构建，但其动态几何更新机制主要面向静态或低频更新模型设计。每次更新顶点数据通常需要重新构建几何缓冲区并同步至 Scene Graph，随后重新上传 GPU 顶点缓冲，不适合大规模动态点云的高频流式更新。在每帧需要刷新数十万至数百万顶点的实时点云渲染场景下，该机制会带来较高的 CPU–GPU 数据传输及 Scene Graph 同步开销。因此，本方案绕过 Qt Quick 3D 的高层三维框架，直接基于 Qt Quick SceneGraph 的底层渲染节点实现自定义 GPU Shader，仅保留点云渲染所需的最小图形管线，从而降低图形栈开销，实现高吞吐、高帧率的实时点云投影渲染。

{{< webm src="webm/rendering.webm" width="600" >}}

## 1. 总体架构

系统以单一的 `PointCloudRenderer` 类为核心——该类直接继承 `QQuickItem`，将网络数据拉取、Zstd 解压、坐标变换、热力图染色、GPU Shader 渲染、轨迹管理及交互控制全部收敛于一体。

<!-- 注意：Shortcode 标签前后必须各保留一个空行 -->

{{< mermaid size="m" >}}
graph TD
    subgraph "Server（点云服务器）"
        S2["点云流数据"]
        S3["多机轨迹数据"]
    end

    subgraph "PointCloudRenderer（单一 QQuickItem）"
        F1["HTTP 轮询（500ms / 2Hz）"]
        F2["Zstd 解压与 Byte Unshuffle"]
        F3["SoA → AoS 重组"]
        F4["坐标映射与高度热力图染色"]

        subgraph "GPU Shader 渲染管线"
            VS["Vertex Shader：MVP 矩阵投影"]
            FS["Fragment Shader：颜色直通"]
        end

        T["多机轨迹处理（去重 / 锥体 / 自愈 / 跟随）"]
    end

    S2 --> F1
    S3 --> F1
    F1 --> F2 --> F3 --> F4 --> VS
    F3 --> T
{{< /mermaid >}}

### 1.1 核心数据结构

点云数据以紧凑结构体 `Point3D` 存储，包含三维坐标与 ABGR 颜色：

```cpp
struct Point3D {
    float x, y, z;
    uint32_t color;   // ABGR 编码
};
```

多机轨迹使用 `QMap<QString, QVector<Point3D>>` 按无人机 ID 索引，每架无人机独立维护轨迹点队列。

### 1.2 Q_PROPERTY 接口

`PointCloudRenderer` 向 QML 层暴露了丰富的属性接口：

| 属性 | 类型 | 用途 |
|------|------|------|
| `yaw` / `pitch` | qreal | 视角旋转（弧度） |
| `zoom` | qreal | 缩放级别 |
| `panX` / `panY` | qreal | 平移偏移（像素） |
| `performanceMode` | bool | 本地性能基准模式 |
| `followedDrone` | QString | 跟随的无人机 ID |
| `fpsCount` | int | 实时帧率（2Hz 更新） |
| `pointCount` | int | 当前点云总数 |

## 2. 数据流管线

### 2.1 数据包协议

点云二进制包使用 12 字节私有头部：

| 偏移 | 长度 | 类型 | 字段 |
|------|------|------|------|
| 0 | 4 | uint32_t | pointCount（点云数量） |
| 4 | 8 | uint64_t | serverTimestamp（服务器时间戳） |
| 12 | N | bytes | Zstd 压缩载荷 |

`_onPointCloudReplyFinished` 在解析时进行以下校验：

1.  **最小长度检查**：`data.size() < 12` 时直接丢弃。
2.  **时间戳去重**：若 `serverTimestamp <= _lastTimestamp`，判定为重复或过时帧，跳过处理。
3.  **Zstd 解压大小校验**：解压后的实际尺寸必须严格等于 `pointCount × 3 × sizeof(float)`，不匹配时丢弃并输出警告。

> **当前限制**：协议头部缺少 Magic Number 与 CRC 校验和。`pointCount` 字段未做上限钳制——恶意构造的超大值可能导致 `decompressedData.resize()` 触发内存溢出。在工业级部署中，建议引入 `pointCount` 上限约束及包体完整性校验。

### 2.2 Zstd 解压与 Byte Unshuffle

`_decompressAndProcess` 方法实现完整的解压与数据重组管线，流程如下：

**第一步：Zstd 解压缩**

```cpp
size_t expectedSize = expectedPointCount * 3 * sizeof(float);
QByteArray decompressedData;
decompressedData.resize(expectedSize);
size_t decompressedSize = ZSTD_decompress(
    decompressedData.data(), expectedSize,
    compressedData.constData(), compressedData.size()
);
```

利用 `ZSTD_decompress` 一次性恢复原始尺寸的 SoA 浮点数组。

**第二步：字节 Unshuffle**

发送端按字节级别对 `float` 数据进行了重排（Shuffle）——将每个 `float` 的第 $i$ 字节集中排在一起。接收端通过双重循环执行逆变换：

```cpp
int count = expectedPointCount;
int numFloats = count * 3;
int elementSize = 4;
QByteArray soa(decompressedSize, 0);
const char* inPtr = decompressedData.constData();
char* outPtr = soa.data();
for (int i = 0; i < elementSize; i++) {
    for (int j = 0; j < numFloats; j++) {
        outPtr[j * elementSize + i] = inPtr[i * numFloats + j];
    }
}
```

> 字节 Shuffle 之所以能显著提升 Zstd 的压缩比，是因为相似高度点的 `float` 高位字节（符号位与指数位）几乎完全一致。将这些重复字节集中排列，使 Zstd 的 LZ77 字典匹配效率达到极致。

**第三步：SoA → AoS 重组**

Unshuffle 完成后，从连续内存中按偏移提取 $X$, $Y$, $Z$ 数组，逐个组包为 `Point3D` 结构体：

```cpp
const float* xArr = reinterpret_cast<const float*>(soa.constData());
const float* yArr = reinterpret_cast<const float*>(soa.constData() + count * 4);
const float* zArr = reinterpret_cast<const float*>(soa.constData() + count * 8);
```

注意此处偏移使用 `count * 4` 而非 `count * sizeof(float)`——因为 SoA 布局下每一维度的数据块跨度为 `count × 4 字节`（每个 `float` 占 4 字节）。

## 3. 坐标转换与高度热力图

### 3.1 ROS ENU 到 Qt 坐标系映射

无人机传感器输出 ROS 标准 ENU（East-North-Up）坐标系，而 Qt Quick SceneGraph 以屏幕左上角为原点、$+Y$ 向下。系统在重组阶段执行如下映射：

```cpp
float mappedX = x;       // ROS X（East）→ Qt X
float mappedY = -z;      // ROS Z（Up）→ 取反，使高处显示在屏幕上方
float mappedZ = y;       // ROS Y（North）→ 深度轴
```

此映射确保用户在旋转 Pitch（俯仰角）时，点云中物理位置更高的点直观地显示在屏幕更上方。由于最终渲染管线将 $Z$ 分量强制置零（见第 4.2 节），`mappedZ` 仅作为视角旋转时的中间参考值，不影响最终屏幕位置。

### 3.2 高度热力图

系统基于原始 $Z$ 坐标（高度）实现蓝→绿→红的双线性渐变热力图，使用固定高度区间 $[-2\mathrm{m}, 5\mathrm{m}]$：

```cpp
float minZ = -2.0f;
float maxZ = 5.0f;
float normZ = (z - minZ) / (maxZ - minZ);
normZ = std::max(0.0f, std::min(1.0f, normZ));

uint8_t r, g, b;
if (normZ < 0.5f) {
    float t = normZ * 2.0f;
    r = 0;                            // 蓝端：R 通道关闭
    g = static_cast<uint8_t>(t * 255.0f);
    b = static_cast<uint8_t>((1.0f - t) * 255.0f);
} else {
    float t = (normZ - 0.5f) * 2.0f;
    r = static_cast<uint8_t>(t * 255.0f);  // 红端：B 通道关闭
    g = static_cast<uint8_t>((1.0f - t) * 255.0f);
    b = 0;
}
```

其中 $t$ 为高度归一化值在各自半区间的重映射系数。低处呈蓝色，中等高度过渡为绿色，$5\mathrm{m}$ 及以上饱和为纯红色。

## 4. GPU Shader 投影管线

这是本系统渲染架构的核心特征。系统不采用 CPU 端逐点软件投影，而是将 MVP 矩阵计算留在 CPU，将逐顶点变换推入 GPU——通过自定义 `QSGMaterial` 与手写 GLSL Shader 实现。

### 4.1 自定义材质与 Shader 体系

系统定义了三个紧密协作的类：

*   **`PointCloudMaterial`**（继承 `QSGMaterial`）：持有 MVP 矩阵和点大小 Uniform，启用 Blending 标志以确保 UI 图层渲染于点云之上。
*   **`PointCloudShader`**（继承 `QSGMaterialShader`）：包含完整的 GLSL 顶点着色器和片段着色器源码。
*   **`PointCloudNode`**（继承 `QSGGeometryNode`）：封装 `QSGGeometry` 和材质，定义顶点属性布局（位置 3×float + 颜色 4×ubyte）。

顶点着色器承担核心投影职责：

```glsl
attribute highp vec3 aPosition;
attribute lowp vec4 aColor;
uniform highp mat4 qt_Matrix;
uniform highp mat4 uMVP;
uniform highp float uPointSize;
varying lowp vec4 vColor;

void main() {
    vec4 pos = qt_Matrix * uMVP * vec4(aPosition, 1.0);
    gl_Position = vec4(pos.x, pos.y, 0.0, pos.w);
    gl_PointSize = uPointSize;
    vColor = aColor;
}
```

### 4.2 为何强制 $Z = 0$

Shader 中 `gl_Position = vec4(pos.x, pos.y, 0.0, pos.w)` 将深度分量强制归零。这一设计确保了所有点云渲染在屏幕空间的同一深度层上，与二维 UI 元素的 $Z$ 排序一致——避免点云因深度冲突遮挡控件或产生不可预期的绘制顺序。

在此前提下，`PointCloudMaterial` 的 `Blending` 标志确保 Qt Quick SceneGraph 按节点树顺序（点云先于 UI）进行后向合成。

### 4.3 CPU 侧的 MVP 矩阵组装

`updatePaintNode` 中，CPU 仅负责矩阵级联和 Uniform 更新：

```cpp
QMatrix4x4 mvp;
mvp.translate(width() / 2.0f, height() / 2.0f, 0.0f);  // 屏幕居中
mvp.translate(_panX, _panY, 0.0f);                       // 用户平移
mvp.scale(scale, scale, 1.0f);                            // 缩放
mvp.rotate(pitch_deg, 1.0f, 0.0f, 0.0f);                  // Pitch 旋转
mvp.rotate(yaw_deg, 0.0f, 1.0f, 0.0f);                    // Yaw 旋转
mvp.translate(-_targetX, -_targetY, -_targetZ);            // 平移至目标位置

ptsNode->material.mvpMatrix = mvp;
ptsNode->markDirty(QSGNode::DirtyMaterial);
```

该矩阵级联的数学含义为：

$$\text{Vertex}_{\text{screen}} = T_{\text{center}} \cdot T_{\text{pan}} \cdot S_{\text{scale}} \cdot R_{\text{pitch}} \cdot R_{\text{yaw}} \cdot T_{\text{-target}} \cdot \text{Vertex}_{\text{world}}$$

当用户旋转视角（改变 `_yaw` / `_pitch`）时，仅需更新 `mvpMatrix` Uniform 并调用 `markDirty(DirtyMaterial)`——几何数据缓冲区完全不变，避免了 $O(N)$ 的逐点重算开销。

### 4.4 顶点属性布局

`PointCloudNode` 定义的顶点格式为：

```cpp
static QSGGeometry::Attribute attribs[] = {
    QSGGeometry::Attribute::create(0, 3, GL_FLOAT, true),        // aPosition
    QSGGeometry::Attribute::create(1, 4, GL_UNSIGNED_BYTE, false) // aColor
};
```

每个顶点占据 `sizeof(PointVertex) = 16 字节`（12 字节坐标 + 4 字节 RGBA）。由于投递给 GPU 的是三维世界坐标而非已投影的 2D 坐标，在视角旋转、缩放等交互中，几何数据始终不变，Shader 自动重新计算屏幕位置。

### 4.5 渲染基元：GL_POINTS

系统选择 `GL_POINTS` 作为点云渲染基元（`geometry.setDrawingMode(GL_POINTS)`），通过 `gl_PointSize` Uniform 控制点大小（固定为 2.0px）。这一策略免去了手工构建三角形方块的巨大开销，在场景累积显示数万点时仍能维持 60 FPS。

> 由于传给 GPU 的顶点仅包含三维世界坐标，GPU 完全通过 Shader 中的 MVP 矩阵获得深度感知。但最终 $Z$ 分量被强制归零（见 4.2 节），因此渲染结果本质上是「伪 3D」——遮挡关系取决于点提交顺序（后画的覆盖先画的），而非真实深度测试。

### 4.6 帧率统计与性能曲线

`updatePaintNode` 中内嵌了轻量级帧率计数器，每 500ms 通过 `Qt::QueuedConnection` 发射一次信号以避免高频 QML 属性绑定开销。系统在不同点云规模下的实测帧率如下：

<img src="/Docsy/images/pointcloud-fps-chart.png" alt="点云规模与渲染帧率" width="500" />

*图：点云规模与渲染帧率关系。*

曲线呈现典型的两阶段衰减特征：

**第一阶段：陡降区（7 万 → 15 万，$-$25%）**。GPU 的并行计算单元数量是固定的。当点云数量翻倍时，每个着色器核心分摊的顶点数随之翻倍，Vertex Shader 执行时间线性增长。由于此时 GPU 尚未饱和，帧率对顶点数量高度敏感。

**第二阶段：平缓衰减区（15 万 → 230 万，$-$67%）**。GPU 计算单元满负荷后，瓶颈从 Shader 计算转移至显存带宽与固定功能单元（光栅化器、ROP）。`GL_POINTS` 固定 2px 的光栅化开销与顶点数呈亚线性关系，因此即使点数从 100 万增至 230 万（$+130\%$），帧率仅从 30 FPS 降至 15 FPS（$-50\%$）。

## 5. 多机轨迹与 3D 锥体方向指示器

系统通过 `QMap<QString, QVector<Point3D>>` 按无人机 ID 维护轨迹数据，单机上限 5000 点，连续点间距小于 5cm 时不追加以节约内存。轨迹线以 `GL_LINES` 绘制（线宽 4.0px），并在每架无人机当前位置以 24 个三角形面片构建实心 3D 锥体表示飞行方向——通过两帧位置差分归一化得到方向向量，叉积构建局部正交基，锥体尺寸随缩放级别自适应钳制以保持恒定屏幕像素尺寸。无人机颜色使用黄金角度 $137^\circ$ 作为 HSV 色相累加步长。轨迹时钟回卷自愈机制在检测到时间戳回滚超过 5 秒时自动清空缓存。此外，系统提供 `performanceMode` 属性用于生成本地 35,000 个模拟点以测试渲染吞吐量。

当用户选定一架无人机进行跟随时，系统通过 60Hz 定时器（`_animTimer`，16ms 间隔）驱动指数平滑动画：

```cpp
float alpha = 0.1f;
_targetX += (targetPt.x - _targetX) * alpha;
_targetY += (targetPt.y - _targetY) * alpha;
_targetZ += (targetPt.z - _targetZ) * alpha;
```

指数平滑（Exponential Moving Average）以加权因子 $\alpha = 0.1$ 控制相机向目标位置的渐进靠近速度。此算法在无突变跳帧的前提下保证了跟随的流畅性——相机不是瞬间跳到目标位置，而是以指数衰减速率平滑逼近。

跟随模式下，手动平移操作被锁死：

```cpp
void PointCloudRenderer::setPanX(qreal panX) {
    if (!_followedDrone.isEmpty()) return;  // 跟随中，拒绝手动平移
    // ...
}
```

取消跟随时，相机停在最后的目标位置，作为新的静态观察点。


---

## 6. 与同系列方案的对比

本方案与前两篇文档分别代表了 Qt 生态下点云渲染的三种技术路线，三者围绕「投影计算位置」构成了清晰的演进谱系。

- **[基于 CPU 投影变换的多机点云可视化实现](/cn/blog/frontend/render-pointcloud-with-cpu/)**：在 `updatePaintNode` 中逐点执行 MVP 矩阵乘法与透视除法，CPU 完成全部投影后将 2D 屏幕坐标投递给 GPU。灵活性最高——可在投影循环中插入任意自定义逐点逻辑——但 CPU 单线程计算成为大规模点云的瓶颈。

- **本方案（GPU Shader 投影）**：MVP 矩阵在 CPU 侧组装为 Uniform，逐顶点矩阵乘法交由 GPU Vertex Shader 并行执行。几何缓冲区存储的是三维世界坐标，视角旋转无需重建顶点数据，仅更新一个 4×4 矩阵即可。在 Qt Quick SceneGraph 二维管线上获得了接近 GPU 原生的吞吐量，同时保留了管线中间过程的完整控制权。

- **[基于 Qt Quick 3D 的面向实时渲染多机点云渲染实现](/cn/blog/frontend/render-pointcloud-with-qtquick3d/)**：完全交由 Qt Quick 3D 引擎管理矩阵运算与渲染状态。开发体验最简——无需手写 GLSL——但依赖 Qt 6.x 的 `QQuick3DGeometry` API 和空间场景图集成。

### 6.1 差异

| 维度 | CPU 方案 | 本方案 | Qt3D 方案 |
|------|---------|--------|----------|
| Qt 模块 | SceneGraph (2D) | SceneGraph (2D) | Quick 3D |
| 投影计算位置 | CPU 逐点 | GPU Vertex Shader | GPU 硬件管线 |
| 需手写 Shader | 否 | 是 (GLSL) | 否 |
| 视角旋转开销 | O(N) 重算 | O(1) 更新 Uniform | O(1) |
| 顶点存储 | 2D 屏幕坐标 | 3D 世界坐标 | 3D 世界坐标 |
| 管线可控性 | 极高 | 高 | 低 |
| Qt 版本要求 | 5.15+ | 5.15+ | 6.0+ |
| 20 万点帧率 | ~10 FPS | 40 FPS | 60 FPS |

本方案在工程上位于另外两者的中间地带：比 CPU 方案获得了数量级的性能提升（GPU 并行），比 Qt3D 方案保留了更低的版本门槛（Qt 5.15 即可运行）和更高的可定制性（GLSL 完全自主），是当前阶段兼顾性能与灵活性的最优工程折中。


---

## 参考文档

- [基于 CPU 投影变换的多机点云可视化实现](/cn/blog/frontend/render-pointcloud-with-cpu/)
- [基于 Qt Quick 3D 的面向实时渲染多机点云渲染实现](/cn/blog/frontend/render-pointcloud-with-qtquick3d/)
- [Qt Quick Scene Graph - Custom Geometry](https://doc.qt.io/qt-6/qtquick-visualcanvas-scenegraph.html)
- [OpenGL Vertex Shader](https://www.khronos.org/opengl/wiki/Vertex_Shader)
- [Zstandard Compression Algorithm](https://facebook.github.io/zstd/)
- [QGroundControl Development Guide](https://dev.qgroundcontrol.com/master/en/)
- [Golden Angle - Wikipedia](https://en.wikipedia.org/wiki/Golden_angle)
- [Exponential Smoothing - Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing)
