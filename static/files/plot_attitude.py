from pyulog import ULog
import numpy as np
import matplotlib.pyplot as plt

def quaternion_to_euler(q0, q1, q2, q3):
    """
    将四元数转换为欧拉角（ZYX顺序，即yaw-pitch-roll）
    返回: roll, pitch, yaw (弧度)
    """
    # 计算横滚角 (roll)
    sinr_cosp = 2 * (q0 * q1 + q2 * q3)
    cosr_cosp = 1 - 2 * (q1 * q1 + q2 * q2)
    roll = np.arctan2(sinr_cosp, cosr_cosp)
    
    # 计算俯仰角 (pitch)
    sinp = 2 * (q0 * q2 - q3 * q1)
    # 使用 np.clip 限制范围，避免 arcsin 的域错误
    sinp_clipped = np.clip(sinp, -1.0, 1.0)
    pitch = np.arcsin(sinp_clipped)
    
    # 计算偏航角 (yaw)
    siny_cosp = 2 * (q0 * q3 + q1 * q2)
    cosy_cosp = 1 - 2 * (q2 * q2 + q3 * q3)
    yaw = np.arctan2(siny_cosp, cosy_cosp)
    
    return roll, pitch, yaw

# 读取日志文件
ulog_file = 'log_284_2025-11-25-01-15-04.ulg'
print(f"正在读取日志文件: {ulog_file}")
ulog = ULog(ulog_file)

# 提取姿态数据
try:
    attitude_data = ulog.get_dataset('vehicle_attitude')
except Exception:
    try:
        attitude_data = ulog.get_dataset('vehicle_attitude0')
    except Exception:
        print("错误: 无法找到 vehicle_attitude 数据集")
        exit(1)

# 提取时间戳和四元数
timestamps = np.array(attitude_data.data['timestamp']) / 1e6
start_time = timestamps[0]
time_relative = timestamps - start_time

q0 = np.array(attitude_data.data['q[0]'])
q1 = np.array(attitude_data.data['q[1]'])
q2 = np.array(attitude_data.data['q[2]'])
q3 = np.array(attitude_data.data['q[3]'])

# 数据有效性检查
valid_mask = np.isfinite(q0) & np.isfinite(q1) & np.isfinite(q2) & np.isfinite(q3)
q0_valid = q0[valid_mask]
q1_valid = q1[valid_mask]
q2_valid = q2[valid_mask]
q3_valid = q3[valid_mask]
time_relative_valid = time_relative[valid_mask]

print(f"原始数据点数: {len(timestamps)}")
print(f"有效数据点数: {len(time_relative_valid)}")
print(f"数据时间范围: {time_relative_valid[0]:.2f} s - {time_relative_valid[-1]:.2f} s")

# 计算欧拉角
roll, pitch, yaw = quaternion_to_euler(q0_valid, q1_valid, q2_valid, q3_valid)

# 转换为度数
roll_deg = np.degrees(roll)
pitch_deg = np.degrees(pitch)
yaw_deg = np.degrees(yaw)

# 计算角速度（变化率）
dt = np.diff(time_relative_valid)
roll_rate = np.diff(roll_deg) / dt
pitch_rate = np.diff(pitch_deg) / dt
yaw_rate = np.diff(yaw_deg) / dt
time_rate = time_relative_valid[:-1] + dt/2

# 识别异常波动（角度变化超过阈值）
threshold_deg = 10  # 度
roll_changes = np.abs(np.diff(roll_deg))
pitch_changes = np.abs(np.diff(pitch_deg))
yaw_changes = np.abs(np.diff(yaw_deg))

large_roll_changes = np.where(roll_changes > threshold_deg)[0]
large_pitch_changes = np.where(pitch_changes > threshold_deg)[0]
large_yaw_changes = np.where(yaw_changes > threshold_deg)[0]

# 创建子图：主图显示角度，子图显示角速度
fig = plt.figure(figsize=(14, 10))

# 主图：姿态角
ax1 = plt.subplot(2, 1, 1)
ax1.plot(time_relative_valid, roll_deg, label='Roll', linewidth=1.5, alpha=0.8, color='#1f77b4')
ax1.plot(time_relative_valid, pitch_deg, label='Pitch', linewidth=1.5, alpha=0.8, color='#ff7f0e')
ax1.plot(time_relative_valid, yaw_deg, label='Yaw', linewidth=1.5, alpha=0.8, color='#2ca02c')

# 添加0度参考线
ax1.axhline(y=0, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)

# 标注异常波动点
if len(large_roll_changes) > 0:
    for idx in large_roll_changes[:5]:  # 只标注前5个
        ax1.plot(time_relative_valid[idx], roll_deg[idx], 'ro', markersize=6, alpha=0.6)
if len(large_pitch_changes) > 0:
    for idx in large_pitch_changes[:5]:
        ax1.plot(time_relative_valid[idx], pitch_deg[idx], 'go', markersize=6, alpha=0.6)
if len(large_yaw_changes) > 0:
    for idx in large_yaw_changes[:5]:
        ax1.plot(time_relative_valid[idx], yaw_deg[idx], 'bo', markersize=6, alpha=0.6)

ax1.set_xlabel('Time (s)', fontsize=12)
ax1.set_ylabel('Angle (deg)', fontsize=12)
ax1.set_title('Vehicle Attitude Angles Over Time - Log 284', fontsize=14, fontweight='bold')
ax1.legend(loc='best', fontsize=10)
ax1.grid(True, alpha=0.3)

# 添加说明文字框
info_text = """Interpretation:
• Roll: Left/right tilt, positive=right, negative=left
• Pitch: Forward/backward tilt, positive=forward, negative=backward
• Yaw: Horizontal rotation, 0°=north
• Colored dots: Rapid angle changes (>10°/s)"""
ax1.text(0.02, 0.98, info_text, transform=ax1.transAxes, fontsize=9,
         verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

# 子图：角速度
ax2 = plt.subplot(2, 1, 2)
ax2.plot(time_rate, roll_rate, label='Roll Rate', linewidth=1.2, alpha=0.7, color='#1f77b4')
ax2.plot(time_rate, pitch_rate, label='Pitch Rate', linewidth=1.2, alpha=0.7, color='#ff7f0e')
ax2.plot(time_rate, yaw_rate, label='Yaw Rate', linewidth=1.2, alpha=0.7, color='#2ca02c')
ax2.axhline(y=0, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
ax2.set_xlabel('Time (s)', fontsize=12)
ax2.set_ylabel('Angular Rate (deg/s)', fontsize=12)
ax2.set_title('Attitude Angular Rates', fontsize=12, fontweight='bold')
ax2.legend(loc='best', fontsize=9)
ax2.grid(True, alpha=0.3)

plt.tight_layout()

# 保存图片
output_file = 'log_284_attitude_angles.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight')
print(f"\n图片已保存到: {output_file}")

plt.show()

