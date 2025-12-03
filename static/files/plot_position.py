from pyulog import ULog
import numpy as np
import matplotlib.pyplot as plt

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

# 获取飞行模式，用于在图上标注模式切换时间
vehicle_status = ulog.get_dataset('vehicle_status')
t_status = np.array(vehicle_status.data['timestamp']) / 1e6 - start_time
nav_state = np.array(vehicle_status.data['nav_state'])

# 找到切换到 Position 模式的时间点（nav_state == 2）
pos_mode_mask = nav_state == 2
if np.any(pos_mode_mask):
    pos_mode_start = t_status[pos_mode_mask][0]
    pos_mode_end = t_status[pos_mode_mask][-1]
else:
    pos_mode_start = None
    pos_mode_end = None

# 绘制三轴位置对比图
fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)

# X 轴
axes[0].plot(t_el, x_el, label='estimator_local_position.x', alpha=0.7, linewidth=1.5, color='#1f77b4')
axes[0].plot(t_vl, x_vl, label='vehicle_local_position.x', alpha=0.7, linewidth=1.5, color='#ff7f0e')
if pos_mode_start:
    axes[0].axvline(pos_mode_start, color='r', linestyle='--', alpha=0.5, label='Position Mode Start')
axes[0].set_ylabel('X (m)', fontsize=11)
axes[0].legend(loc='best', fontsize=9)
axes[0].grid(True, alpha=0.3)

# Y 轴
axes[1].plot(t_el, y_el, label='estimator_local_position.y', alpha=0.7, linewidth=1.5, color='#1f77b4')
axes[1].plot(t_vl, y_vl, label='vehicle_local_position.y', alpha=0.7, linewidth=1.5, color='#ff7f0e')
if pos_mode_start:
    axes[1].axvline(pos_mode_start, color='r', linestyle='--', alpha=0.5)
axes[1].set_ylabel('Y (m)', fontsize=11)
axes[1].legend(loc='best', fontsize=9)
axes[1].grid(True, alpha=0.3)

# Z 轴
axes[2].plot(t_el, z_el, label='estimator_local_position.z', alpha=0.7, linewidth=1.5, color='#1f77b4')
axes[2].plot(t_vl, z_vl, label='vehicle_local_position.z', alpha=0.7, linewidth=1.5, color='#ff7f0e')
if pos_mode_start:
    axes[2].axvline(pos_mode_start, color='r', linestyle='--', alpha=0.5)
axes[2].set_ylabel('Z (m)', fontsize=11)
axes[2].set_xlabel('Time (s)', fontsize=11)
axes[2].legend(loc='best', fontsize=9)
axes[2].grid(True, alpha=0.3)

plt.suptitle('Position Comparison: EKF2 Internal vs Published (log_284)', 
             fontsize=14, fontweight='bold', y=0.995)
plt.tight_layout()

# 保存图片
output_file = 'log_284_position_comparison.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight')
print(f"\n图片已保存到: {output_file}")

plt.show()



