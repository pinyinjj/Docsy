什么是cosys airsim ： 一个持续更新的airsim分支，支持ubuntu 24. 04,老版本airsim只支持到22.04,支持UE 5.5 老版本只支持ue 4.27
为什么cosys airsim，因为根据官方reamde：Cosys-Lab Modifications
    Updated for Unreal 5.
    Added multi-layer annotation for groundtruth label generation with RGB, greyscale and texture options. Extensive API integration and available for camera and GPU-LiDAR sensors.
    Added Instance Segmentation.
    Added Echo sensor type for simulation of sensors like sonar and radar.
    Added GPU LIDAR sensor type: Uses GPU acceleration to simulate a LiDAR sensor. Can support much higher point density then normal LiDAR and behaves more authentic and has realistic intensity generation.
    Added skid steering SimMode and vehicle type. ClearPath Husky and Pioneer P3DX implemented as vehicle types using this new vehicle model.
    Added Matlab API Client implementation as an easy to install Matlab toolbox.
    Added various random but deterministic dynamic object types and world configuration options.
    Added Artificial Lights.
    Added BoxCar vehicle model to the Car SimMode to have a smaller vehicle to use in indoor spaces.
    Added a new image type called Lighting which only shows the light information and no materials.
    Updated ComputerVision mode: Now has full API and Simulation just like other vehicle types. It mostly means it can now have sensors attached (outside of IMU). Improved handling and camera operation.
    Updated LIDAR sensor type: Fixed not tracing correctly, added ground truth (point labels) generation, added range-noise generation. Improved API pointcloud delivery to be full scan instead of being frame-rate dependent and partial.
    Updated the camera, Echo and (GPU-)LiDAR sensors to be uncoupled from the vehicle and be placed as external world sensors.
    Updated sensors like cameras, Echo sensor and GPU-LiDAR to ignore certain objects with the MarkedIgnore Unreal tag and enabling the "IgnoreMarked" setting in the settings file.
    Updated cameras sensor with more distortion features such as chromatic aberration, motion blur and lens distortion.
    Updated Python ROS implementation with completely new implementation and feature set.
    Updated C++ ROS2 implementation to support custom Cosys-AirSim features.
    Dropped support for Unity Environments.
    做出了很多现代化的更新和适配。
本文档基于cosys airsim 3.3版本