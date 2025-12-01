先看mavros话题有没有输出
    rostopic echo /mavros/local_position/pose
    rostopic echo /mavros/global_position/global

    rostopic hz /mavros/local_position/pose
    rostopic info /mavros/local_position/pose
如果没有，检查 PX4 的 EKF2 状态

    PX4 内部有 EKF2 状态和报警信息，可通过 uORB 话题查看：

    # 查看 EKF2 的状态信息
    ros2 topic echo /fmu/out/ekf2_timestamps  # 时间戳
    ros2 topic echo /fmu/out/estimator_status
    常见 EKF2 融合失败原因：
    GPS 信号丢失或不稳定
    IMU 数据异常（震动大、传感器损坏）
    磁力计干扰或偏差过大
    参数配置错误（如 EKF2_AID_MASK 没有启用对应传感器融合）
3. 查看日志（.ulg 文件）
    PX4 会记录飞行日志里面包含 EKF2 融合状态：
    使用 QGroundControl 下载 .ulg 日志文件。
    用 QGroundControl 或 Flight Review 打开。
    查看 Estimator Status / EKF2：
    Innovation Test Ratios（传感器残差）
    Control Status（融合标志）
    警告和错误信息
    这些日志里会明确显示 EKF2 融合失败的原因，比如：
    GPS quality insufficient
    Mag fusion failed
    Bad IMU data

只要你使用 MAVROS 并发布：
    /mavros/vision_pose/pose
    （MAVROS 自动转换为 MAVLink 的 VISION_POSITION_ESTIMATE）
    ekf2会融合，mavros会通过/mavros/local_position/pose话题 输出