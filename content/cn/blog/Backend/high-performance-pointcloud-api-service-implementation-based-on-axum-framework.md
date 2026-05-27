---
title: "基于 Axum 框架的高性能点云 API 服务实现"
date: 2026-05-27
summary: "本文系统说明基于 Axum 框架的高性能点云 API 的服务定位，配置模型，点云融合流程，压缩协议，ROS 回发布机制，HTTP API 行为以及实现边界。"
tags: ["后端", "Rust", "ROS", "点云"]
categories: ["技术文档"]
weight: 10
draft: false
---


## 1. 服务接口

`pointcloud-api-server` 是一个使用 Rust 实现的 ROS1 点云 API 服务。它的主要职责是将多个 ROS 点云话题和轨迹话题转换成 Web 端或移动端更容易消费的 HTTP 接口。

核心能力包括：

- 订阅多个 ROS1 `sensor_msgs/PointCloud2` 点云话题。
- 使用体素网格对多路点云进行合并和降采样。
- 仅输出新增体素，实现增量点云传输。
- 将点云编码为自定义二进制协议，并使用 Byte-Shuffle 和 Zstd 压缩。
- 可选将原始合并点云和压缩后重建点云发布回 ROS，便于调试。
- 提供无人机最新轨迹点，CPU 负载，出站带宽等状态接口。

### 1.1 HTTP API 概览

路由通常集中注册在 `Axum Router` 中。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| POST | `/api/pointcloud/raw_merge/start` | 开启原始合并 ROS 点云发布，并启动融合 worker |
| POST | `/api/pointcloud/raw_merge/stop` | 关闭原始合并 ROS 点云发布 |
| POST | `/api/pointcloud/raw_merge/reconstructed/start` | 开启压缩后重建点云的 ROS 发布 |
| POST | `/api/pointcloud/raw_merge/reconstructed/stop` | 关闭压缩后重建点云的 ROS 发布 |
| POST | `/api/pointcloud/raw_merge/clear` | 清空全局体素记忆和缓存帧 |
| GET | `/api/pointcloud/raw_merge` | 获取最近一次压缩增量点云帧 |
| GET | `/api/pointcloud/progress` | 返回下载进度状态，目前为预留状态 |
| GET | `/api/trajectory` | 返回每个无人机的最新轨迹点 |
| GET | `/api/test/zstd` | 返回缓存点云帧压缩前后大小和压缩比 |
| POST | `/api/test/compression_integrity` | 对请求体执行 shuffle, zstd, 解压, unshuffle 完整性测试 |
| GET | `/api/system/status` | 返回服务状态，出站带宽，CPU 负载和活跃流状态 |

所有请求都会经过 `log_request_response` 中间件，记录请求方法，路径和响应状态码。服务同时启用了 permissive CORS，便于前端或移动端跨域访问。

## 2. 依赖

### 2.1 系统环境

系统依赖主要围绕 Ubuntu 20.04 上的 ROS1 开发环境选择。Ubuntu 20.04 对应的 ROS1 主流发行版是 ROS Noetic，因此部分系统包，编译工具链和运行环境会显得相对保守。这是为了保证与 ROS1 生态中的消息类型，构建工具和运行时环境兼容，而不是单纯追求最新版本。

### 2.2 技术栈

服务实现可选用 Rust 2021，主要依赖如下：

- `axum`：HTTP API 服务框架。
- `tokio`：异步运行时，负责 HTTP 服务，定时任务和信号处理。
- `rosrust`, `rosrust_msg`, `ros_pointcloud2`：连接 ROS1，订阅和发布 ROS 消息，并解析点云。
- `dashmap`, `parking_lot`：并发状态管理。
- `bytes`：高效存储和返回二进制点云帧。
- `zstd`：压缩点云 payload。
- `sysinfo`：采集 CPU 使用率。
- `tracing`：输出运行日志。

## 3. API 服务流程

微服务运行流程如下：

1. 初始化 `tracing_subscriber` 日志。
2. 解析命令行参数。
3. 普通启动时读取指定配置；未指定时，从约定路径加载默认配置。
4. 传入文档生成参数时，仅读取配置并生成接口文档，随后退出。
5. 读取并反序列化配置模型。
6. 启动时可自动调用文档生成函数，保证接口文档与路由定义一致。
7. 根据 `ROS_MASTER_URI` 获取 ROS Master 地址，默认值为 `http://localhost:11311`。
8. 循环尝试连接 ROS Master，连接成功后调用 `rosrust::init` 初始化 ROS 节点。
9. 创建全局共享状态 `Arc<AppState>`。
10. 为配置中的每个轨迹话题创建 ROS 订阅。
11. 启动每秒执行一次的带宽和 CPU 监控后台任务。
12. 注册 `Ctrl+C` 处理逻辑。
13. 创建 `Axum Router`，挂载所有 HTTP API。
14. 监听 `server.host:server.port` 并开始服务。

## 4. 配置参数

配置文件可以抽象为以下结构，实际话题名和端口按部署环境调整：

```json
{
  "server": {
    "host": "<bind_host>",
    "port": 3000
  },
  "raw_merge": {
    "output_hz": 2,
    "voxel_size": 0.2,
    "source_topics": [
      "<pointcloud_topic_0>",
      "<pointcloud_topic_1>",
      "<pointcloud_topic_2>"
    ],
    "merged_pc_topic": "<merged_pointcloud_topic>"
  },
  "trajectory": {
    "max_points_per_traj": 1000,
    "source_topics": {
      "<vehicle_id_0>": "<trajectory_topic_0>",
      "<vehicle_id_1>": "<trajectory_topic_1>",
      "<vehicle_id_2>": "<trajectory_topic_2>"
    }
  },
  "ros": {
    "node_name": "<ros_node_name>",
    "master_retry_interval_ms": 2000
  }
}
```

关键参数说明如下：

- `server.host` 和 `server.port`：HTTP 服务监听地址。
- `raw_merge.output_hz`：点云融合 worker 的输出频率。
- `raw_merge.voxel_size`：体素边长，例如 0.2m。
- `raw_merge.source_topics`：输入点云话题列表。
- `raw_merge.merged_pc_topic`：合并后的 ROS 点云发布话题。
- `trajectory.source_topics`：无人机 ID 到 ROS `nav_msgs/Path` 话题的映射。
- `ros.master_retry_interval_ms`：ROS Master 不可用时的重试间隔。

## 5. 全局状态设计

服务可以使用 `Arc<AppState>` 在 Axum handler，ROS 回调和后台任务之间共享状态。

`AppState` 中的核心字段包括：

- `config`：完整运行配置。
- `merged_data`：最近一次可供 HTTP 返回的压缩点云帧。
- `pc_broadcast`：内部广播通道，用于发布最新压缩帧；是否暴露为流式 HTTP 接口由路由设计决定。
- `merge_worker_active`：控制点云融合 worker 是否运行。
- `publish_original_ros`：控制是否发布原始合并点云到 ROS。
- `publish_reconstructed_ros`：控制是否发布压缩解压后重建的点云到 ROS。
- `download_progress`：下载进度状态，可用于扩展文件下载或长任务进度。
- `bytes_sent` 和 `current_bandwidth`：统计 HTTP 点云接口的出站带宽。
- `sys`：系统状态采集器，用于 CPU 负载。
- `subscribers`：保存 ROS 订阅句柄，防止订阅被提前释放，也便于停止时移除。
- `publishers`：保存 ROS 发布器。
- `global_voxels`：全局已发送体素集合，用于增量过滤。
- `last_publish_time`：最近一次发布点云帧的时间戳。
- `trajectories`：按无人机 ID 保存轨迹点列表。

## 6. 核心服务实现

本章按 HTTP endpoint 的实现路径组织。多个 endpoint 会复用同一批公共功能块，例如融合 worker，压缩帧编码，ROS 回发布，轨迹缓存和系统状态采集。公共块只在首次出现时展开说明，后续 endpoint 只说明调用关系和状态变化。

{{< mermaid size="l" >}}
graph TD
    subgraph ROS_IN[多路 ROS 输入]
        A0[PointCloud2 话题 0]
        A1[PointCloud2 话题 1]
        A2[PointCloud2 话题 N]
    end
    subgraph CALLBACK[订阅回调处理]
        B[原始点云消息]
        C[XYZ 点序列]
        D[有效 XYZ 点序列]
        E[体素键与原始点]
        F[周期体素缓存]
    end
    subgraph MERGE[定时融合 worker]
        G[本周期体素快照]
        H[下一周期缓存]
        I[去重结果]
        J[跳过输出]
        K[新增体素集合]
        L[已发送体素记录]
        M[空间有序体素集合]
        N[降采样 XYZ 点集]
        O[低噪声 XYZ 点集]
    end
    subgraph ENCODE[增量压缩输出]
        Q[SoA float32 缓冲区]
        R[Shuffle 字节流]
        S[压缩 Payload]
        T[HTTP 二进制帧]
        U[最新缓存帧]
        V[HTTP 点云响应]
    end
    subgraph DEBUG[ROS 调试回发布]
        P[原始合并点云 ROS 话题]
        W[重建 XYZ 点集]
        X[重建点云 ROS 话题]
    end

    A0 -->|订阅回调接收| B
    A1 -->|订阅回调接收| B
    A2 -->|订阅回调接收| B
    B -->|读取 xyz 字段| C
    C -->|过滤无效点| D
    D -->|计算体素索引| E
    E -->|累加坐标和数量| F
    F -->|定时取快照| G
    G -->|清空写入缓存| H
    H -->|继续接收回调| F
    G -->|查询全局体素集合| I
    I -->|已存在则丢弃| J
    I -->|首次出现则保留| K
    K -->|写入全局体素集合| L
    K -->|按 z y x 排序| M
    M -->|计算体素均值| N
    N -->|掩码降低浮点噪声| O
    O -->|可选组装发布| P
    O -->|拆分坐标数组| Q
    Q -->|字节重排| R
    R -->|Zstd 压缩| S
    S -->|拼接头部| T
    T -->|写入缓存| U
    U -->|接口读取| V
    T -->|可选解压重建| W
    W -->|重新组装发布| X
{{< /mermaid >}}

### 6.1 公共实现块

#### 6.1.1 融合 worker

融合 worker 是点云相关 endpoint 共享的核心后台任务。它由启动类 endpoint 懒加载创建，并通过 `merge_worker_active` 防止重复启动。

worker 创建后会为 `raw_merge.source_topics` 中的每个 ROS `sensor_msgs/PointCloud2` 话题注册订阅。每次收到 pointcloud 消息时，回调执行以下处理：

1. 使用 `ros_pointcloud2` 将消息转换为可迭代的 `PointXYZ`。
2. 过滤无效坐标。
3. 对每个点计算体素索引。

   ```text
   ix = floor(x / voxel_size)
   iy = floor(y / voxel_size)
   iz = floor(z / voxel_size)
   ```

4. 使用 `(ix, iy, iz)` 作为 key，将同一体素中的点累积为以下结构。

   ```text
   (sum_x, sum_y, sum_z, count)
   ```

worker 按 `raw_merge.output_hz` 创建 `tokio::time::interval`。每次 tick 时，worker 会从 `shared_points` 取出本周期体素快照并清空写入端，然后执行：

1. 查询 `global_voxels`，过滤已经发送过的体素。
2. 将首次出现的体素写入 `global_voxels`，并加入本轮增量集合。
3. 按 `(z, y, x)` 排序增强空间局部性。
4. 用 `sum / count` 计算体素均值点。
5. 使用 `FLOAT_MASK = 0xFFFF_F000` 对 `f32` 的 bit 表示做掩码，降低浮点细小噪声。

如果本轮没有新增体素，worker 会跳过后续编码和发布。

#### 6.1.2 压缩帧编码

压缩帧编码由融合 worker 产生新增点集后调用，也被压缩测试 endpoint 复用其核心思路。编码步骤如下：

1. 将 XYZ 点集拆成 SoA 布局。

```text
x0 x1 x2 ... | y0 y1 y2 ... | z0 z1 z2 ...
```

2. 对 SoA 缓冲区执行 Byte-Shuffle，把每个 `float32` 的同序字节聚合到一起。
3. 使用 Zstd level 3 压缩 shuffle 后的 payload。
4. 在压缩数据前拼接 12 字节自定义头部。

```text
[0..4)    little-endian u32  point_count
[4..12)   little-endian u64  server_timestamp_ms
[12..N)   zstd compressed payload
```

这个 HTTP payload 返回 `application/octet-stream`。如果同时设置 `Content-Encoding: zstd`，客户端应关闭自动解压，或直接按原始 bytes 读取响应体。原因是前 12 字节头部不是 Zstd 压缩流的一部分。

Byte-Shuffle 的输入输出可以抽象为：

```text
原始 float32 字节序：
abcd abcd abcd ...

shuffle 后：
aaa... bbb... ccc... ddd...
```

解码端需要执行反向 `un_shuffle`，再按 X, Y, Z 三段数组还原点集。

#### 6.1.3 ROS 回发布

ROS 回发布由融合 worker 在编码前后按开关执行：

- `publish_original_ros = true` 时，将低噪声 XYZ 点集组装为 ROS `PointCloud2`，发布到 `raw_merge.merged_pc_topic`。
- `publish_reconstructed_ros = true` 时，对 HTTP 二进制帧中的压缩 payload 解压，反 shuffle，还原 XYZ 点集，再组装为 ROS `PointCloud2` 发布到重建话题。

两个输出都使用单行点云结构：

```text
height = 1
point_step = 12
fields = x/y/z float32
is_dense = true
```

#### 6.1.4 轨迹缓存

服务启动后会按 `trajectory.source_topics` 订阅每个 ROS `nav_msgs/Path` 话题。收到 Path 消息时，取 `msg.poses.last()` 作为最新位置，从 ROS header stamp 计算毫秒时间戳，并按无人机 ID 写入 `trajectories`。

轨迹缓存只保留每个无人机的有界历史记录。写入时会跳过重复时间戳，并在超过 `max_points_per_traj` 后删除最旧点。

#### 6.1.5 状态监控

服务启动后会创建一个每秒执行一次的后台任务：

1. 读取并清零 `bytes_sent`。
2. 根据间隔时间计算出站带宽。
3. 刷新 CPU 状态采集器。

出站带宽计算公式为：

```text
Mbps = bytes * 8 / seconds / 1_000_000
```

### 6.2 点云融合与发布控制

#### 6.2.1 POST /api/pointcloud/raw_merge/start

该 endpoint 用于启动原始合并点云输出。实现路径如下：

1. 将 `publish_original_ros` 置为 `true`。
2. 调用 `ensure_merge_worker_running`。
3. 如果 worker 尚未运行，则按 6.1.1 创建 ROS 点云订阅和定时融合任务。
4. 如果 worker 已运行，则复用现有任务，只改变输出开关。

原始合并点云的发布细节已在 6.1.3 描述，此处不重复展开。

#### 6.2.2 POST /api/pointcloud/raw_merge/stop

该 endpoint 用于关闭原始合并点云回发布。实现路径如下：

1. 将 `publish_original_ros` 置为 `false`。
2. 调用 `maybe_stop_merge_worker` 检查两个发布开关。
3. 如果 `publish_reconstructed_ros` 仍为 `true`，worker 保持运行。
4. 如果两个发布开关都为 `false`，执行统一清理。

统一清理包括：设置 `merge_worker_active = false`，移除 `raw_merge_*` 订阅，移除 ROS 发布器，并清空 `merged_data`。

#### 6.2.3 POST /api/pointcloud/raw_merge/reconstructed/start

该 endpoint 用于启动压缩后重建点云输出。实现路径与 6.2.1 基本一致，差异只有输出开关：

1. 将 `publish_reconstructed_ros` 置为 `true`。
2. 调用 `ensure_merge_worker_running`。
3. 复用融合 worker，压缩帧编码和重建回发布逻辑。

重建逻辑已在 6.1.3 描述，此处不再重复。

#### 6.2.4 POST /api/pointcloud/raw_merge/reconstructed/stop

该 endpoint 用于关闭重建点云回发布。实现路径与 6.2.2 相同，差异只有关闭的状态位：

1. 将 `publish_reconstructed_ros` 置为 `false`。
2. 调用 `maybe_stop_merge_worker`。
3. 根据 `publish_original_ros` 是否仍为 `true` 决定保留或清理 worker。

清理规则已在 6.2.2 描述，此处不再重复。

#### 6.2.5 POST /api/pointcloud/raw_merge/clear

该 endpoint 用于重置增量传输记忆。实现路径如下：

1. 清空 `global_voxels`。
2. 清空 `merged_data`。
3. 保留正在运行的订阅和 worker。

清空后，下一批到达的体素会被视为首次出现，从而重新输出为新的增量点云帧。

### 6.3 数据查询接口

#### 6.3.1 GET /api/pointcloud/raw_merge

该 endpoint 返回最近一次可用的压缩增量点云帧。实现路径如下：

1. 从 `merged_data` 读取缓存帧。
2. 如果缓存存在，返回 `application/octet-stream` body。
3. 统计本次响应 body 字节数，并累加到 `bytes_sent`，供状态监控任务计算出站带宽。
4. 如果缓存不存在，返回空帧或业务约定的无数据响应。

压缩帧结构已在 6.1.2 描述，此处不再重复。

#### 6.3.2 GET /api/trajectory

该 endpoint 返回每个无人机的最新轨迹点。实现路径如下：

1. 从 `trajectories` 读取每个无人机 ID 对应的轨迹列表。
2. 取每条轨迹的最后一个点。
3. 组装为 JSON 返回。

响应结构可以抽象为：

```json
{
  "traj": {
    "<vehicle_id>": { "x": 1.2, "y": 3.4, "z": 0.5, "t": 1778833962749 }
  }
}
```

轨迹写入逻辑已在 6.1.4 描述，此处不再重复。

#### 6.3.3 GET /api/pointcloud/progress

该 endpoint 返回下载或长任务进度状态。实现路径很轻：

1. 读取 `download_progress`。
2. 序列化为 JSON 返回。

如果没有完整 fused map 下载流程，该状态可以作为预留结构，用于未来接入文件下载，任务排队或断点续传。

### 6.4 测试与验证接口

#### 6.4.1 GET /api/test/zstd

该 endpoint 用于快速观察当前缓存帧的压缩效果。实现路径如下：

1. 读取 `merged_data`。
2. 解析头部中的 `point_count`。
3. 根据 `point_count * 12 bytes` 估算未压缩大小。
4. 使用响应体长度或压缩 payload 长度计算压缩后大小。
5. 返回压缩前大小，压缩后大小和压缩比。

该接口只读取已有缓存帧，不会触发新的 ROS 订阅或融合计算。

#### 6.4.2 POST /api/test/compression_integrity

该 endpoint 用于验证 Byte-Shuffle 和 Zstd 链路的可逆性。

**实现路径：**
1. 接收请求体中的原始 bytes。
2. 如果长度不是 4 的倍数，则按测试策略截断或拒绝。
3. 执行 `byte_shuffle`。
4. 执行 Zstd 压缩和解压。
5. 执行 `un_shuffle`。
6. 将还原结果与原始 bytes 对比。
7. 返回完整性检查结果，压缩前大小，压缩后大小和压缩比。

该 endpoint 复用 6.1.2 中的压缩链路思想，但输入来自 HTTP 请求体。

**测试建议：**
可以编写 Python 脚本读取本地点云或二进制文件（需 4 字节对齐），并发送至该接口进行验证。

```bash
# 启动服务
cargo run
# 运行测试脚本
python path/to/compression_integrity_test.py path/to/sample.pcd
```

### 6.5 系统状态接口

#### 6.5.1 GET /api/system/status

该 endpoint 返回服务状态和运行指标。实现路径如下：

1. 读取 `current_bandwidth`。
2. 读取 CPU 负载。
3. 根据是否存在 `raw_merge_*` 订阅判断 `raw_merge` 为 `active` 或 `idle`。
4. 将预留流状态，例如 `fused_download`，写入 `active_streams`。
5. 组装 JSON 返回。

响应结构可以抽象为：

```json
{
  "status": "on",
  "total_outbound_mbps": 5.2,
  "cpu_load": 0.15,
  "active_streams": {
    "raw_merge": "active",
    "fused_download": "idle"
  }
}
```

带宽和 CPU 数据的采集方式已在 6.1.5 描述，此处不再重复。

## 7. 文档生成

可以内置 `generate_api_doc(config)` 之类的函数，用于从路由和配置生成接口文档。

触发方式有两种：

- 程序正常启动时自动生成。
- 执行以下命令手动生成。

  ```bash
  cargo run -- --generate-docs
  ```

也可以运行辅助脚本：

```bash
./update_docs.sh
```

构建脚本可以在 Cargo 构建时把默认配置复制到输出目录附近，方便直接运行编译产物时找到配置。


---


## 参考文档

- [Python 点云处理 - 点云体素滤波](https://blog.csdn.net/weixin_43896283/article/details/139105177)：系统介绍了 3D 点云处理中基础的体素滤波（Voxel Grid Filtering）降采样技术及其实现原理。



