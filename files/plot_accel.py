from pyulog import ULog
import numpy as np
import matplotlib.pyplot as plt


def load_accel_xy(ulog_path):
    """读取单个 ulog 文件的加速度计 X 和 Y 轴数据和相对时间"""
    print(f"正在读取日志文件: {ulog_path}")
    ulog = ULog(ulog_path)

    try:
        sensor_data = ulog.get_dataset('sensor_combined')
    except Exception:
        try:
            sensor_data = ulog.get_dataset('sensor_combined0')
        except Exception:
            print(f"错误: 无法在 {ulog_path} 中找到 sensor_combined 数据集")
            raise

    timestamps = np.array(sensor_data.data['timestamp']) / 1e6  # 秒
    accel_x = np.array(sensor_data.data['accelerometer_m_s2[0]'])
    accel_y = np.array(sensor_data.data['accelerometer_m_s2[1]'])

    t_rel = timestamps - timestamps[0]
    return t_rel, accel_x, accel_y


# 日志 284 和 287
ulog_284 = 'log_284_2025-11-25-01-15-04.ulg'
ulog_287 = 'log_287_2025-11-25-05-30-36.ulg'

t_284, accel_x_284, accel_y_284 = load_accel_xy(ulog_284)
t_287, accel_x_287, accel_y_287 = load_accel_xy(ulog_287)

# 创建两个子图：X轴和Y轴
fig, axes = plt.subplots(2, 1, figsize=(12, 10), sharex=True)

# X轴加速度对比图
axes[0].plot(t_284, accel_x_284, label='log_284 accel X', linewidth=1.0, alpha=0.7, color='#1f77b4')
axes[0].plot(t_287, accel_x_287, label='log_287 accel X', linewidth=1.0, alpha=0.7, color='#ff7f0e')
axes[0].set_ylabel('Acceleration X (m/s²)', fontsize=11)
axes[0].set_title('Accelerometer X-Axis Time Domain (log_284 vs log_287)', fontsize=12, fontweight='bold')
axes[0].grid(True, alpha=0.3)
axes[0].legend(loc='best', fontsize=10)

# Y轴加速度对比图
axes[1].plot(t_284, accel_y_284, label='log_284 accel Y', linewidth=1.0, alpha=0.7, color='#1f77b4')
axes[1].plot(t_287, accel_y_287, label='log_287 accel Y', linewidth=1.0, alpha=0.7, color='#ff7f0e')
axes[1].set_xlabel('Time (s)', fontsize=11)
axes[1].set_ylabel('Acceleration Y (m/s²)', fontsize=11)
axes[1].set_title('Accelerometer Y-Axis Time Domain (log_284 vs log_287)', fontsize=12, fontweight='bold')
axes[1].grid(True, alpha=0.3)
axes[1].legend(loc='best', fontsize=10)

plt.tight_layout()
output_file = 'vibration_analysis.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight')
print(f"加速度对比图已保存到: {output_file}")
plt.show()


