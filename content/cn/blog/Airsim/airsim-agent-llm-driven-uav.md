---
title: "AirSim Agent 大模型驱动无人机"
date: 2025-08-08
summary: "AirSim 仿真环境搭建 → API 封装设计 → 大模型集成 → 知识库构建 → 智能体开发 → 语音控制，完整的无人机智能控制系统开发实战。涵盖环境配置、Python SDK、OpenAI 调用、提示工程、多模态感知等核心技术栈。"
tags: ["AirSim", "无人机", "大模型", "仿真", "Python"]
categories: ["学习笔记"]
weight: 10
---
[**AirSim Agent**](https://github.com/maris205/airsim_agent)来源于微软开源项目[**PromptCraft-Robotics**](https://github.com/microsoft/PromptCraft-Robotics) ，提供了由大模型驱动机器人的解决方案。

## 1. AirSim 安装、编译和使用尝试

### 1.1 开发环境与编译平台建议

- 硬件/系统

  - 建议 ≥16GB 内存；Windows 11 优先。Mac/Linux 需自行编译 AirSim。

- Python 与工具

  - 使用 conda 与 JupyterLab，IDE 推荐 PyCharm

  - 创建/启用环境与安装：

```bash
conda create -n airsim_agent python=3.10
conda activate airsim_agent
pip install jupyterlab
```

  - 克隆本仓库后，用 PyCharm 打开项目根目录。

- 大模型 API

  - 任选兼容 OpenAI SDK 的平台（如火山方舟、阿里云、腾讯云等）。

- 依赖冲突提示

  - AirSim 的 tornado 与 JupyterLab 可能冲突，不建议 `pip install airsim`。

  - 采用本地包引入：

```python
import sys
sys.path.append('../external-libraries')  # 或绝对路径
import airsim
```

- 编译与平台建议

  - Windows：优先使用现成可执行场景（无需源码编译），上手最快。
  - Linux/macOS：按官方文档编译 AirSim 与 UE 插件，或参考 UE5 社区分支（如 Cosys-AirSim、Colosseum）以适配新平台。

  - 文档参考：`https://github.com/Microsoft/AirSim/blob/main/docs/`
  
### 1.2 AirSim 仿真场景搭建

- 简介：基于 Unreal Engine，支持无人机/车辆与多传感器，适配 HIL/SIL；适合数据生成与高风险场景复现。

- 现状：官方仓库已归档但可用；可参考 UE5 社区分支（Cosys-AirSim、Colosseum）。

- 推荐场景：论文《ChatGPT for Robotics: Design Principles and Model Abilities》配套环境

  - 下载：`https://github.com/microsoft/PromptCraft-Robotics/releases/tag/1.0.0`

  - 解压后直接运行，适合快速上手。

- 参考链接

  - Releases：`https://github.com/microsoft/airsim/releases`

  - 文档：`https://microsoft.github.io/AirSim/`
  
### 1.3 无人机基本控制

- 连接与初始化

```python
import sys
sys.path.append'../external-libraries')
import airsim

client = airsim.MultirotorClient()  # ip 不写是本地
client.confirmConnection()
client.enableApiControl(True)
client.armDisarm(True)
```

- 起降与轨迹

```python
client.takeoffAsync().join()
client.moveToZAsync(-3, 1).join()                      # NED 坐标，Z 负向为上
client.moveToPositionAsync(5, 0, -3, 1).join()         # 航点飞行
client.moveOnPathAsync([airsim.Vector3r(5,0,-3), ...], 1).join()
client.landAsync().join()
client.armDisarm(False)
client.enableApiControl(False)
```

- 状态获取对比

  - `simGetVehiclePose()`：传感器级位姿，可能含噪声；拟真。

  - `simGetGroundTruthKinematics()`：物理引擎真值（含速度/加速度）；用于控制/验证。
- 注意事项

  - 异步 API 多为 `...Async()`，需 `.join()` 串联确保动作顺序。

  - 坐标系为 NED：`moveToZAsync(-3, ...)` 表示上升到 3 米（Z 取负）。
  
### 1.4 视觉感知与图像采集

- 相机与类型

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  - 位置：`front_center`/`front_right`/`front_left`/`bottom_center`/`back_center`（兼容旧 ID "0"~"4").
=======
  - 位置：`front_center`/`front_right`/`front_left`/`bottom_center`/`back_center`（兼容旧 ID `"0"~"4"`)。
>>>>>>> Stashed changes
=======
  - 位置：`front_center`/`front_right`/`front_left`/`bottom_center`/`back_center`（兼容旧 ID `"0"~"4"`)。
>>>>>>> Stashed changes
=======
  - 位置：`front_center`/`front_right`/`front_left`/`bottom_center`/`back_center`（兼容旧 ID `"0"~"4"`)。
>>>>>>> Stashed changes
=======
  - 位置：`front_center`/`front_right`/`front_left`/`bottom_center`/`back_center`（兼容旧 ID `"0"~"4"`)。
>>>>>>> Stashed changes

  - 类型：`Scene`、`DepthPlanar`、`DepthPerspective`、`DepthVis`、`Segmentation`、`SurfaceNormals`、`Infrared` 等。

- 采集示例（OpenCV + Matplotlib）

```python
import cv2, time, numpy as np, matplotlib.pyplot as plt
from airsim import ImageType

client = airsim.MultirotorClient(); client.confirmConnection()
client.enableApiControl(True); client.armDisarm(True)
client.takeoffAsync().join()

camera_name = '0'                  # 或 'front_center'
image_type = ImageType.Scene
resp = client.simGetImage(camera_name, image_type)
if resp:
      img_bgr = cv2.imdecode(np.frombuffer(resp, np.uint8), cv2.IMREAD_UNCHANGED)
      img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
      plt.imshow(img_rgb); plt.axis('off'); plt.show()

client.landAsync().join()
client.armDisarm(False); client.enableApiControl(False)
```

- 注意事项

  - 并发：多线程/多进程均可，但每个线程/进程需独立创建 `MultirotorClient`，不可共享。
  
  - 显示：Notebook 用 Matplotlib；桌面窗口显示可用 `a_cv2_imshow_thread`。
  
### 1.5 多无人机控制

- 多机配置

  - 将 `1-airsim_basic/settings.json` 复制为：

    - Windows：`C:\Users\<用户名>\Documents\AirSim\settings.json`

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    - 重启模拟器生效。
=======
  - 重启模拟器生效。
>>>>>>> Stashed changes
=======
  - 重启模拟器生效。
>>>>>>> Stashed changes
=======
  - 重启模拟器生效。
>>>>>>> Stashed changes
=======
  - 重启模拟器生效。
>>>>>>> Stashed changes

- 控制要点

  - 在 API 调用中通过 `vehicle_name="UAV1"`（或 `"UAV2"`, `"UAV3"`）区分不同无人机。
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

  - 示例（并发起飞/定高）：

```python
client = airsim.MultirotorClient()
for i in range(3):
    name = f"UAV{i+1}"
    client.enableApiControl(True, name)
    client.armDisarm(True, name)
    client.takeoffAsync(vehicle_name=name)

for i in range(3):
    name = f"UAV{i+1}"
    client.moveToZAsync(-3, 1, vehicle_name=name)
```

- 注意事项

  - 名称需与 `settings.json` 保持一致；多机并发建议为每机建立独立控制流程。
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
 
### 1.6 快速上手流程

1) conda 创建 `airsim_agent`（Python 3.10），安装 `jupyterlab`。  

2) 克隆[Airsim Agent](https://github.com/maris205/airsim_agent)仓库，打开项目根目录。  

3) 下载 PromptCraft-Robotics 场景并解压运行：`https://github.com/microsoft/PromptCraft-Robotics/releases/tag/1.0.0`  

4) 在 `1-airsim_basic/3-airsim_basic.ipynb` 执行连接/起飞/轨迹/降落。  

5) 在 `1-airsim_basic/4-airsim_camera.ipynb` 采集与显示图像。  

6) 复制 `1-airsim_basic/settings.json` 至用户目录，按需多机控制。
- 

## 2. 指令封装和OpenAI SDK调用

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
...（内容同原文，略） ...
=======
...（内容同原文，略） ...
>>>>>>> Stashed changes
=======
...（内容同原文，略） ...
>>>>>>> Stashed changes
=======
...（内容同原文，略） ...
>>>>>>> Stashed changes
=======
...（内容同原文，略） ...
>>>>>>> Stashed changes
