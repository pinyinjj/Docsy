from pyulog import ULog
import numpy as np
import matplotlib.pyplot as plt

# 读取日志文件
ulog_file = 'log_284_2025-11-25-01-15-04.ulg'
ulog = ULog(ulog_file)

# 获取飞行状态数据
vehicle_status = ulog.get_dataset('vehicle_status')
timestamps = np.array(vehicle_status.data['timestamp']) / 1e6
start_time = timestamps[0]
time_rel = timestamps - start_time
nav_state = np.array(vehicle_status.data['nav_state'])

# 飞行模式名称映射
mode_names = {
    0: 'MANUAL', 1: 'ALTCTL', 2: 'POSCTL', 3: 'AUTO_MISSION',
    4: 'AUTO_LOITER', 5: 'AUTO_RTL', 6: 'ACRO', 7: 'OFFBOARD'
}

# 绘制飞行模式时间线
fig, ax = plt.subplots(1, 1, figsize=(12, 6))
ax.plot(time_rel, nav_state, 'o-', markersize=3, linewidth=1.5, alpha=0.7)
ax.set_ylabel('Flight Mode', fontsize=11)
ax.set_yticks(list(mode_names.keys()))
ax.set_yticklabels([mode_names[k] for k in mode_names.keys()])
ax.grid(True, alpha=0.3, axis='y')
ax.set_title('Flight Mode Timeline', fontsize=12, fontweight='bold')
ax.set_xlabel('Time (s)', fontsize=11)
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('flight_mode_timeline.png', dpi=150, bbox_inches='tight')
plt.show()

# 打印模式切换信息
mode_changes = np.where(np.diff(nav_state) != 0)[0]
print("飞行模式切换时间点:")
for idx in mode_changes:
    old_mode = mode_names.get(nav_state[idx], f'Unknown({nav_state[idx]})')
    new_mode = mode_names.get(nav_state[idx+1], f'Unknown({nav_state[idx+1]})')
    print(f"  {time_rel[idx]:.2f} s: {old_mode} -> {new_mode}")

