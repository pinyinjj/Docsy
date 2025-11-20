---
draft: True
---
版本 ros2 jazzy
    安装mavros
    sudo apt install ros-jazzy-mavros

    wget https://raw.githubusercontent.com/mavlink/mavros/ros2/mavros/scripts/install_geographiclib_datasets.sh
    ./install_geographiclib_datasets.sh

    完成

安装vrpn 
    sudo apt install ros-jazzy-vrpn-mocap 根据ros2版本来修改版本名字


    运行 
    ros2 launch vrpn_mocap client.launch.yaml server:=10.1.1.198

    返回
    [INFO] [launch]: All log files can be found below /home/yj/.ros/log/2025-11-20-17-41-00-462984-yj-12215
    [INFO] [launch]: Default logging verbosity is set to INFO
    [INFO] [client_node-1]: process started with pid [12219]
    [client_node-1] check_vrpn_cookie(): VRPN Note: minor version number doesn't match: (prefer 'vrpn: ver. 07.35', got 'vrpn: ver. 07.34  0').  This is not normally a problem.
    [client_node-1] [INFO] [1763631661.616613463] [vrpn_mocap.vrpn_mocap_client_node]: Created new tracker Drone3
    [client_node-1] [INFO] [1763631661.616795552] [vrpn_mocap.vrpn_mocap_client_node]: Created new tracker cir1
    [client_node-1] [INFO] [1763631661.616842483] [vrpn_mocap.vrpn_mocap_client_node]: Created new tracker cir2

    成功


    Customized Launch

    Check out the default parameter file and launch file. You can then write your own launch file with custom configurations.
    Parameters

    server (string) – server name, either ip address or domain name (default: "localhost")

    port (int) – VRPN server port (default: 3883)

    frame_id (string) – frame name of the fixed world frame (default: "world")

    update_freq (double) – frequency of the motion capture data publisher (default: 100.)

    refresh_freq (double) – frequency of dynamic adding new tracked objects (default: 1.)

    sensor_data_qos – use best effort QoS for VRPN data stream, set to false to use system default QoS which is reliable (default: true)

    multi_sensor (bool) – set to true if there are more than one sensor (frame) reporting on the same object (default: false)

    use_vrpn_timestamps (bool) – use timestamps coming from VRPN. This ensures that the interval between frames timestamps is not modified (default: false)


    根据参数内容
    自定义 vrpn
    位于cd /opt/ros/share/vrpn_mocap/launch/
    和 /opt/ros/share/vrpn_mocap/config
    launch:

    - arg:
        name: "server"
        default: "10.1.1.198"
    - arg:
        name: "port"
        default: "3883"

    - node:
        pkg: "vrpn_mocap"
        namespace: "vrpn_mocap"
        exec: "client_node"
        name: "vrpn_mocap_client_node"
        param:
        -
        from: "$(find-pkg-share vrpn_mocap)/config/client.yaml"
        -
        name: "server"
        value: "$(var server)"
        -
        name: "port"
        value: "$(var port)"

接收vrpn数据
    ros2 topic list
    ...

    
























https://docs.ros.org/en/ros2_packages/jazzy/api/vrpn_mocap/