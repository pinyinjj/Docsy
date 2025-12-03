---
title: "使用 pyulog 分析 PX4 飞控日志"
date: 2025-12-04
summary: "系统介绍如何使用 pyulog 库从 PX4 ULog 日志中提取有效数据条目，识别关键参数，并通过 matplotlib 生成专业图表以诊断飞行问题。"
tags: ["PX4", "pyulog", "ULog", "日志分析", "数据可视化", "Python", "飞控", "故障诊断"]
categories: ["技术文档"]
weight: 10
draft: True
---

本文档以实际案例 `log_284_2025-11-25-01-15-04.ulg` 为例，系统介绍如何使用 Python 的 `pyulog` 库分析 PX4 飞控生成的 ULog 格式日志文件，通过提取关键数据并生成可视化图表来诊断飞行过程中的潜在问题。

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

### 1.3 发现日志中的主题并识别关键数据条目

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


## 2. 关键数据条目解析

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

基于 [`log_284`](/Docsy/files/log_284_2025-11-25-01-15-04.ulg) 案例，本节展示如何将提取的关键数据绘制成专业图表，直观展示数据变化趋势，为问题诊断提供可视化支持。

读者可以自行下载该日志文件，使用本文提供的脚本进行复现分析。

### 3.1 飞行模式时间线：还原整段飞行过程

通过飞行模式随时间变化的曲线，可以“一眼看懂”整段飞行中飞机经历了哪些阶段（起飞、悬停、手动介入、稳高/定点、降落等），这是后续所有细节分析的时间框架。

脚本下载：[`plot_flight_mode.py`](/Docsy/files/plot_flight_mode.py)

![飞行模式时间线（log_284）](/Docsy/images/flight_mode_timeline.png)

- **图表含义**：  
  - **横轴**：时间（秒），从日志开始后的相对时间。  
  - **纵轴**：飞行模式（Flight Mode），数值或颜色编码对应 PX4 中的各个模式，例如 `Manual / Altitude / Position / Offboard` 等。  
  - **关键信息**：每一次模式切换的时间点及持续时长。  

- **分析**：  
  - 出问题的飞行中，**切换到某个模式前后是否刚好出现异常**（如位置突然漂移、姿态异常、油门剧烈变化）。  
  - 定位问题常常在切入 **Position / Offboard / Auto** 等依赖位置估计的模式后暴露出来，而在 **Manual / Altitude** 等对位置依赖较弱的模式下表现正常。  
  - 是否存在频繁、快速的模式切换，这往往意味着飞手在进行紧急干预或者飞控在触发保护逻辑（如 failsafe / mode fallback）。  
  
  由此图得知，飞机在 **切换到 Position 模式后**，开始出现水平位置漂移和姿态控制异常；而当切回 **Altitude 或 Manual 模式** 并由飞手直接接管后，轨迹明显变得稳定。这为后续 Position 模式下位置估计异常的因果分析提供了非常明确的时间锚点。  


### 3.2 姿态角时间序列：从"机体感觉"看控制是否健康

姿态角（Roll/Pitch/Yaw）时间序列是最直观反映飞控控制性能的图表之一。通过对比问题飞行（`log_284`）和正常飞行（[`log_287`](/Docsy/files/log_287_2025-11-25-05-30-36.ulg)），可以很快判断控制回路是否处于健康工作区间。

脚本下载：[`plot_attitude.py`](/Docsy/files/plot_attitude.py)

问题飞行
![姿态角时间序列（问题飞行 log_284）](/Docsy/images/log_284_attitude_angles.png)


正常飞行
![姿态角时间序列（正常飞行 log_287）](/Docsy/images/log_287_attitude_angles.png)

- **图表含义**：  
  - **横轴**：时间（秒）。  
  - **纵轴**：  
    - Roll（横滚角，绕 X 轴）  
    - Pitch（俯仰角，绕 Y 轴）  
    - Yaw（偏航角，绕 Z 轴）  

- **分析**：  
  - 在 `log_284` 中：  
    - Roll / Pitch 大致跟随飞手输入，变化幅度与正常飞行相近，看起来基本正常。  
    - **Yaw 曲线出现频繁、剧烈的瞬时反转**，角速度瞬时可达非常大的数值，这在正常飞行中几乎不会出现。  
  - 在 `log_287`（稳定飞行）中：  
    - 三轴姿态曲线整体平滑，变化速度大致集中在合理范围内（例如 $\pm 40^\circ$ 以内较多，且过渡平顺），与飞手操纵动作和任务场景相符。  
  - **Yaw 频繁、非线性的跳变**，通常意味着：  
    - 位置/航向估计不稳定（EKF2 融合质量差），导致航向参考频繁跳变。  
    - 或控制器在错误反馈信号驱动下不断反向调整，形成失控感。  
  - 若 Roll / Pitch 正常而 Yaw 异常，往往说明 **问题不在基本姿态控制环路本身，而在更高层（如位置/航向估计或上层控制模式）**。  
  
  通过这一对比，可以直接观察到：**同一架飞机、相似的飞行场景，仅仅因为参数/配置不同，姿态响应就可以从平滑可控变为瞬间反转、接近失控**，从而证明问题根源在于位置估计与控制逻辑的配置不当，而非机械结构或硬件故障。  

### 3.3 位置对比：EKF2 内部位置 vs 对外发布位置

位置对比图是 `log_284` 案例中最关键的证据之一：它将 EKF2 内部估计的位置（来自 `estimator_local_position`）与飞控对外发布的位置（如 `vehicle_local_position`）叠加到同一坐标系中，直观展示 EKF2 内部位置估计与对外发布位置之间的差异。

脚本下载：[`plot_position.py`](/Docsy/files/plot_position.py)

![位置对比图（log_284）](/Docsy/images/log_284_position_comparison.png)

- **图表含义**：  
  - **横轴**：时间（秒）。  
  - **纵轴**：位置（米），分别为 X / Y / Z 轴。  
  - **两组曲线**：  
    - EKF2 内部估计位置（Internal / EKF2）  
    - 对上层控制和外部模块发布的位置（Published / Vehicle）  

- **分析**：  
  - 在 `log_284` 中可以清楚看到：  
    1. **模式切换前（如 Altitude / Manual）**：  
       - X/Y/Z 三轴上，内部估计与对外发布的曲线基本重合，说明此阶段位置估计整体是可信的。  
    2. **切换到 Position 模式后**：  
       - X/Y 轴的两条曲线开始出现明显分离，并呈现 **锯齿状跳变和来回抖动**；  
       - Z 轴高度仍然相对稳定，没有出现类似的跳变。  
    3. **切回 Altitude / Manual 并由飞手接管后**：  
       - X/Y 轴曲线重新趋于一致，不再大幅偏离。  
  - 在 PX4 的 Position 模式中，飞控会在切入该模式时**将当前飞机所在的 X/Y 位置视为新的保持目标点**，随后根据飞手摇杆输入在水平面上生成位置或速度设定值；Z 轴高度通常由油门/高度杆给出目标高度或爬升率，**若位置估计本身发生跳变或漂移，控制器会基于错误的位置反馈持续调整控制量**，导致飞机在地面出现缓慢漂移现象。  
  - Position 模式启动后，由于 EKF2 对外发布的位置在 X/Y 上发生了异常跳变，上层位置控制器不断试图跟随这些错误的位置目标，导致缓慢甚至随机方向漂移；当退出 Position，改为 Altitude 或 Manual 并由飞手直接控制姿态/油门时，对位置估计的依赖减弱，漂移现象立即消失。  
  - 这与前文对 EKF2 `test_ratio` 和参数 `EKF2_EV_POS_X/Y` 过于严格导致数据被拒绝的分析形成闭环：**位置估计不稳 → 发布位置跳变 → Position 控制器基于错误反馈输出错误控制量 → 飞机在 Position 模式下出现失控漂移**。  

### 3.4 加速度计 X 轴时域对比：从振动侧面验证"系统健康度"

加速度计 X 轴时域对比图，将问题飞行（`log_284`）与正常飞行（`log_287`）在同一时间标度下叠加，帮助我们从机体振动和动态响应的角度，验证系统是否处在一个合理的工作环境中。

脚本下载：[`plot_accel.py`](/Docsy/files/plot_accel.py)

![加速度计 X 轴时域对比](/Docsy/images/accel_plot.png)

- **图表含义**：  
  - **横轴**：时间（秒），分别对两段日志做相对时间对齐。  
  - **纵轴**：X 轴线加速度（m/s²），对应机体前后方向（通常是机头指向）。  
  - **两条曲线**：  
    - `log_284 accel X`：存在问题的飞行。  
    - `log_287 accel X`：参数/配置优化后的稳定飞行。  

- **分析**：  
  - 若 `log_284` 中曲线明显更加粗糙、高频抖动明显，且存在大量尖峰（如频繁接近 IMU 量程上限），则说明：  
    - 机体振动水平偏高，可能来自螺旋桨不平衡、结构共振、安装松动等；  
    - 或滤波参数设置不合理（截止频率过高、阻尼不足），导致高频噪声直接进入控制回路。  
  - 若 `log_287` 的曲线明显更平滑、基线更接近 $\pm 1g$ 附近的小幅摆动，则表明：  
    - 当前机械结构和滤波设置下，IMU 工作在一个**健康的振动环境**中，为 EKF2 融合和姿态控制提供了可靠输入。  
  - 这一对比可以有效排除或确认问题是否来自机械振动：  
    - 若姿态/位置异常同时伴随 **明显的高频振动增强**，需要优先从机械和滤波角度排查；  
    - 若振动水平在问题飞行与正常飞行之间差异不大，而姿态/位置却有显著不同，则更可能是参数、传感器融合或控制逻辑问题。  
  - 在本案例中，若 X 轴加速度对比显示 `log_284` 并未出现极端恶化的振动，却存在明显的位置/姿态异常，就进一步支持了前文结论：**问题核心在于 EKF2 配置和 Position 模式下的位置控制逻辑，而不是单纯机械振动**。  
  
  只需对比这张图中两条曲线的整体平滑度和峰值大小，就能判断系统是否工作在一个健康的振动水平。


## 4. 通过图表发现问题

基于 `log_284` 案例的可视化分析，本节系统性地讲解如何通过图表识别和诊断飞行过程中的常见问题。

### 4.1 振动问题诊断

**症状**：加速度计或陀螺仪数据中存在高频振荡。

**分析方法**：
- 查看加速度计数据的时域图，观察是否存在规律性的高频波动
- 使用频谱分析（FFT 或功率谱密度）识别振动频率
- 常见振动频率范围：螺旋桨不平衡（50-200 Hz）、结构共振（10-50 Hz）

**解决方案**：
- 检查螺旋桨平衡性，必要时更换或重新平衡螺旋桨
- 检查电机安装是否牢固，是否存在松动
- 在飞控与机架之间安装减震垫
- 调整滤波器参数（如 `IMU_GYRO_CUTOFF`）



### 4.3 位置估计异常（log_284 典型案例）

**症状**：`estimator_local_position` 与 `vehicle_local_position` 出现明显偏差或锯齿状跳变。

**log_284 案例分析**：

在 `log_284` 的位置对比图中，可以观察到：

1. **模式切换前**：两个位置曲线基本重合，XYZ 一致性良好
2. **切换到 Position 模式后**：X/Y 轴出现明显的锯齿状位置跳变
3. **问题特征**：
   - 位置在相邻采样之间快速来回抖动
   - `estimator_local_position` 与 `vehicle_local_position` 出现显著偏差
   - Z 轴（高度）相对稳定，问题主要集中在平面位置

**分析方法**：

```python
# 结合 EKF2 融合状态分析位置跳变原因
try:
    innovations = ulog.get_dataset('estimator_innovations')
    t_innov = np.array(innovations.data['timestamp']) / 1e6 - start_time
    ev_hpos_test_ratio_x = np.array(innovations.data['ev_hpos_test_ratio[0]'])
    ev_hpos_test_ratio_y = np.array(innovations.data['ev_hpos_test_ratio[1]'])
    
    # 绘制 test_ratio 与位置跳变的关联
    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    
    # X 轴位置对比
    axes[0].plot(t_el, x_el, label='EKF2 Internal', alpha=0.7, linewidth=1.5)
    axes[0].plot(t_vl, x_vl, label='Published', alpha=0.7, linewidth=1.5)
    axes[0].set_ylabel('X Position (m)', fontsize=11)
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # X 轴 test_ratio
    axes[1].plot(t_innov, ev_hpos_test_ratio_x, 'r-', linewidth=1.5, alpha=0.7)
    axes[1].axhline(1.0, color='k', linestyle='--', label='Rejection Threshold')
    axes[1].set_ylabel('X Test Ratio', fontsize=11)
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    # 数据被拒绝的时间点
    rejected_mask_x = ev_hpos_test_ratio_x > 1.0
    rejected_times_x = t_innov[rejected_mask_x]
    axes[2].scatter(rejected_times_x, np.ones_like(rejected_times_x), 
                    c='red', s=10, alpha=0.5, label='Data Rejected')
    axes[2].set_ylabel('Rejection Events', fontsize=11)
    axes[2].set_xlabel('Time (s)', fontsize=11)
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)
    
    plt.suptitle('Position Jump Analysis: Test Ratio vs Position (log_284)', 
                 fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('log_284_test_ratio_analysis.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    # 统计信息
    rejection_rate_x = np.sum(rejected_mask_x) / len(rejected_mask_x) * 100
    print(f"X 轴数据拒绝率: {rejection_rate_x:.1f}%")
    print(f"X 轴最大 test_ratio: {np.max(ev_hpos_test_ratio_x):.2f}")
except:
    print("未找到 estimator_innovations 数据")
```

**问题原因分析**（基于 log_284）：

1. **EKF2 数据拒绝机制**：当 `test_ratio > 1.0` 时，EKF2 拒绝视觉数据，只能依赖 IMU 预测，位置逐渐漂移；下次数据被接受时，位置突然"跳回"，形成锯齿状跳变。

2. **参数设置过小**：`EKF2_EV_POS_X/Y` 设置过小，导致 innovation test 过于严格，视觉数据频繁被拒绝。

3. **控制回路反馈振荡**：Position 模式下，位置控制器基于不稳定的位置反馈产生控制指令，形成振荡反馈。

**解决方案**：

- **调整 EKF2 参数**：
  - 增大 `EKF2_EV_POS_X` 和 `EKF2_EV_POS_Y`（如从 0.1 调整到 0.3）
  - 适当增大 `EKF2_EVP_GATE`（innovation gate 阈值）
  
- **检查外部定位数据质量**：
  - 验证视觉定位数据（VRPN）的噪声水平
  - 检查数据转发脚本的过滤逻辑

- **验证传感器校准**：
  - 重新校准 IMU（加速度计、陀螺仪）
  - 确保传感器数据质量

- **固件升级**：考虑升级 PX4 固件版本，可能包含位置处理逻辑的优化

### 4.4 传感器故障或校准问题

**症状**：传感器数据出现异常跳变、漂移或超出合理范围。

**分析方法**：
- 检查传感器数据是否包含 NaN 或无穷大值
- 观察数据是否在合理范围内（如加速度计 ±20 m/s²，陀螺仪 ±10 rad/s）
- 对比多个传感器实例的数据（如 `sensor_accel0` vs `sensor_accel1`）

**解决方案**：
- 重新校准传感器（加速度计、陀螺仪、磁力计）
- 检查传感器连接是否牢固
- 检查是否存在电磁干扰
- 必要时更换故障传感器



## 6. 总结

本文档以 `log_284_2025-11-25-01-15-04.ulg` 为实际案例，系统介绍了使用 `pyulog` 库分析 PX4 飞控日志的完整流程：

### 6.1 分析流程总结

1. **探索日志内容**：使用 Python 脚本列出所有主题，了解日志中包含的数据类型
2. **识别关键主题**：根据分析目标（飞行模式、EKF2 融合状态、姿态、位置等）选择关键主题
3. **提取数据并预处理**：提取关键数据，进行时间戳转换、数据有效性检查等预处理
4. **理解数据意义**：掌握每个数据条目的物理意义、单位和合理范围
5. **可视化分析**：生成专业图表，直观展示数据变化趋势
6. **问题诊断**：结合图表分析和领域知识，系统性地诊断问题

### 6.2 log_284 案例要点

通过 `log_284` 案例的分析，我们发现了 Position 模式下的位置跳变问题：

- **问题现象**：切换到 Position 模式后，X/Y 轴出现锯齿状位置跳变
- **根本原因**：EKF2 参数设置过小，导致视觉数据频繁被拒绝
- **诊断方法**：对比 `estimator_local_position` 与 `vehicle_local_position`，分析 `test_ratio`
- **解决方案**：调整 `EKF2_EV_POS_X/Y` 和 `EKF2_EVP_GATE` 参数

### 6.3 方法论价值

这种方法为飞行器调试和性能优化提供了强有力的工具：

- **系统性**：从数据探索到问题诊断的完整流程
- **可复现**：基于实际案例，提供可直接运行的代码
- **专业性**：深入理解数据意义，准确诊断问题
- **实用性**：适用于各种飞行日志分析场景

通过掌握这些方法，开发者可以快速定位和解决飞行过程中的各种问题，提升飞行器的安全性和性能。

---

## 参考文档

- [pyulog GitHub 仓库](https://github.com/PX4/pyulog)
- [PX4 ULog 文件格式文档](https://dev.px4.io/v1.12/en/log/ulog_file_format.html)
- [PX4 日志分析指南](https://docs.px4.io/main/en/log/flight_log_analysis.html)
- [Flight Review 在线日志分析工具](https://logs.px4.io/)
- [PlotJuggler 数据可视化工具](https://www.plotjuggler.io/)

