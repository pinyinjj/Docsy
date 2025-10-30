---
title: "MAVLink-基于Pymavlink的任务规划实现"
date: 2025-09-30
summary: "本文档介绍了使用MAVLink协议和pymavlink库进行任务规划航点发送的完整方案，支持与QGroundControl完全兼容，提供多航点批量上传、异步操作等功能。"
tags: ["MAVLink", "pymavlink", "任务规划", "QGroundControl", "无人机", "地面站", "技术文档"]
categories: ["技术文档"]
weight: 10
---

## 1. 概述

本文档使用MAVLink协议和pymavlink库进行航点发送，具有以下特点：

- **直接通信**: 直接使用MAVLink协议，与QGC完全一致
- **灵活控制**: 可以精确控制消息发送和错误处理
- **高效稳定**: 直接通信，性能更好，减少潜在问题
- **完全兼容**: 支持与QGroundControl、MAVSDK-Python等应用同时使用

## 2. 主要功能

### 2.1 航点管理
- 标准MAVLink航点格式
- 支持航点参数配置（接受半径、停留时间等）
- 自动序列号管理

### 2.2 任务发送
- 完整的MAVLink任务上传流程
- 支持任务确认和错误处理
- 实时进度监控
- **多航点批量上传**: 一次性上传多个航点，具有原子性

### 2.3 端口兼容性
- **完全兼容**: 可以与MAVSDK-Python同时使用14540端口
- **标准端口**: 14540是MAVLink标准UDP端口
- **多应用支持**: QGC、MAVSDK-Python、pymavlink可以同时连接

#### 连接配置
```python
# MAVSDK-Python 连接
System().connect(system_address="udp://:14540")

# pymavlink 连接 (与MAVSDK-Python共用)
PyMAVLinkWrapper("drone1")

# 两者可以同时工作！
```

#### 实际使用场景
```bash
PX4飞控 ←→ 14540端口 ←→ 多个应用
                    ├── QGroundControl
                    ├── MAVSDK-Python应用  
                    └── pymavlink应用
```

## 3. MAVLink 协议流程

### 3.1 任务上传流程
1. 发送`MISSION_COUNT`消息告知航点数量
2. 等待飞控发送`MISSION_REQUEST_INT`或`MISSION_REQUEST`请求
3. 根据请求类型发送对应的航点消息：
   - `MISSION_REQUEST_INT` → `MISSION_ITEM_INT`
   - `MISSION_REQUEST` → `MISSION_ITEM`
4. 等待`MISSION_ACK`确认消息

### 3.2 多航点批量上传
- **原子性**: 所有航点要么全部成功，要么全部失败
- **高效性**: 一次连接完成所有航点上传
- **一致性**: 保证航点序列的完整性
- **性能**: 减少网络往返次数

### 3.3 消息类型
- `MISSION_COUNT`: 任务数量
- `MISSION_REQUEST_INT`: 航点请求（INT格式）
- `MISSION_REQUEST`: 航点请求（普通格式）
- `MISSION_ITEM_INT`: 航点数据（INT格式）
- `MISSION_ITEM`: 航点数据（普通格式）
- `MISSION_ACK`: 任务确认
- `MISSION_CURRENT`: 当前航点

## 4. 航点格式

```python
waypoint = {
    'sequence': 0,           # 序列号
    'command': 16,          # MAV_CMD_NAV_WAYPOINT
    'frame': 3,             # MAV_FRAME_GLOBAL_RELATIVE_ALT
    'current': 0,           # 是否为当前航点
    'autocontinue': 1,      # 自动继续
    'param1': 0,            # 停留时间
    'param2': 5,            # 接受半径
    'param3': 0,            # 飞越半径
    'param4': 0,            # 航向角
    'param5': lat,          # 纬度
    'param6': lon,          # 经度
    'param7': alt,          # 高度
    'mission_type': 0       # 任务类型
}
```

## 5. MAVLink 命令说明

### 5.1 常用导航命令

| 命令值 | 命令名称 | 说明 | 参数说明 |
|--------|----------|------|----------|
| 16 | `MAV_CMD_NAV_WAYPOINT` | 导航到航点 | param1: 停留时间, param2: 接受半径, param3: 飞越半径, param4: 航向角 |
| 20 | `MAV_CMD_NAV_RETURN_TO_LAUNCH` | 返回起飞点 | param1: 高度, param2: 空, param3: 空, param4: 空 |
| 21 | `MAV_CMD_NAV_LAND` | 降落 | param1: 中止高度, param2: 降落方向, param3: 空, param4: 空 |
| 22 | `MAV_CMD_NAV_TAKEOFF` | 起飞 | param1: 最小俯仰角, param2: 空, param3: 空, param4: 偏航角 |
| 82 | `MAV_CMD_NAV_SPLINE_WAYPOINT` | 样条航点 | param1: 停留时间, param2: 接受半径, param3: 飞越半径, param4: 航向角 |
| 84 | `MAV_CMD_NAV_LOITER_UNLIM` | 无限盘旋 | param1: 半径, param2: 空, param3: 空, param4: 空 |
| 85 | `MAV_CMD_NAV_LOITER_TURNS` | 指定圈数盘旋 | param1: 圈数, param2: 半径, param3: 空, param4: 空 |
| 86 | `MAV_CMD_NAV_LOITER_TIME` | 指定时间盘旋 | param1: 时间(秒), param2: 半径, param3: 空, param4: 空 |

### 5.2 特殊命令

| 命令值 | 命令名称 | 说明 | 使用场景 |
|--------|----------|------|----------|
| 0 | `MAV_CMD_NAV_WAYPOINT` | 空命令 | 占位符 |
| 1 | `MAV_CMD_NAV_LOITER_UNLIM` | 无限盘旋 | 待机、观察 |
| 2 | `MAV_CMD_NAV_LOITER_TURNS` | 指定圈数盘旋 | 精确盘旋 |
| 3 | `MAV_CMD_NAV_LOITER_TIME` | 指定时间盘旋 | 定时盘旋 |
| 4 | `MAV_CMD_NAV_RETURN_TO_LAUNCH` | 返回起飞点 | 紧急返航 |
| 5 | `MAV_CMD_NAV_LAND` | 降落 | 任务结束 |
| 6 | `MAV_CMD_NAV_TAKEOFF` | 起飞 | 任务开始 |

### 5.3 坐标系说明

| 坐标系值 | 坐标系名称 | 说明 | 使用场景 |
|----------|------------|------|----------|
| 0 | `MAV_FRAME_GLOBAL` | 全球坐标系(绝对高度) | 全球任务 |
| 1 | `MAV_FRAME_LOCAL_NED` | 本地NED坐标系 | 本地任务 |
| 2 | `MAV_FRAME_MISSION` | 任务坐标系 | 任务相关 |
| 3 | `MAV_FRAME_GLOBAL_RELATIVE_ALT` | 全球坐标系(相对高度) | 推荐使用 |
| 4 | `MAV_FRAME_LOCAL_ENU` | 本地ENU坐标系 | 本地任务 |
| 6 | `MAV_FRAME_GLOBAL_INT` | 全球坐标系(整数格式) | 高精度任务 |
| 7 | `MAV_FRAME_GLOBAL_RELATIVE_ALT_INT` | 全球坐标系(相对高度整数) | 高精度相对高度 |

## 6. 使用示例

### 6.1 基本使用 - 创建航点任务
```python
# 创建发送器
sender = PyMAVLinkWrapper("drone1")

# 连接到飞控
await sender.connect("udp:127.0.0.1:14540")

# 创建正方形航点任务
side_length = 0.001  # 约100米
base_lat, base_lon, base_alt = 39.9042, 116.4074, 50.0  # 基准位置

# 第一个航点：基准位置
sender.add_waypoint(base_lat, base_lon, base_alt)
# 第二个航点：向东
sender.add_waypoint(base_lat + side_length, base_lon, base_alt)
# 第三个航点：东北
sender.add_waypoint(base_lat + side_length, base_lon + side_length, base_alt)
# 第四个航点：北
sender.add_waypoint(base_lat, base_lon + side_length, base_alt)

# 发送任务
success = await sender.send_mission()
```

### 6.2 关键特性
- **异步操作**: 支持异步连接和任务发送
- **双格式支持**: 自动处理MISSION_REQUEST和MISSION_REQUEST_INT消息
- **系统ID处理**: 自动检测和设置系统ID和组件ID
- **多航点批量上传**: 一次性上传多个航点，具有原子性
- **高效性能**: 减少网络往返，提高上传效率
- **错误处理**: 完善的超时和重试机制
- **QGC兼容**: 与QGroundControl完全兼容
- **灵活配置**: 支持所有MAVLink航点参数

### 6.3 高级配置

#### 自定义航点参数
```python
# 创建发送器并连接
sender = PyMAVLinkWrapper("drone1")
await sender.connect("udp:127.0.0.1:14540")

# 自定义航点参数
sender.add_waypoint(
    lat=39.9042, 
    lon=116.4074, 
    alt=50.0, 
    acceptance_radius=10  # 接受半径10米
)
```

#### 不同命令类型示例

##### 标准航点 (MAV_CMD_NAV_WAYPOINT)
```python
# 创建发送器并连接
sender = PyMAVLinkWrapper("drone1")
await sender.connect("udp:127.0.0.1:14540")

# 标准航点，默认命令16
sender.add_waypoint(lat=39.9042, lon=116.4074, alt=50.0)
```

##### 返回起飞点 (MAV_CMD_NAV_RETURN_TO_LAUNCH)
```python
# 返回起飞点，命令20
sender.add_waypoint(
    lat=0, lon=0, alt=0,  # 坐标会被忽略
    command=20,  # MAV_CMD_NAV_RETURN_TO_LAUNCH
    frame=3
)
```

##### 降落命令 (MAV_CMD_NAV_LAND)
```python
# 降落命令，命令21
sender.add_waypoint(
    lat=39.9042, lon=116.4074, alt=0,
    command=21,  # MAV_CMD_NAV_LAND
    frame=3,
    hold_time=10.0  # 中止高度10米
)
```

##### 起飞命令 (MAV_CMD_NAV_TAKEOFF)
```python
# 起飞命令，命令22
sender.add_waypoint(
    lat=39.9042, lon=116.4074, alt=50.0,
    command=22,  # MAV_CMD_NAV_TAKEOFF
    frame=3,
    hold_time=15.0,  # 最小俯仰角15度
    yaw=90.0   # 偏航角90度
)
```

##### 无限盘旋 (MAV_CMD_NAV_LOITER_UNLIM)
```python
# 无限盘旋，命令84
sender.add_waypoint(
    lat=39.9042, lon=116.4074, alt=50.0,
    command=84,  # MAV_CMD_NAV_LOITER_UNLIM
    frame=3,
    hold_time=50.0  # 盘旋半径50米
)
```

##### 指定时间盘旋 (MAV_CMD_NAV_LOITER_TIME)
```python
# 指定时间盘旋，命令86
sender.add_waypoint(
    lat=39.9042, lon=116.4074, alt=50.0,
    command=86,  # MAV_CMD_NAV_LOITER_TIME
    frame=3,
    hold_time=60.0,  # 盘旋时间60秒
    acceptance_radius=30.0   # 盘旋半径30米
)
```

#### 调查任务示例
```python
# 创建发送器并连接
sender = PyMAVLinkWrapper("drone1")
await sender.connect("udp:127.0.0.1:14540")

# 调查任务 - 多航点批量上传
survey_waypoints = [
    # 起飞点
    {"lat": 39.9042, "lon": 116.4074, "alt": 0, "command": 22, "hold_time": 0.0},
    # 调查点1
    {"lat": 39.9052, "lon": 116.4084, "alt": 50.0, "command": 16, "hold_time": 30.0},
    # 调查点2
    {"lat": 39.9062, "lon": 116.4094, "alt": 50.0, "command": 16, "hold_time": 30.0},
    # 调查点3
    {"lat": 39.9072, "lon": 116.4104, "alt": 50.0, "command": 16, "hold_time": 30.0},
    # 返回起飞点
    {"lat": 0, "lon": 0, "alt": 0, "command": 20, "hold_time": 0.0}
]

# 批量添加调查航点
for wp in survey_waypoints:
    sender.add_waypoint(
        lat=wp["lat"],
        lon=wp["lon"],
        alt=wp["alt"],
        command=wp["command"],
        hold_time=wp["hold_time"],
        acceptance_radius=5.0
    )

# 一次性上传所有调查航点
success = await sender.send_mission()
```

## 8. 依赖要求

```bash
pip install pymavlink
```



## 9. 注意事项

1. 确保无人机已连接并GPS定位正常
2. 检查MAVLink连接参数
3. 航点坐标必须在有效范围内
4. 高度设置要合理（避免碰撞）
5. 接受半径要适中（避免过严导致盘旋）
6. 必须先调用`await connect()`方法建立连接
7. 系统ID和组件ID会自动检测和设置
8. **异步操作**: 所有方法都是异步的，需要使用`await`关键字
9. **多航点上传**: 大量航点（>100个）建议分批处理
10. **原子性**: 多航点上传具有原子性，全部成功或全部失败
11. **性能**: 多航点上传比单航点上传更高效
12. **连接字符串**: 默认使用`udp:127.0.0.1:14540`，可根据需要修改

## 10. 与 QGC 兼容性

本实现完全兼容QGroundControl：
- 使用相同的MAVLink消息格式
- 支持相同的航点参数
- 可以相互导入导出任务文件
- 实时同步任务状态

## 11. 命令参考表

### 11.1 快速参考

| 命令值 | 命令名称 | 常用场景 | 关键参数 |
|--------|----------|----------|----------|
| 16 | `MAV_CMD_NAV_WAYPOINT` | 标准航点导航 | param2: 接受半径 |
| 20 | `MAV_CMD_NAV_RETURN_TO_LAUNCH` | 紧急返航 | 无关键参数 |
| 21 | `MAV_CMD_NAV_LAND` | 降落 | param1: 中止高度 |
| 22 | `MAV_CMD_NAV_TAKEOFF` | 起飞 | param1: 俯仰角, param4: 偏航角 |
| 82 | `MAV_CMD_NAV_SPLINE_WAYPOINT` | 平滑航点 | param2: 接受半径 |
| 84 | `MAV_CMD_NAV_LOITER_UNLIM` | 无限盘旋 | param1: 半径 |
| 85 | `MAV_CMD_NAV_LOITER_TURNS` | 指定圈数盘旋 | param1: 圈数, param2: 半径 |
| 86 | `MAV_CMD_NAV_LOITER_TIME` | 指定时间盘旋 | param1: 时间, param2: 半径 |

### 11.2 坐标系快速参考

| 坐标系值 | 坐标系名称 | 推荐使用场景 |
|----------|------------|--------------|
| 3 | `MAV_FRAME_GLOBAL_RELATIVE_ALT` | 标准任务（推荐） |
| 0 | `MAV_FRAME_GLOBAL` | 全球绝对高度任务 |
| 1 | `MAV_FRAME_LOCAL_NED` | 本地NED任务 |
| 6 | `MAV_FRAME_GLOBAL_INT` | 高精度全球任务 |
| 7 | `MAV_FRAME_GLOBAL_RELATIVE_ALT_INT` | 高精度相对高度任务 |

### 11.3 参数含义速查

| 参数 | 含义 | 单位 | 常用值 |
|------|------|------|--------|
| param1 | 停留时间/俯仰角/圈数/时间 | 秒/度/圈/秒 | 0-300 |
| param2 | 接受半径/半径 | 米 | 1-100 |
| param3 | 飞越半径 | 米 | 0-50 |
| param4 | 航向角/偏航角 | 度 | 0-360 |
| param5 | 纬度 | 度 | -90到90 |
| param6 | 经度 | 度 | -180到180 |
| param7 | 高度 | 米 | 0-1000 |
