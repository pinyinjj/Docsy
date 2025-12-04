from pyulog import ULog
import numpy as np
import matplotlib.pyplot as plt


def quaternion_to_euler(q0, q1, q2, q3):
    """
    将四元数转换为欧拉角（ZYX 顺序: yaw-pitch-roll）
    返回: roll, pitch, yaw (弧度)
    """
    # 横滚角 (roll)
    sinr_cosp = 2 * (q0 * q1 + q2 * q3)
    cosr_cosp = 1 - 2 * (q1 * q1 + q2 * q2)
    roll = np.arctan2(sinr_cosp, cosr_cosp)

    # 俯仰角 (pitch)
    sinp = 2 * (q0 * q2 - q3 * q1)
    sinp_clipped = np.clip(sinp, -1.0, 1.0)
    pitch = np.arcsin(sinp_clipped)

    # 偏航角 (yaw)
    siny_cosp = 2 * (q0 * q3 + q1 * q2)
    cosy_cosp = 1 - 2 * (q2 * q2 + q3 * q3)
    yaw = np.arctan2(siny_cosp, cosy_cosp)

    return roll, pitch, yaw


# 读取日志文件
ulog_file = 'log_284_2025-11-25-01-15-04.ulg'
print(f"正在读取日志文件: {ulog_file}")
ulog = ULog(ulog_file)

# 获取位置数据
try:
    elp = ulog.get_dataset('estimator_local_position0')
except Exception:
    elp = ulog.get_dataset('estimator_local_position')

vlp = ulog.get_dataset('vehicle_local_position')

# 时间戳（秒）
t_el = np.array(elp.data['timestamp']) / 1e6
t_vl = np.array(vlp.data['timestamp']) / 1e6
start_time = min(t_el[0], t_vl[0])
t_el = t_el - start_time
t_vl = t_vl - start_time

# 位置数据（单位：米）
x_el = np.array(elp.data['x'])
y_el = np.array(elp.data['y'])
z_el = np.array(elp.data['z'])
x_vl = np.array(vlp.data['x'])
y_vl = np.array(vlp.data['y'])
z_vl = np.array(vlp.data['z'])

# 飞行模式名称映射
NAV_STATE_NAMES = {
    0: 'MANUAL', 1: 'ALTCTL', 2: 'POSCTL', 3: 'AUTO_MISSION', 4: 'AUTO_LOITER',
    5: 'AUTO_RTL', 6: 'ACRO', 7: 'OFFBOARD', 8: 'STAB', 9: 'RATTITUDE',
    10: 'AUTO_TAKEOFF', 11: 'AUTO_LAND', 12: 'AUTO_FOLLOW_TARGET', 13: 'AUTO_PRECLAND',
    14: 'ORBIT', 15: 'AUTO_VTOL_TAKEOFF', 16: 'AUTO_VTOL_LAND', 17: 'PARACHUTE',
    18: 'AUTO_LANDENGFAIL', 19: 'AUTO_LANDGPSFAIL', 20: 'DESCEND', 21: 'TERMINATION',
    22: 'OFFBOARD', 23: 'FOLLOW_TARGET'
}

# 获取飞行模式数据，用于标记模式切换
try:
    vehicle_status = ulog.get_dataset('vehicle_status')
    t_status = np.array(vehicle_status.data['timestamp']) / 1e6 - start_time
    nav_state = np.array(vehicle_status.data['nav_state'])
    
    # 找到所有模式切换的时间点和状态名称
    mode_changes = []  # [(time, state_name), ...]
    prev_state = None
    for i, state in enumerate(nav_state):
        if prev_state is not None and state != prev_state:
            state_name = NAV_STATE_NAMES.get(state, f'UNKNOWN({state})')
            mode_changes.append((t_status[i], state_name))
            print(f"  t={t_status[i]:.2f}s: {NAV_STATE_NAMES.get(prev_state, f'UNKNOWN({prev_state})')} -> {state_name}")
        prev_state = state
    
    print(f"\n检测到 {len(mode_changes)} 次模式切换")
except Exception as e:
    print(f"无法获取飞行模式数据: {e}")
    mode_changes = []

# 获取姿态角数据
try:
    attitude_data = ulog.get_dataset('vehicle_attitude')
except Exception:
    try:
        attitude_data = ulog.get_dataset('vehicle_attitude0')
    except Exception:
        print("警告: 无法找到 vehicle_attitude 数据集")
        attitude_data = None

if attitude_data is not None:
    q0 = np.array(attitude_data.data['q[0]'])
    q1 = np.array(attitude_data.data['q[1]'])
    q2 = np.array(attitude_data.data['q[2]'])
    q3 = np.array(attitude_data.data['q[3]'])
    t_att = np.array(attitude_data.data['timestamp']) / 1e6 - start_time
    roll, pitch, yaw = quaternion_to_euler(q0, q1, q2, q3)
    yaw_deg = np.degrees(yaw)
else:
    t_att = None
    yaw_deg = None

# 结合 EKF2 融合状态分析位置跳变原因
try:
    test_ratios = ulog.get_dataset('estimator_innovation_test_ratios')
    t_innov = np.array(test_ratios.data['timestamp']) / 1e6 - start_time
    ev_hpos_test_ratio_x = np.array(test_ratios.data['ev_hpos[0]'])
    ev_hpos_test_ratio_y = np.array(test_ratios.data['ev_hpos[1]'])
    
    # 绘制 test_ratio 与位置跳变的关联
    fig, axes = plt.subplots(3, 1, figsize=(14, 10), sharex=True)
    
    # X 轴位置对比（添加姿态角信息）
    ax1 = axes[0]
    ax1_twin = ax1.twinx()  # 创建双Y轴用于显示姿态角
    
    # 绘制位置数据
    line1 = ax1.plot(t_el, x_el, label='EKF2 Internal', alpha=0.7, linewidth=1.5, color='blue')
    line2 = ax1.plot(t_vl, x_vl, label='Published', alpha=0.7, linewidth=1.5, color='orange')
    
    # 绘制 Yaw 角（使用双Y轴）
    if t_att is not None and yaw_deg is not None:
        line3 = ax1_twin.plot(t_att, yaw_deg, label='Yaw', alpha=0.5, linewidth=1.5, color='green', linestyle='--')
    
    # 添加模式切换的红色竖线和状态名称
    mode_line_added = False
    for mode_time, state_name in mode_changes:
        ax1.axvline(mode_time, color='red', linestyle='--', linewidth=1.5, alpha=0.6, 
                   label='Mode Change' if not mode_line_added else '')
        ax1_twin.axvline(mode_time, color='red', linestyle='--', linewidth=1.5, alpha=0.6)
        # 添加状态名称文本标注
        ax1.text(mode_time, ax1.get_ylim()[1] * 0.95, state_name, 
                rotation=90, verticalalignment='bottom', horizontalalignment='right',
                fontsize=8, color='red', alpha=0.8, bbox=dict(boxstyle='round,pad=0.3', 
                facecolor='white', edgecolor='red', alpha=0.7))
        mode_line_added = True
    
    ax1.set_ylabel('X Position (m)', fontsize=11, color='black')
    ax1_twin.set_ylabel('Yaw Angle (deg)', fontsize=11, color='gray')
    ax1.tick_params(axis='y', labelcolor='black')
    ax1_twin.tick_params(axis='y', labelcolor='gray')
    
    # 合并图例
    lines1, labels1 = ax1.get_legend_handles_labels()
    if t_att is not None and yaw_deg is not None:
        lines2, labels2 = ax1_twin.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='best', fontsize=8)
    else:
        ax1.legend(lines1, labels1, loc='best', fontsize=9)
    
    ax1.grid(True, alpha=0.3)
    
    # X 轴 test_ratio
    ax2 = axes[1]
    ax2.plot(t_innov, ev_hpos_test_ratio_x, 'r-', linewidth=1.5, alpha=0.7)
    ax2.axhline(1.0, color='k', linestyle='--', label='Rejection Threshold')
    
    # 添加模式切换的红色竖线和状态名称
    mode_line_added2 = False
    for mode_time, state_name in mode_changes:
        ax2.axvline(mode_time, color='red', linestyle='--', linewidth=1.5, alpha=0.6,
                   label='Mode Change' if not mode_line_added2 else '')
        # 添加状态名称文本标注
        ax2.text(mode_time, ax2.get_ylim()[1] * 0.95, state_name, 
                rotation=90, verticalalignment='bottom', horizontalalignment='right',
                fontsize=8, color='red', alpha=0.8, bbox=dict(boxstyle='round,pad=0.3', 
                facecolor='white', edgecolor='red', alpha=0.7))
        mode_line_added2 = True
    
    ax2.set_ylabel('X Test Ratio', fontsize=11)
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 数据被拒绝的时间点
    ax3 = axes[2]
    rejected_mask_x = ev_hpos_test_ratio_x > 1.0
    rejected_times_x = t_innov[rejected_mask_x]
    ax3.scatter(rejected_times_x, np.ones_like(rejected_times_x), 
                c='red', s=10, alpha=0.5, label='Data Rejected')
    
    # 添加模式切换的红色竖线和状态名称
    mode_line_added3 = False
    for mode_time, state_name in mode_changes:
        ax3.axvline(mode_time, color='red', linestyle='--', linewidth=1.5, alpha=0.6,
                   label='Mode Change' if not mode_line_added3 else '')
        # 添加状态名称文本标注
        ax3.text(mode_time, ax3.get_ylim()[1] * 0.95, state_name, 
                rotation=90, verticalalignment='bottom', horizontalalignment='right',
                fontsize=8, color='red', alpha=0.8, bbox=dict(boxstyle='round,pad=0.3', 
                facecolor='white', edgecolor='red', alpha=0.7))
        mode_line_added3 = True
    
    ax3.set_ylabel('Rejection Events', fontsize=11)
    ax3.set_xlabel('Time (s)', fontsize=11)
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    plt.suptitle('Position Jump Analysis: Test Ratio vs Position (log_284)', 
                 fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('log_284_test_ratio_analysis.png', dpi=150, bbox_inches='tight')
    print(f"\n图片已保存到: log_284_test_ratio_analysis.png")
    plt.show()
    
    # 统计信息
    rejection_rate_x = np.sum(rejected_mask_x) / len(rejected_mask_x) * 100
    print(f"\nX 轴数据拒绝率: {rejection_rate_x:.1f}%")
    print(f"X 轴最大 test_ratio: {np.max(ev_hpos_test_ratio_x):.2f}")
    
except Exception as e:
    print(f"未找到 estimator_innovations 数据: {e}")

