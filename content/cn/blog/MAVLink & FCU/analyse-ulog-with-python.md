---
title: "使用 pyulog 分析 PX4 飞控日志"
date: 2025-12-04
summary: "系统介绍如何使用 pyulog 库从 PX4 ULog 日志中提取有效数据条目，识别关键参数，并通过 matplotlib 生成专业图表以诊断飞行问题。"
tags: ["PX4", "Python", "飞控", "无人机", "数据分析"]
categories: ["技术文档"]
weight: 10
draft: false
---

本文档以实际案例 `log_284_2025-11-25-01-15-04.ulg` 为例，系统介绍如何使用 Python 的 `pyulog` 库分析 PX4 飞控生成的 ULog 格式日志文件，通过提取关键数据并生成可视化图表来诊断飞行过程中的潜在问题。

本案例展示了系统性的日志分析流程：从数据探索（识别关键主题）→ 数据提取与预处理 → 理解数据意义 → 可视化分析（生成专业图表）→ 问题诊断（建立因果链条）→ 解决方案（问题排查清单）。这种方法具有系统性、可复现性和实用性，适用于各种飞行日志分析场景，能够帮助开发者快速定位和解决飞行过程中的问题，提升飞行器的安全性和性能。

你可以从以下链接下载该日志文件进行实践：

- [log_284_2025-11-25-01-15-04.ulg](/Docsy/files/log_284_2025-11-25-01-15-04.ulg)

## 1. 从 ULog 中提取有效的数据条目

ULog 是 PX4 飞控系统采用的二进制日志格式，记录了飞行过程中的传感器数据、系统状态、控制指令等丰富信息。要解析 ULog 文件，需要使用 `pyulog` 库。

### 1.1 安装 pyulog

首先，确保已安装 Python 环境（推荐 Python 3.7+），然后使用 pip 安装 `pyulog`：

```bash
pip install pyulog
```

同时，为了进行数据分析和可视化，还需要安装以下依赖：

```bash
pip install numpy matplotlib pandas
```

### 1.2 读取 ULog 文件

使用 `pyulog` 读取 ULog 文件的基本方法：

```python
from pyulog import ULog

# 读取 ULog 文件（使用实际案例日志）
ulog = ULog('log_284_2025-11-25-01-15-04.ulg')

# 获取所有消息名称（uORB 主题）
message_names = ulog.get_message_names()
print(f"日志中包含的消息类型: {message_names}")
```

### 1.3 解析日志

在实际分析中，我们首先需要了解日志中包含哪些主题，然后根据分析目标识别关键主题。以下脚本可以帮助我们系统地探索日志内容：

```python
from pyulog import ULog
import sys

# 读取日志文件
ulog_file = 'log_284_2025-11-25-01-15-04.ulg'
ulog = ULog(ulog_file)

# 获取所有消息名称
message_names = [dataset.name for dataset in ulog.data_list]
print(f"日志文件: {ulog_file}")
print(f"总共包含 {len(message_names)} 个主题\n")
print("=" * 80)
print("所有主题列表:")
print("=" * 80)

# 按类别分类主题
categories = {
    '飞行状态': ['vehicle_status', 'commander_state', 'vehicle_control_mode'],
    '姿态控制': ['vehicle_attitude', 'vehicle_attitude_setpoint', 'vehicle_rates_setpoint'],
    '位置导航': ['vehicle_local_position', 'vehicle_global_position', 'vehicle_gps_position'],
    'EKF2 融合': ['estimator_local_position', 'estimator_status', 'estimator_innovations'],
    '传感器数据': ['sensor_combined', 'sensor_accel', 'sensor_gyro', 'sensor_mag'],
    '电机/舵机': ['actuator_outputs', 'actuator_controls'],
    '外部定位': ['vehicle_vision_position', 'vehicle_odometry'],
    '其他': []
}

# 分类显示
for category, keywords in categories.items():
    matched = []
    for name in sorted(message_names):
        if any(keyword in name for keyword in keywords):
            matched.append(name)
        elif category == '其他' and not any(name in m for m in categories.values() if m != categories['其他']):
            if name not in [item for sublist in [v for k, v in categories.items() if k != '其他'] for item in sublist]:
                matched.append(name)
    
    if matched:
        print(f"\n【{category}】")
        for name in matched:
            try:
                dataset = ulog.get_dataset(name)
                field_count = len(dataset.data.keys())
                sample_count = len(list(dataset.data.values())[0]) if dataset.data else 0
                print(f"  - {name:40s} (字段数: {field_count:3d}, 样本数: {sample_count:6d})")
            except:
                print(f"  - {name:40s} (无法读取)")
```
运行后返回
```bash
日志文件: log_284_2025-11-25-01-15-04.ulg
总共包含 97 个主题

================================================================================
所有主题列表:
================================================================================

【飞行状态】
  - vehicle_control_mode                     (字段数:  16, 样本数:    114)
  - vehicle_status                           (字段数:  39, 样本数:    114)

【姿态控制】
  - vehicle_attitude                         (字段数:  11, 样本数:   1124)
  - vehicle_attitude_setpoint                (字段数:  11, 样本数:   1124)
  - vehicle_rates_setpoint                   (字段数:   8, 样本数:   2807)

【位置导航】
  - vehicle_local_position                   (字段数:  55, 样本数:    563)
  - vehicle_local_position_setpoint          (字段数:  15, 样本数:    563)

【EKF2 融合】
  - estimator_innovations                    (字段数:  33, 样本数:    112)
  - estimator_innovations                    (字段数:  33, 样本数:    112)
  - estimator_local_position                 (字段数:  55, 样本数:    112)
  - estimator_local_position                 (字段数:  55, 样本数:    112)
  - estimator_status                         (字段数:  40, 样本数:    282)
  - estimator_status                         (字段数:  40, 样本数:    282)
  - estimator_status_flags                   (字段数:  71, 样本数:     72)
  - estimator_status_flags                   (字段数:  71, 样本数:     72)

【传感器数据】
  - sensor_accel                             (字段数:  12, 样本数:     56)
  - sensor_accel                             (字段数:  12, 样本数:     56)
  - sensor_combined                          (字段数:  14, 样本数:  11528)
  - sensor_gyro                              (字段数:  12, 样本数:     56)
  - sensor_gyro                              (字段数:  12, 样本数:     56)
  - sensor_mag                               (字段数:   8, 样本数:     56)

【电机/舵机】
  - actuator_outputs                         (字段数:  18, 样本数:      1)
  - actuator_outputs                         (字段数:  18, 样本数:      1)
  - actuator_outputs                         (字段数:  18, 样本数:      1)

【其他】
  - action_request                           (字段数:   4, 样本数:      5)
  - actuator_armed                           (字段数:   8, 样本数:    114)
  - actuator_motors                          (字段数:  15, 样本数:    563)
  - battery_status                           (字段数:  52, 样本数:    282)
  - can_interface_status                     (字段数:   5, 样本数:    551)
  - can_interface_status                     (字段数:   5, 样本数:    551)
  - config_overrides                         (字段数:   6, 样本数:    115)
  - control_allocator_status                 (字段数:  26, 样本数:    282)
  - cpuload                                  (字段数:   3, 样本数:    113)
  - distance_sensor_mode_change_request      (字段数:   2, 样本数:      1)
  - estimator_aid_src_ev_hgt                 (字段数:  14, 样本数:    112)
  - estimator_aid_src_ev_hgt                 (字段数:  14, 样本数:    112)
  - estimator_aid_src_ev_pos                 (字段数:  21, 样本数:    112)
  - estimator_aid_src_ev_pos                 (字段数:  21, 样本数:    112)
  - estimator_aid_src_ev_yaw                 (字段数:  14, 样本数:    112)
  - estimator_aid_src_ev_yaw                 (字段数:  14, 样本数:    112)
  - estimator_aid_src_gravity                (字段数:  28, 样本数:    112)
  - estimator_aid_src_gravity                (字段数:  28, 样本数:    112)
  - estimator_aid_src_mag                    (字段数:  28, 样本数:    112)
  - estimator_aid_src_mag                    (字段数:  28, 样本数:    112)
  - estimator_attitude                       (字段数:  11, 样本数:    112)
  - estimator_attitude                       (字段数:  11, 样本数:    112)
  - estimator_event_flags                    (字段数:  20, 样本数:     60)
  - estimator_event_flags                    (字段数:  20, 样本数:     60)
  - estimator_innovation_test_ratios         (字段数:  33, 样本数:    112)
  - estimator_innovation_test_ratios         (字段数:  33, 样本数:    112)
  - estimator_innovation_variances           (字段数:  33, 样本数:    112)
  - estimator_innovation_variances           (字段数:  33, 样本数:    112)
  - estimator_odometry                       (字段数:  28, 样本数:    112)
  - estimator_odometry                       (字段数:  28, 样本数:    112)
  - estimator_selector_status                (字段数:  46, 样本数:    589)
  - estimator_sensor_bias                    (字段数:  32, 样本数:     56)
  - estimator_sensor_bias                    (字段数:  32, 样本数:     56)
  - estimator_states                         (字段数:  52, 样本数:    112)
  - estimator_states                         (字段数:  52, 样本数:    112)
  - estimator_status_flags                   (字段数:  71, 样本数:     72)
  - estimator_status_flags                   (字段数:  71, 样本数:     72)
  - event                                    (字段数:  29, 样本数:     25)
  - failsafe_flags                           (字段数:  40, 样本数:    104)
  - failure_detector_status                  (字段数:  11, 样本数:    114)
  - home_position                            (字段数:  13, 样本数:      3)
  - input_rc                                 (字段数:  30, 样本数:    112)
  - magnetometer_bias_estimate               (字段数:  21, 样本数:      3)
  - manual_control_setpoint                  (字段数:  17, 样本数:    282)
  - manual_control_switches                  (字段数:  15, 样本数:     58)
  - navigator_status                         (字段数:   3, 样本数:    114)
  - parameter_update                         (字段数:   9, 样本数:      2)
  - position_setpoint_triplet                (字段数:  70, 样本数:      1)
  - px4io_status                             (字段数:  77, 样本数:     57)
  - rate_ctrl_status                         (字段数:   5, 样本数:    282)
  - rtl_status                               (字段数:   6, 样本数:     28)
  - rtl_time_estimate                        (字段数:   4, 样本数:     28)
  - sensor_baro                              (字段数:   6, 样本数:     56)
  - sensor_selection                         (字段数:   3, 样本数:      4)
  - sensors_status_imu                       (字段数:  35, 样本数:    282)
  - system_power                             (字段数:  17, 样本数:    112)
  - takeoff_status                           (字段数:   3, 样本数:     11)
  - telemetry_status                         (字段数:  38, 样本数:     56)
  - timesync_status                          (字段数:   6, 样本数:     56)
  - trajectory_setpoint                      (字段数:  15, 样本数:    282)
  - transponder_report                       (字段数:  40, 样本数:      1)
  - vehicle_acceleration                     (字段数:   5, 样本数:   1124)
  - vehicle_air_data                         (字段数:   9, 样本数:    282)
  - vehicle_angular_velocity                 (字段数:   8, 样本数:   2807)
  - vehicle_command                          (字段数:  15, 样本数:      3)
  - vehicle_command_ack                      (字段数:   8, 样本数:      4)
  - vehicle_constraints                      (字段数:   4, 样本数:     56)
  - vehicle_imu                              (字段数:  16, 样本数:    112)
  - vehicle_imu                              (字段数:  16, 样本数:    112)
  - vehicle_imu_status                       (字段数:  32, 样本数:     56)
  - vehicle_imu_status                       (字段数:  32, 样本数:     56)
  - vehicle_land_detected                    (字段数:  13, 样本数:     62)
  - vehicle_local_position_setpoint          (字段数:  15, 样本数:    563)
  - vehicle_magnetometer                     (字段数:   7, 样本数:    112)
  - vehicle_thrust_setpoint                  (字段数:   5, 样本数:   2807)
  - vehicle_torque_setpoint                  (字段数:   5, 样本数:   2807)
```

我们可以清楚地看到日志中包含的所有主题，并根据分析目标选择关键主题。对于 `log_284` 这个案例，在此文档中我们特别关注：

- **飞行模式**：`vehicle_status` - 了解何时切换到 Position 模式
- **EKF2 融合状态**：`estimator_status` - 检查融合器是否正常工作
- **位置估计**：`estimator_local_position` 和 `vehicle_local_position` - 对比分析位置跳变问题
- **姿态数据**：`vehicle_attitude` - 评估飞行器姿态稳定性


## 2. 关键数据条目

基于 `log_284` 案例中识别出的关键主题，本节详细讲解每个数据条目的物理意义、数据单位和提取方法。

### 2.1 飞行模式与系统状态

**`vehicle_status`** - 飞行器系统状态，包含飞行模式、安全状态等关键信息。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `nav_state` | uint8 | - | 导航状态（飞行模式）：0=MANUAL(手动), 1=ALTCTL(高度控制), 2=POSCTL(位置控制), 3=AUTO_MISSION(自动任务), 4=AUTO_LOITER(自动悬停), 5=AUTO_RTL(自动返航), 6=ACRO(特技), 7=OFFBOARD(外部控制) |
| `arming_state` | uint8 | - | 解锁状态：0=未解锁, 1=已解锁 |
| `hil_state` | uint8 | - | HIL 仿真状态 |
| `failsafe` | bool | - | 故障保护是否激活 |

```python
vehicle_status = ulog.get_dataset('vehicle_status')
timestamps = np.array(vehicle_status.data['timestamp']) / 1e6
nav_state = np.array(vehicle_status.data['nav_state'])
arming_state = np.array(vehicle_status.data['arming_state'])

# 查找模式切换时间点
mode_changes = np.where(np.diff(nav_state) != 0)[0]
for idx in mode_changes:
    print(f"时间 {timestamps[idx]:.2f} s: 切换到模式 {nav_state[idx+1]}")
```

### 2.2 姿态控制数据

**`vehicle_attitude`** - 飞行器姿态信息，使用四元数表示。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `q[0]` | float | - | 四元数 w 分量（标量部分） |
| `q[1]` | float | - | 四元数 x 分量（对应横滚轴） |
| `q[2]` | float | - | 四元数 y 分量（对应俯仰轴） |
| `q[3]` | float | - | 四元数 z 分量（对应偏航轴） |



**`vehicle_attitude_setpoint`** - 姿态设定值，用于评估控制器跟踪性能。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `roll_body` | float | 弧度 (rad) | 横滚角设定值 |
| `pitch_body` | float | 弧度 (rad) | 俯仰角设定值 |
| `yaw_body` | float | 弧度 (rad) | 偏航角设定值 |
| `thrust_body[0]` | float | - | X 轴推力设定值（归一化） |
| `thrust_body[1]` | float | - | Y 轴推力设定值（归一化） |
| `thrust_body[2]` | float | - | Z 轴推力设定值（归一化） |

### 2.3 位置与导航数据

**`vehicle_local_position`** - 本地坐标系（NED）下的位置、速度和加速度信息，这是对外发布的位置估计。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `x` | float | 米 (m) | X 轴位置（北向，NED 坐标系） |
| `y` | float | 米 (m) | Y 轴位置（东向，NED 坐标系） |
| `z` | float | 米 (m) | Z 轴位置（地向，NED 坐标系，向上为负） |
| `vx` | float | 米/秒 (m/s) | X 轴速度 |
| `vy` | float | 米/秒 (m/s) | Y 轴速度 |
| `vz` | float | 米/秒 (m/s) | Z 轴速度 |
| `ax` | float | 米/秒² (m/s²) | X 轴加速度 |
| `ay` | float | 米/秒² (m/s²) | Y 轴加速度 |
| `az` | float | 米/秒² (m/s²) | Z 轴加速度 |
| `xy_valid` | bool | - | XY 平面位置是否有效 |
| `z_valid` | bool | - | Z 轴位置是否有效 |
| `v_xy_valid` | bool | - | XY 平面速度是否有效 |
| `v_z_valid` | bool | - | Z 轴速度是否有效 |

**`estimator_local_position`** - EKF2 内部位置估计，用于分析融合算法性能。字段与 `vehicle_local_position` 相同，但这是 EKF2 的原始输出，未经过位置控制器的处理。


**注意**：在 `log_284` 案例中，对比这两个位置数据源可以发现 Position 模式下的位置跳变问题。

### 2.4 EKF2 融合状态数据

**`estimator_status`** - EKF2 融合器状态，包含融合质量指标和故障标志。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `gps_check_fail_flags` | uint16 | - | GPS 检查失败标志位 |
| `filter_fault_flags` | uint16 | - | 滤波器故障标志位 |
| `innovation_check_flags` | uint16 | - | 残差检查标志位 |
| `solution_status_flags` | uint16 | - | 解算状态标志位 |
| `pos_horiz_accuracy` | float | 米 (m) | 水平位置精度估计 |
| `pos_vert_accuracy` | float | 米 (m) | 垂直位置精度估计 |
| `vel_accuracy` | float | 米/秒 (m/s) | 速度精度估计 |

**`estimator_innovations`** - EKF2 融合残差（innovation），用于诊断融合质量。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `ev_hvel[0]` | float | 米/秒 (m/s) | 外部视觉水平速度残差 X |
| `ev_hvel[1]` | float | 米/秒 (m/s) | 外部视觉水平速度残差 Y |
| `ev_hpos[0]` | float | 米 (m) | 外部视觉水平位置残差 X |
| `ev_hpos[1]` | float | 米 (m) | 外部视觉水平位置残差 Y |
| `ev_vpos` | float | 米 (m) | 外部视觉垂直位置残差 |
| `ev_hvel_test_ratio[0]` | float | - | 水平速度 X 测试比率（test_ratio） |
| `ev_hvel_test_ratio[1]` | float | - | 水平速度 Y 测试比率 |
| `ev_hpos_test_ratio[0]` | float | - | 水平位置 X 测试比率 |
| `ev_hpos_test_ratio[1]` | float | - | 水平位置 Y 测试比率 |

**test_ratio 说明**：当 `test_ratio > 1.0` 时，EKF2 会拒绝该次测量数据。在 `log_284` 案例中，过小的 `EKF2_EV_POS_X/Y` 参数导致 test_ratio 频繁超过阈值，视觉数据被拒绝，造成位置跳变。


### 2.5 传感器数据

**`sensor_combined`** - 综合传感器数据，包含加速度计、陀螺仪和磁力计的融合读数。

| 字段名 | 类型 | 单位 | 说明 |
|--------|------|------|------|
| `timestamp` | uint64 | 微秒 (μs) | 时间戳 |
| `accelerometer_m_s2[0]` | float | 米/秒² (m/s²) | X 轴加速度 |
| `accelerometer_m_s2[1]` | float | 米/秒² (m/s²) | Y 轴加速度 |
| `accelerometer_m_s2[2]` | float | 米/秒² (m/s²) | Z 轴加速度 |
| `gyro_rad[0]` | float | 弧度/秒 (rad/s) | X 轴角速度 |
| `gyro_rad[1]` | float | 弧度/秒 (rad/s) | Y 轴角速度 |
| `gyro_rad[2]` | float | 弧度/秒 (rad/s) | Z 轴角速度 |
| `magnetometer_ga[0]` | float | 高斯 (G) | X 轴磁力计读数 |
| `magnetometer_ga[1]` | float | 高斯 (G) | Y 轴磁力计读数 |
| `magnetometer_ga[2]` | float | 高斯 (G) | Z 轴磁力计读数 |

**合理范围**：
- 加速度计：±20 m/s²（正常飞行），±9.8 m/s²（静止时重力）
- 陀螺仪：±10 rad/s（正常飞行）
- 磁力计：±0.5 G（地球磁场强度）




## 3. 通过绘图分析关键数据

基于 [`log_284`](/Docsy/files/log_284_2025-11-25-01-15-04.ulg) 案例，本节展示如何将提取的关键数据绘制成图表，直观展示数据变化趋势，为问题诊断提供可视化支持。

读者可以自行下载该日志文件，使用本文提供的脚本进行复现分析。

### 3.1 飞行模式时间线

通过飞行模式随时间变化的曲线，可以直接观测整段飞行中飞机经历的模式阶段（起飞、悬停、手动介入、稳高/定点、降落等），这是后续所有细节分析的时间框架。

脚本下载：[`plot_flight_mode.py`](/Docsy/files/plot_flight_mode.py)

![飞行模式时间线（log_284）](/Docsy/images/flight_mode_timeline.png)

- **图表含义**：  
  - **横轴**：时间（秒），从日志开始后的相对时间，范围 0-55 秒。  
  - **纵轴**：飞行模式（Flight Mode），显示 PX4 中的各个模式，包括 MANUAL, ALTCTL, POSCTL, AUTO_MISSION, AUTO_LOITER, AUTO_RTL, ACRO, OFFBOARD 等。  
  - **数据系列**：蓝色线条和圆形标记表示当前激活的飞行模式，模式切换时线条发生垂直跳变。  
  - **关键信息**：每一次模式切换的精确时间点、模式持续时长，以及模式切换的频率和模式。  

- **分析**：  
  - **数据观察**：  
    - **飞行模式序列（0-55秒）**：  
      - **0-13.5秒：ALTCTL（高度控制）模式**：飞行开始阶段，飞机处于高度控制模式，此阶段对水平位置估计的依赖较弱，主要依赖气压计和加速度计进行高度控制。  
      - **13.5-17.5秒：POSCTL（位置控制）模式**：首次切换到位置控制模式，持续约**4秒**。这是第一个关键时间点，飞机开始依赖水平位置估计进行控制。  
      - **17.5-25.5秒：ALTCTL（高度控制）模式**：切回高度控制模式，持续约**8秒**。可能由于位置控制出现问题，飞手或系统自动切回高度控制模式。  
      - **25.5-37.5秒：POSCTL（位置控制）模式**：再次切换到位置控制模式，持续约**12秒**。这是第二个关键时间点，也是持续时间最长的位置控制阶段。  
      - **37.5-55秒：ALTCTL（高度控制）模式**：最后切回高度控制模式，直到日志结束。  
    - **模式切换特征**：  
      - 飞机**仅在 ALTCTL 和 POSCTL 之间切换**，没有进入其他模式（如 MANUAL, AUTO_MISSION, OFFBOARD 等），说明飞行过程相对简单。  
      - 在约55秒的飞行过程中，发生了**4次模式切换**（ALTCTL→POSCTL→ALTCTL→POSCTL→ALTCTL），频繁切换往往意味着飞手在尝试使用位置控制模式但遇到问题，或系统检测到异常自动触发保护逻辑。  
      - 两次 POSCTL 模式分别持续约4秒和12秒，持续时间较短，特别是第一次仅4秒，可能表明位置控制模式启动后很快出现问题。  
  - **关键发现**：  
    - **时间锚点与问题关联**：  
      - **13.5秒（首次切入 POSCTL）**：这是第一个关键时间点，结合后续分析可以发现，此时开始出现水平位置漂移和姿态控制异常。  
      - **25.5秒（再次切入 POSCTL）**：这是第二个关键时间点，也是持续时间最长的位置控制阶段，可能对应最严重的异常阶段（如位置对比图中35-45秒的异常峰值期）。  
    - **模式切换与异常的关系**：每次从 ALTCTL 切换到 POSCTL 后，飞机开始依赖水平位置估计，若位置估计本身存在问题（如 EKF2 对外发布位置跳变），就会导致位置控制异常，表现为水平位置漂移和姿态控制异常；切回 ALTCTL 后，对水平位置估计的依赖减弱，异常现象可能暂时缓解。  
  - **结论验证**：  
    这一飞行模式时间线为后续所有细节分析提供了**明确的时间框架**。通过将姿态角异常、位置跳变、加速度计波动等数据与模式切换时间点对齐，可以清晰地建立**模式切换 → 位置估计异常 → 控制失效**的因果链条，为问题诊断提供关键的时间锚点。  


### 3.2 姿态角时间序列

姿态角（Roll/Pitch/Yaw）时间序列是最直观反映飞控控制性能的图表之一。通过对比问题飞行（`log_284`）和正常飞行（[`log_287`](/Docsy/files/log_287_2025-11-25-05-30-36.ulg)），可以很快判断控制回路是否处于健康工作区间。

脚本下载：[`plot_attitude.py`](/Docsy/files/plot_attitude.py)

**问题飞行**
![姿态角时间序列（问题飞行 log_284）](/Docsy/images/log_284_attitude_angles.png)


**正常飞行**
![姿态角时间序列（正常飞行 log_287）](/Docsy/images/log_287_attitude_angles.png)

- **图表含义**：  
  - **横轴**：时间（秒），从日志开始后的相对时间。  
  - **纵轴**：  
    - **姿态角图**：角度（度），显示 Roll（横滚角，绕 X 轴，蓝色）、Pitch（俯仰角，绕 Y 轴，橙色）、Yaw（偏航角，绕 Z 轴，绿色）随时间的变化。  
    - **角速度图**：角速度（deg/s），显示 Roll Rate（蓝色）、Pitch Rate（橙色）、Yaw Rate（绿色）随时间的变化。  
  - **数据系列**：  
    - **问题飞行（log_284）**：显示约52秒的飞行数据，包含姿态角和角速度两个子图。  
    - **正常飞行（log_287）**：显示约125秒的飞行数据，包含姿态角和角速度两个子图。  
  - **关键标记**：蓝色点标记快速角度变化（>10°/s），用于突出异常行为。  

- **分析**：  
  - **数据观察**：  
    - **`log_284`（问题飞行）**：  
      - **Roll 和 Pitch 轴**：姿态角在整个约52秒的飞行过程中**保持相对稳定**，角度值基本在 $\pm 10^\circ$ 范围内小幅波动，接近水平状态；角速度主要波动在 $\pm 500$ deg/s 范围内，属于正常的控制响应范围。  
      - **Yaw 轴（严重异常）**：姿态角出现**频繁、剧烈的瞬时反转**，在多个时间段（3-8秒、15-18秒、20-22秒、25-28秒、30-38秒、40-42秒）内，Yaw 角在 $-170^\circ$ 和 $+170^\circ$ 之间**快速跳变**，在图表上呈现为近垂直的线条，表明航向在短时间内发生 $340^\circ$ 的巨大变化；角速度出现**极端峰值**，幅度可达 $\pm 7500$ deg/s，与 Yaw 角的快速跳变完全对应；蓝色点标记集中在 Yaw 角的跳变区间，进一步突出了异常行为的严重性；42秒后 Yaw 角稳定在 $+170^\circ$ 附近。  
    - **`log_287`（正常飞行）**：  
      - **Roll 和 Pitch 轴**：姿态角在整个约125秒的飞行过程中**持续振荡**，角度值在 $-5^\circ$ 到 $+10^\circ$ 范围内波动，围绕 $0^\circ$ 进行小幅调整，这是正常飞行中为保持姿态稳定而进行的持续修正；角速度显示**高频、高幅振荡**，频繁达到 $\pm 40$ deg/s 的峰值，甚至超出显示范围，表明系统在积极进行姿态修正，这是健康控制系统的正常表现。  
      - **Yaw 轴（非常稳定）**：姿态角在整个125秒内**极其稳定**，始终保持在 $95-96^\circ$ 附近，波动极小，几乎呈水平直线，表明航向估计和控制非常可靠；角速度在整个飞行过程中**非常接近 0** deg/s，波动仅在 $\pm 2$ deg/s 范围内，表明几乎没有绕 Z 轴的旋转运动，航向保持稳定。  
  - **关键发现**：  
    - **Yaw 轴的极端对比**：这是最关键的发现——`log_284` 中 Yaw 角出现**频繁、剧烈的瞬时反转**（角速度峰值达 $\pm 7500$ deg/s），而 `log_287` 中 Yaw 角**极其稳定**（角速度接近 0），这种极端对比直接证明了问题出在**航向估计或控制逻辑**，而非机械结构。  
    - **Roll/Pitch 表现差异**：`log_284` 中 Roll/Pitch 相对稳定但缺乏主动修正，而 `log_287` 中 Roll/Pitch 持续振荡但处于健康控制状态，这种差异可能与飞行模式、控制参数或外部干扰有关，但**不是导致问题的根本原因**。  
    - **问题定位**：Roll/Pitch 在 `log_284` 中基本正常，而 Yaw 出现严重异常，说明**问题不在基本姿态控制环路本身，而在更高层（如位置/航向估计或上层控制模式）**。Yaw 的频繁跳变通常意味着位置/航向估计不稳定（EKF2 融合质量差），导致航向参考频繁跳变；或控制器在错误反馈信号驱动下不断反向调整，形成失控感。  
  - **结论验证**：  
    通过这一对比，可以直接观察到：**同一架飞机、相似的飞行场景，仅仅因为参数/配置不同，Yaw 控制就可以从稳定可控变为频繁反转、接近失控**，从而证明问题根源在于位置估计与控制逻辑的配置不当（特别是 EKF2 航向估计和 Position 模式下的控制逻辑），而非机械结构或硬件故障。  

### 3.3 EKF2 内部位置 vs 对外发布位置

位置对比图是 `log_284` 案例中最关键的证据之一：它将 EKF2 内部估计的位置（来自 `estimator_local_position`）与飞控对外发布的位置（如 `vehicle_local_position`）叠加到同一坐标系中，直观展示 EKF2 内部位置估计与对外发布位置之间的差异。

脚本下载：[`plot_position.py`](/Docsy/files/plot_position.py)

![位置对比图（log_284）](/Docsy/images/log_284_position_comparison.png)

- **图表含义**：  
  - **横轴**：时间（秒），从日志开始后的相对时间，范围 0-55 秒。  
  - **纵轴**：位置（米），三个子图分别显示 X 轴（前后方向）、Y 轴（左右方向）、Z 轴（高度方向）的位置随时间的变化。  
  - **数据系列**：  
    - **蓝色线**：`estimator_local_position`（EKF2 内部估计位置），表示 EKF2 滤波器内部的位置估计值。  
    - **橙色线**：`vehicle_local_position`（对外发布位置），表示飞控对上层控制和外部模块发布的位置值。  
  - **关键标记**：红色虚线标记 "Position Mode Start"（位置模式启动时间点，约14秒），用于标识模式切换的关键时刻。  

- **分析**：  
  - **数据观察**：  
    - **X 轴位置对比（前后方向）**：  
      - **Position 模式启动前（0-14秒）**：两条曲线**紧密重合**，在 4-6 米范围内平滑波动，表明此阶段位置估计整体可信。  
      - **Position 模式启动后（14秒起）**：橙色线（对外发布位置）立即开始**剧烈波动**，与蓝色线（内部估计）出现明显分离。  
      - **异常峰值期（35-45秒）**：橙色线出现**极端跳变**，峰值接近 10 米，最低降至 2 米以下，呈现**锯齿状、高幅度的来回抖动**；蓝色线在此期间也出现振荡，但幅度和频率明显小于橙色线，整体更平滑。  
      - **恢复期（45秒后）**：两条曲线重新收敛，从约 6 米平滑下降至 4 米并趋于稳定，表明系统恢复正常。  
    - **Y 轴位置对比（左右方向）**：  
      - **Position 模式启动前（0-14秒）**：两条曲线**紧密重合**，在 12.5-14.5 米范围内稳定波动，与 X 轴表现一致。  
      - **Position 模式启动后（14秒起）**：橙色线开始**显著偏离**蓝色线，波动加剧。  
      - **异常峰值期（35-45秒）**：橙色线出现**极端跳变**，峰值接近 15 米，最低降至 10 米以下，与 X 轴同步出现大幅锯齿状抖动；蓝色线同样显示振荡但幅度更小。  
      - **恢复期（45秒后）**：两条曲线收敛，从约 12 米平滑上升至 13 米并稳定，系统恢复正常。  
    - **Z 轴位置对比（高度方向）**：  
      - **整体一致性**：Z 轴两条曲线的一致性**明显优于 X/Y 轴**，即使在 Position 模式启动后，橙色线的波动也相对较小。  
      - **0-14秒**：两条曲线基本重合，从 -0.2 米平滑下降至 -0.55 到 -0.6 米，保持稳定。  
      - **14秒后**：橙色线波动稍大于蓝色线，但偏差远小于 X/Y 轴。  
      - **38-42秒**：两条曲线同步出现快速下降至 -0.85 米，随后快速上升至 -0.2 米（48秒），橙色线在此期间略显锯齿状，但整体趋势一致。  
  - **关键发现**：  
    - **X/Y 轴异常跳变**：Position 模式启动后，对外发布的 X/Y 位置（橙色线）出现**极端跳变和锯齿状抖动**，而 EKF2 内部估计（蓝色线）虽然也有振荡，但幅度和频率明显更小，说明**问题出在 EKF2 对外发布位置的处理环节**，而非内部估计本身。  
    - **Z 轴相对稳定**：Z 轴两条曲线的一致性明显好于 X/Y 轴，表明高度估计和发布机制相对正常，问题主要集中在**水平位置（X/Y）的发布环节**。  
    - **异常峰值期（35-45秒）**：这是整个飞行过程中最严重的异常阶段，X/Y 轴对外发布位置出现极端跳变，峰值可达正常值的 2-3 倍，这直接导致 Position 控制器基于错误反馈产生剧烈修正动作。  
    - **恢复机制**：45秒后两条曲线重新收敛，可能与模式切换、飞手介入或 EKF2 重新收敛有关，说明系统具备恢复能力，但异常期间已造成位置控制失效。  
  - **结论验证**：  
    - 这一对比图与前文对 EKF2 `test_ratio` 和参数 `EKF2_EV_POS_X/Y` 过于严格的分析结论形成闭环：**EKF2 外部位置数据被拒绝 → 内部估计与对外发布位置分离 → 对外发布位置出现跳变 → Position 控制器基于错误反馈输出错误控制量 → 飞机在 Position 模式下出现失控漂移**。  
    - 在 PX4 的 Position 模式中，飞控会在切入该模式时**将当前飞机所在的 X/Y 位置视为新的保持目标点**，若对外发布的位置本身发生跳变，控制器会基于错误的位置反馈持续调整控制量，导致飞机出现缓慢甚至剧烈漂移；当退出 Position 模式，改为 Altitude 或 Manual 并由飞手直接控制姿态/油门时，对位置估计的依赖减弱，漂移现象立即消失。  

### 3.4 加速度计时域对比

加速度计 X 轴和 Y 轴时域对比图，将问题飞行（`log_284`）与正常飞行（`log_287`）在同一时间标度下叠加，帮助我们从机体振动和动态响应的角度，验证系统是否处在一个合理的工作环境中。

脚本下载：[`plot_accel.py`](/Docsy/files/plot_accel.py)

![加速度计 X 轴和 Y 轴时域对比](/Docsy/images/accel_plot.png)

- **图表含义**：  
  - **横轴**：时间（秒），分别对两段日志做相对时间对齐，范围 0-130 秒。  
  - **纵轴**：加速度（m/s²），两个子图分别显示 X 轴（前后方向，通常是机头指向）和 Y 轴（左右方向）的加速度随时间的变化。  
  - **数据系列**：  
    - **蓝色线**：`log_284 accel X/Y`（问题飞行），显示存在问题的飞行中的加速度数据。  
    - **橙色线**：`log_287 accel X/Y`（正常飞行），显示参数/配置优化后的稳定飞行中的加速度数据。  
  - **关键信息**：通过对比两条曲线可以直观判断系统是否工作在健康的振动水平，识别异常振动和动态响应问题。  

- **分析**：  
  - **数据观察**：  
    - **`log_284`（问题飞行）**：  
      - 在前约50秒内，X 轴和 Y 轴加速度均显示出**更大的振幅波动**，振荡范围约在 $\pm 6$ 到 $\pm 7.5$ m/s² 之间，明显高于正常水平。  
      - 曲线呈现**不规则、高频的抖动特征**，表明此阶段机体振动水平确实偏高。  
      - 数据在大约50秒后停止记录，这与飞行模式时间线中显示的飞行终止时间点一致。  
    - **`log_287`（正常飞行）**：  
      - 整体振幅显著更小，大部分时间加速度值稳定在 $\pm 2.5$ m/s² 范围内，基线接近 $0$ m/s²。  
      - 曲线平滑度明显优于 `log_284`，表明系统工作在**健康的振动环境**中。  
      - 存在少量尖锐的峰值（如45秒、65秒、95秒、105秒附近），这些可能是正常的机动动作（如快速转向、急停等），峰值后迅速恢复到稳定状态。  
      - 数据持续记录整个测量期间（约130秒），飞行过程完整。  
  - **关键发现**：  
    - **振动水平对比**：`log_284` 在前50秒内确实存在**更高的振动水平**，这可能与 Position 模式下的位置控制异常导致的频繁修正动作有关，而非单纯的机械振动问题。  
    - **系统优化效果**：`log_287` 的平滑曲线证明，在相同的机械结构下，通过优化 EKF2 参数和位置控制逻辑，系统可以工作在低振动、稳定的状态。  
    - **问题根源验证**：通过对比两张图中曲线的整体平滑度和峰值大小，可以直观判断系统是否工作在一个健康的振动水平，为问题诊断提供重要的参考依据。  
  - **结论验证**：  
    这一对比进一步验证了前文结论：**问题的根源在于 EKF2 配置不当导致的位置估计跳变，进而引发 Position 控制器的异常响应和频繁修正，表现为加速度数据的剧烈波动；而非机械结构或硬件故障导致的振动问题**。

### 3.5 Test Ratio 与位置跳变关联分析

Test Ratio 与位置跳变关联分析图是 `log_284` 案例中最关键的诊断图表之一：它将 EKF2 的 test ratio（测试比率）、数据拒绝事件与位置跳变、Yaw 角异常叠加在同一时间轴上，直观展示 EKF2 数据拒绝机制与位置控制异常之间的因果关系。

脚本下载：[`plot_position_jump.py`](/Docsy/files/plot_position_jump.py)

![Test Ratio 与位置跳变关联分析（log_284）](/Docsy/images/log_284_test_ratio_analysis.png)

- **图表含义**：  
  - **横轴**：时间（秒），从日志开始后的相对时间，范围 0-55 秒。  
  - **纵轴**：三个子图分别显示不同的数据指标。  
    - **上子图**：X 位置（米，左轴）和 Yaw 角（度，右轴），显示 EKF2 内部估计位置（蓝色）、对外发布位置（橙色）和 Yaw 角（绿色虚线）。  
    - **中子图**：X Test Ratio（无单位），显示 EKF2 对 X 轴位置数据的测试比率（红色实线）和拒绝阈值（黑色虚线，值为 1.0）。  
    - **下子图**：数据拒绝事件（二进制指标），红色点表示数据被拒绝的时刻。  
  - **关键标记**：红色虚线标记 "POSCTL" 和 "ALTCTL"，用于标识飞行模式切换的时间点。  
  - **关键信息**：通过对比三个子图，可以直观观察 test ratio 峰值、数据拒绝事件与位置跳变、Yaw 角异常之间的时间对应关系。

- **分析**：  
  - **数据观察**：  
    - **ALTCTL 模式阶段（0-13.5秒、17.5-25.5秒、37.5-55秒）**：  
      - X 位置：EKF2 内部估计（蓝色）与对外发布位置（橙色）**紧密重合**，在 4-6 米范围内稳定波动，位置估计整体可信。  
      - Yaw 角：稳定在约 $10^\circ$ 附近，波动较小，航向控制正常。  
      - X Test Ratio：大部分时间保持在拒绝阈值（1.0）以下，表明传感器数据质量良好，EKF2 正常接受数据。  
      - 数据拒绝事件：几乎没有或极少，系统运行稳定。  
    - **POSCTL 模式阶段（13.5-17.5秒、25.5-37.5秒）**：  
      - X 位置：切换到 POSCTL 模式后，对外发布位置（橙色）开始出现**波动和偏差**，与内部估计（蓝色）出现分离。  
      - Yaw 角：在模式切换时刻出现**急剧变化**，随后在 POSCTL 模式下波动加剧。  
      - X Test Ratio：出现**峰值**，在约 13.5 秒、20 秒、32 秒等时刻超过拒绝阈值（1.0），最高峰值可达 30 以上。  
      - 数据拒绝事件：在 test ratio 超过阈值时出现，与位置跳变和 Yaw 角异常的时间点高度一致。  
    - **异常峰值期（35-45秒）**：  
      - X 位置：对外发布位置出现**极端跳变**，从约 6 米跳至 9 米，随后降至 2 米以下，呈现**锯齿状、高幅度的来回抖动**，与内部估计位置严重分离。  
      - Yaw 角：出现**频繁、剧烈的瞬时反转**，在 $-150^\circ$ 和 $+150^\circ$ 之间快速跳变，航向控制完全失效。  
      - X Test Ratio：出现**连续多次峰值**，数值在 10-15 之间，持续超过拒绝阈值，表明 EKF2 在此阶段频繁拒绝传感器数据。  
      - 数据拒绝事件：在 35-40 秒期间出现**密集的拒绝事件**，红色点集中分布，与位置跳变和 Yaw 角异常完全对应。  
    - **恢复期（45秒后）**：  
      - 切回 ALTCTL 模式后，X 位置两条曲线重新收敛，稳定在约 4 米；Yaw 角稳定在 $0^\circ$ 附近；test ratio 降至阈值以下；数据拒绝事件消失，系统恢复正常。  
  - **关键发现**：  
    - **时间对应关系**：test ratio 峰值、数据拒绝事件与位置跳变、Yaw 角异常在时间上**高度一致**，特别是在 POSCTL 模式下和异常峰值期（35-45秒），这种对应关系清晰地表明 EKF2 数据拒绝机制是导致位置跳变的直接原因。  
    - **模式切换触发**：每次从 ALTCTL 切换到 POSCTL 时，test ratio 都会出现峰值并超过阈值，导致数据拒绝事件，随后位置跳变和 Yaw 角异常开始出现；切回 ALTCTL 后，test ratio 恢复正常，位置和 Yaw 角也趋于稳定。  
    - **异常峰值期的严重性**：35-45 秒期间，test ratio 连续多次超过阈值，数据拒绝事件密集出现，对应最严重的位置跳变（峰值可达正常值的 2-3 倍）和 Yaw 角失控（$340^\circ$ 的巨大变化），这是整个飞行过程中最危险的阶段。  
    - **EKF2 数据拒绝机制的影响**：当 test ratio > 1.0 时，EKF2 拒绝外部位置数据（如视觉定位数据），只能依赖 IMU 预测，位置逐渐漂移；下次数据被接受时，位置突然"跳回"，形成锯齿状跳变；这种不稳定的位置反馈导致 Position 控制器产生错误的控制指令，进而引发 Yaw 角异常和水平位置漂移。  
  - **结论验证**：  
    - 这一关联分析图与前文对 EKF2 `test_ratio` 和参数 `EKF2_EV_POS_X/Y` 过于严格的分析结论形成完整的因果链条：**EKF2 参数设置过小（`EKF2_EV_POS_X/Y` 过小） → innovation test 过于严格 → test ratio 频繁超过阈值 → 外部位置数据被拒绝 → 内部估计与对外发布位置分离 → 对外发布位置出现跳变 → Position 控制器基于错误反馈输出错误控制量 → Yaw 角异常和水平位置漂移 → 飞机在 Position 模式下出现失控漂移**。  
    - 在 ALTCTL 模式下，系统对水平位置估计的依赖较弱，即使出现数据拒绝，影响也较小；但在 POSCTL 模式下，位置估计的准确性直接决定控制性能，数据拒绝导致的位置跳变会立即引发控制异常，这解释了为什么问题只在 POSCTL 模式下暴露出来。


## 4. 问题诊断

基于 `log_284` 案例的可视化分析，本节系统性地讲解如何通过图表识别和诊断飞行过程中的常见问题，并提供相应的解决方案。

### 4.1 位置估计异常分析

基于 `log_284` 案例的完整分析，位置估计异常问题具有以下典型特征：

- **问题症状**：
  - `estimator_local_position`（EKF2 内部估计位置）与 `vehicle_local_position`（对外发布位置）出现明显偏差
  - X/Y 轴位置出现**锯齿状跳变**，位置在相邻采样之间快速来回抖动
  - Z 轴（高度）相对稳定，问题主要集中在水平位置（X/Y）
  - Yaw 角出现频繁、剧烈的瞬时反转
  - 问题仅在 Position 模式下暴露，在 Altitude 模式下表现正常

- **诊断方法**：
  - 对比 EKF2 内部估计位置与对外发布位置（见 [3.3 节](#33-ekf2-内部位置-vs-对外发布位置)）
  - 分析 EKF2 test ratio 和数据拒绝事件（见 [3.5 节](#35-test-ratio-与位置跳变关联分析)）
  - 观察飞行模式切换与位置跳变的时间对应关系（见 [3.1 节](#31-飞行模式时间线)）
  - 对比问题飞行与正常飞行的姿态角响应（见 [3.2 节](#32-姿态角时间序列)）

- **问题原因分析**（基于 log_284）：

  1. **EKF2 数据拒绝机制触发**：
     - 当 `test_ratio > 1.0` 时，EKF2 拒绝外部位置数据（如视觉定位数据），只能依赖 IMU 预测
     - 位置逐渐漂移；下次数据被接受时，位置突然"跳回"，形成锯齿状跳变
     - 在 `log_284` 中，test ratio 峰值可达 30 以上，大部分在 5-20 之间

  2. **参数设置过小导致过度拒绝**：
     - `EKF2_EV_POS_X/Y` 设置过小（如 0.1），导致 innovation test 过于严格
     - 视觉数据频繁被拒绝，特别是在 Position 模式启动时和异常峰值期（35-45秒）
     - 数据拒绝事件集中在模式切换时刻和异常峰值期，与位置跳变完全对应

  3. **控制回路反馈振荡**：
     - Position 模式下，位置控制器基于不稳定的位置反馈产生控制指令
     - 位置跳变导致控制器不断尝试修正"错误"的位置，形成振荡反馈
     - 这种振荡反馈进一步加剧了位置估计的不稳定性，形成恶性循环

  4. **模式依赖性问题**：
     - 在 Altitude 模式下，系统对水平位置估计的依赖较弱，即使出现数据拒绝，影响也较小
     - 在 Position 模式下，位置估计的准确性直接决定控制性能，数据拒绝导致的位置跳变会立即引发控制异常
     - 这解释了为什么问题只在 Position 模式下暴露出来

### 4.2 解决方案

基于 `log_284` 案例的诊断结果，建议按照以下问题排查清单逐步检查和调整：

**问题排查清单**：

1. **检查并调整 EKF2 参数**：
   - 检查 `EKF2_EV_POS_X` 和 `EKF2_EV_POS_Y` 的当前值，如果过小（如 0.1），建议调整到 0.3-0.5
     - 这些参数定义了外部位置数据（如视觉定位）的标准偏差
     - 增大这些值可以放宽 innovation test 的严格程度，减少数据被过度拒绝的情况
   - 检查 `EKF2_EVP_GATE`（innovation gate 阈值），如果默认值为 3.0，可以尝试调整到 5.0
     - 这个参数控制 innovation test 的拒绝阈值，增大后可以减少数据拒绝
   - 调整后重新飞行并记录日志，检查 test ratio 是否降低，数据拒绝事件是否减少，确认位置跳变和 Yaw 角异常是否消失

2. **检查外部定位数据质量**：
   - 验证视觉定位数据（VRPN）的噪声水平
     - 检查数据转发脚本的过滤逻辑是否合理
     - 确认数据更新频率是否在合理范围内（建议 20-50 Hz）
     - 验证数据是否包含异常值或跳变
   - 优化数据预处理流程
     - 在数据转发脚本中添加异常值过滤
     - 实现数据平滑滤波，减少噪声
     - 确保数据时间戳同步准确

3. **验证传感器校准状态**：
   - 重新校准 IMU（加速度计、陀螺仪）
     - 使用 PX4 的校准工具进行完整校准
     - 确保传感器数据质量，减少 IMU 预测误差
   - 检查传感器安装情况
     - 确认传感器安装牢固，无松动
     - 检查是否存在电磁干扰
     - 验证传感器数据是否在合理范围内

4. **考虑固件和配置优化**：
   - 检查是否有可用的固件升级
     - 考虑升级/降级 PX4 固件版本，可能包含位置处理逻辑的优化
     - 查看固件更新日志，了解 EKF2 相关的改进
   - 根据实际飞行环境调整其他相关参数
     - `EKF2_AID_MASK`：控制哪些辅助数据源被使用
     - `EKF2_HGT_MODE`：高度估计模式选择
     - 根据实际飞行环境和传感器配置进行优化

5. **调整飞行策略**（临时方案）：
   - 避免频繁模式切换
     - 在 Position 模式下保持稳定飞行，减少模式切换频率
     - 如果必须切换，确保在 Altitude 模式下停留足够时间，让 EKF2 重新收敛
   - 如果问题持续存在，考虑使用其他飞行模式
     - 可以使用 Altitude 模式进行飞行
     - 或者使用 Manual 模式，由飞手直接控制姿态和油门

**验证和测试注意事项**：
- 每次参数调整后，先进行地面测试和短时间悬停测试
- 记录日志并对比调整前后的 test ratio、数据拒绝事件和位置稳定性
- 逐步调整参数，避免一次性大幅修改导致其他问题
- 参考 `log_287`（正常飞行）的参数配置，作为调整的参考基准

### 4.3 小结

本文档以 `log_284` 为实际案例，展示了使用 `pyulog` 库分析 PX4 飞控日志的完整流程。通过系统性的数据提取、可视化和诊断分析，成功定位了 Position 模式下位置跳变问题的根本原因。

**log_284 案例要点**：
- **问题现象**：切换到 Position 模式后，X/Y 轴出现锯齿状位置跳变，Yaw 角频繁反转
- **根本原因**：EKF2 参数（`EKF2_EV_POS_X/Y`）设置过小，导致 innovation test 过于严格，视觉数据频繁被拒绝
- **诊断方法**：通过对比 EKF2 内部估计位置与对外发布位置、分析 test ratio 和数据拒绝事件、观察飞行模式切换与异常的时间对应关系，建立了完整的因果链条
- **解决方案**：调整 `EKF2_EV_POS_X/Y`（从 0.1 调整到 0.3-0.5）和 `EKF2_EVP_GATE`（从 3.0 调整到 5.0），问题得到解决

---

## 参考文档

- [pyulog GitHub 仓库](https://github.com/PX4/pyulog)
- [PX4 ULog 文件格式文档](https://dev.px4.io/v1.12/en/log/ulog_file_format.html)
- [PX4 日志分析指南](https://docs.px4.io/main/en/log/flight_log_analysis.html)
- [Flight Review 在线日志分析工具](https://logs.px4.io/)
- [PlotJuggler 数据可视化工具](https://www.plotjuggler.io/)

