---
title: "理解 ROS 2 的 Services, Params 和 Actions"
date: 2025-01-30
summary: "根据 ROS 2 Jazzy，介绍服务（Services）、参数（Parameters）和动作（Actions）的概念与使用方法，包括服务调用、参数管理、动作执行等命令行工具的使用，帮助理解 ROS 2 中不同的通信机制和配置方式。"
tags: ["ROS", "ROS 2", "Linux", "Ubuntu", "仿真", "无人机"]
categories: ["学习笔记"]
weight: 21
draft: false
---

## 1. 理解 services

services 是 ROS 图中节点通信的另一种方法。services 基于调用和响应模型，而不是主题的pub-sub模型。虽然主题允许节点订阅数据流并获取持续更新，但 services 仅在 client 专门调用时才提供数据。

节点可以使用 ROS 2 中的 services 进行通信。与主题（一种单向通信模式，其中节点发布可供一个或多个订阅者使用的信息）不同，services 是一种请求/响应模式，其中 client 向提供 services node发出请求，services 处理该请求并生成响应。

![单 services client](/Docsy/images/Service-SingleServiceClient.gif)

![多 services clients](/Docsy/images/Service-MultipleServiceClient.gif)

### 1.1 查看 ROS 2 当前 services

通过 `ros2 service list` 返回系统中当前活动的所有 services 的列表。

在两个终端内分别运行 subscriber 和 publisher node：

```bash
ros2 run demo_nodes_cpp talker
```

```bash
ros2 run demo_nodes_cpp listener
```

执行 `ros2 service list`，返回：

```bash
$ ros2 service list
/listener/describe_parameters
/listener/get_parameter_types
/listener/get_parameters
/listener/get_type_description
/listener/list_parameters
/listener/set_parameters
/listener/set_parameters_atomically
/rqt_gui_py_node_103317/describe_parameters
/rqt_gui_py_node_103317/get_parameter_types
/rqt_gui_py_node_103317/get_parameters
/rqt_gui_py_node_103317/get_type_description
/rqt_gui_py_node_103317/list_parameters
/rqt_gui_py_node_103317/set_parameters
/rqt_gui_py_node_103317/set_parameters_atomically
/talker/describe_parameters
/talker/get_parameter_types
/talker/get_parameters
/talker/get_type_description
/talker/list_parameters
/talker/set_parameters
/talker/set_parameters_atomically
```

可以观察到节点中有相同名称的多个服务，ROS 2 的大部分节点都有这些基础设施服务。

### 1.2 查看 ROS 2 services 类型

服务具有描述服务的请求和响应数据的结构的类型。服务类型的定义与主题类型类似，不同之处在于服务类型有两部分：一个用于请求的消息，另一个用于响应。

查看 talker 的 services 类型：

```bash
ros2 service type /talker/set_parameters
```

返回：

```text
rcl_interfaces/srv/SetParameters
```

也可以通过在 services 列表中增加 `-t` 参数来直接显示所有当前 services 对应的类型：

```bash
ros2 service list -t
```

返回：

```text
/listener/describe_parameters [rcl_interfaces/srv/DescribeParameters]
/listener/get_parameter_types [rcl_interfaces/srv/GetParameterTypes]
/listener/get_parameters [rcl_interfaces/srv/GetParameters]
/listener/get_type_description [type_description_interfaces/srv/GetTypeDescription]
/listener/list_parameters [rcl_interfaces/srv/ListParameters]
/listener/set_parameters [rcl_interfaces/srv/SetParameters]
/listener/set_parameters_atomically [rcl_interfaces/srv/SetParametersAtomically]
/rqt_gui_py_node_103317/describe_parameters [rcl_interfaces/srv/DescribeParameters]
/rqt_gui_py_node_103317/get_parameter_types [rcl_interfaces/srv/GetParameterTypes]
/rqt_gui_py_node_103317/get_parameters [rcl_interfaces/srv/GetParameters]
/rqt_gui_py_node_103317/get_type_description [type_description_interfaces/srv/GetTypeDescription]
/rqt_gui_py_node_103317/list_parameters [rcl_interfaces/srv/ListParameters]
/rqt_gui_py_node_103317/set_parameters [rcl_interfaces/srv/SetParameters]
/rqt_gui_py_node_103317/set_parameters_atomically [rcl_interfaces/srv/SetParametersAtomically]
/talker/describe_parameters [rcl_interfaces/srv/DescribeParameters]
/talker/get_parameter_types [rcl_interfaces/srv/GetParameterTypes]
/talker/get_parameters [rcl_interfaces/srv/GetParameters]
/talker/get_type_description [type_description_interfaces/srv/GetTypeDescription]
/talker/list_parameters [rcl_interfaces/srv/ListParameters]
/talker/set_parameters [rcl_interfaces/srv/SetParameters]
/talker/set_parameters_atomically [rcl_interfaces/srv/SetParametersAtomically]
```

### 1.3 查看 ROS 2 services 信息

```bash
ros2 service info <service_name>
```

返回 services 类型以及 services clients 和服务器的计数。

```bash
ros2 service info /talker/set_parameters
```

返回：

```text
Type: rcl_interfaces/srv/SetParameters
Clients count: 0
Services count: 1
```

### 1.4 查询指定类型的 services

```bash
ros2 service find <type_name>
```

例如：

```bash
ros2 service find rcl_interfaces/srv/DescribeParameters
```

返回：

```text
/listener/describe_parameters
/rqt_gui_py_node_103317/describe_parameters
/talker/describe_parameters
```

### 1.5 查看 services 的接口/协议

与 topic 的接口查询一样，只是查询主体换成了**services 类型**。例如：

```bash
ros2 interface show rcl_interfaces/srv/DescribeParameters
```

返回：

```text
# A list of parameters of which to get the descriptor.
string[] names

---
# A list of the descriptors of all parameters requested in the same order
# as they were requested. This list has the same length as the list of
# parameters requested.
ParameterDescriptor[] descriptors
    string name
    uint8 type
    string description
    #
    string additional_constraints
    bool read_only false
    bool dynamic_typing false
    #
    FloatingPointRange[<=1] floating_point_range
        float64 from_value
        float64 to_value
        #
        #
        #
        #
        float64 step
    IntegerRange[<=1] integer_range
        int64 from_value
        int64 to_value
        #
        #
        #
        uint64 step
```

`---` 分隔符上面是请求结构，即调用 services 需要输入的参数，下面是响应结构，即 services 返回的数据结构。注意：同一个 services 类型使用相同的数据结构/协议。

### 1.6 ROS 2 services 调用

从上文已经得知了调用 services 所需的数据结构，现在可以通过以下命令来调用 services：

```bash
ros2 service call <service_name> <service_type> <arguments>
```

这里尝试调用没有参数的 services：

```bash
ros2 service call /talker/list_parameters rcl_interfaces/srv/ListParameters
```

返回：

```text
waiting for service to become available...
requester: making request: rcl_interfaces.srv.ListParameters_Request(prefixes=[], depth=0)

response:
rcl_interfaces.srv.ListParameters_Response(result=rcl_interfaces.msg.ListParametersResult(names=['qos_overrides./parameter_events.publisher.depth', 'qos_overrides./parameter_events.publisher.durability', 'qos_overrides./parameter_events.publisher.history', 'qos_overrides./parameter_events.publisher.reliability', 'start_type_description_service', 'use_sim_time'], prefixes=['qos_overrides./parameter_events.publisher']))
```

列出了当前节点拥有的参数。

### 1.7 ROS 2 services echo

查看 services clients 和 services 服务器之间的数据通信，使用命令 echo 对应的 services：

```bash
ros2 service echo <service_name | service_type> <arguments>
```

`echo service_name` 或者 `service_type` 都可以。

`ros2 service echo` 依赖于 services clients 和 services 服务器的 services 自省功能，该功能默认是禁用的。要启用它，用户必须在创建 services clients 或服务器后调用 `configure_introspection`。

启动 services 自省演示：

```bash
ros2 launch demo_nodes_cpp introspect_services_launch.py
```

然后打开一个新的终端，启用 services 自省：

```bash
ros2 param set /introspection_service service_configure_introspection contents
ros2 param set /introspection_client client_configure_introspection contents
```

在新终端内，继续执行：

```bash
ros2 service echo --flow-style /add_two_ints
```

可以看到 `introspection_client` 和 `introspection_service` 的通信情况，`REQUEST_SENT`，`REQUEST_RECEIVED`，`RESPONSE_SENT`，`RESPONSE_RECEIVED` 都被展示出来了：

```text
---
info:
  event_type: REQUEST_SENT
  stamp:
    sec: 1762498810
    nanosec: 268090535
  client_gid: [1, 15, 178, 36, 79, 84, 235, 99, 0, 0, 0, 0, 0, 0, 21, 3]
  sequence_number: 387
  request: [{a: 2, b: 3}]
  response: []
---
info:
  event_type: REQUEST_RECEIVED
  stamp:
    sec: 1762498810
    nanosec: 268466526
  client_gid: [1, 15, 178, 36, 79, 84, 235, 99, 0, 0, 0, 0, 0, 0, 20, 4]
  sequence_number: 387
  request: [{a: 2, b: 3}]
  response: []
---
info:
  event_type: RESPONSE_SENT
  stamp:
    sec: 1762498810
    nanosec: 268538042
  client_gid: [1, 15, 178, 36, 79, 84, 235, 99, 0, 0, 0, 0, 0, 0, 20, 4]
  sequence_number: 387
  request: []
  response: [{sum: 5}]
---
info:
  event_type: RESPONSE_RECEIVED
  stamp:
    sec: 1762498810
    nanosec: 268637789
  client_gid: [1, 15, 178, 36, 79, 84, 235, 99, 0, 0, 0, 0, 0, 0, 21, 3]
  sequence_number: 387
  request: []
  response: [{sum: 5}]
---
```

## 2. 理解参数

参数就是 node 的配置，node 将参数存储为不同的数据类型，ROS 2 每个 node 都维护自己的参数。

节点使用参数来定义其默认配置值。您可以从命令行获取和设置参数值。您还可以将参数设置保存到文件中，以便在将来的会话中重新加载它们。

### 2.1 查看 ROS 2 的参数列表

启动 subscriber 和 publisher node：

```bash
ros2 run demo_nodes_cpp talker
```

```bash
ros2 run demo_nodes_cpp listener
```

查看参数列表：

```bash
ros2 param list
```

返回示例：

```text
/introspection_client:
  client_configure_introspection
  qos_overrides./parameter_events.publisher.depth
  qos_overrides./parameter_events.publisher.durability
  qos_overrides./parameter_events.publisher.history
  qos_overrides./parameter_events.publisher.reliability
  start_type_description_service
  use_sim_time
/introspection_service:
  qos_overrides./parameter_events.publisher.depth
  qos_overrides./parameter_events.publisher.durability
  qos_overrides./parameter_events.publisher.history
  qos_overrides./parameter_events.publisher.reliability
  service_configure_introspection
  start_type_description_service
  use_sim_time
/listener:
  start_type_description_service
  use_sim_time
/talker:
  qos_overrides./parameter_events.publisher.depth
  qos_overrides./parameter_events.publisher.durability
  qos_overrides./parameter_events.publisher.history
  qos_overrides./parameter_events.publisher.reliability
  start_type_description_service
  use_sim_time
```

可以看到节点的 namespace 和其参数，注意：每个 node 都有 `use_sim_time`。

### 2.2 查看参数类型

```bash
ros2 param get <node_name> <parameter_name>
```

返回类型和当前值。查看 `start_type_description_service` 的当前值和类型：

```bash
ros2 param get /listener start_type_description_service
```

返回：

```text
Boolean value is: True
```

### 2.3 修改参数

```bash
ros2 param set <node_name> <parameter_name> <value>
```

尝试修改 listener 为 false：

```bash
ros2 param set /listener start_type_description_service False
```

返回：

```text
Setting parameter failed: Trying to set a read-only parameter: start_type_description_service.
```

传参成功了，但是因为这个参数是只读的，所以无法修改。

### 2.4 导出 ROS 2 参数

```bash
ros2 param dump <node_name>
```

运行：

```bash
ros2 param dump /talker
```

返回：

```yaml
/talker:
  ros__parameters:
    qos_overrides:
      /parameter_events:
        publisher:
          depth: 1000
          durability: volatile
          history: keep_last
          reliability: reliable
    start_type_description_service: true
    use_sim_time: false
```

默认将在命令行打印，也可以通过以下命令指定输出文件到当前终端的工作目录：

```bash
ros2 param dump /talker > talker.yaml
```

### 2.5 加载 ROS 2 参数

使用命令加载参数文件到运行中的 node：

```bash
ros2 param load <node_name> <parameter_file>
```

例如：

```bash
ros2 param load /talker talker.yaml
```

返回：

```text
Set parameter qos_overrides./parameter_events.publisher.depth failed: parameter 'qos_overrides./parameter_events.publisher.depth' cannot be set because it is read-only
Set parameter qos_overrides./parameter_events.publisher.durability failed: parameter 'qos_overrides./parameter_events.publisher.durability' cannot be set because it is read-only
Set parameter qos_overrides./parameter_events.publisher.history failed: parameter 'qos_overrides./parameter_events.publisher.history' cannot be set because it is read-only
Set parameter qos_overrides./parameter_events.publisher.reliability failed: parameter 'qos_overrides./parameter_events.publisher.reliability' cannot be set because it is read-only
Set parameter start_type_description_service failed: parameter 'start_type_description_service' cannot be set because it is read-only
Set parameter use_sim_time successful
```

可以看到，所有的参数都被尝试设置了，仅 `use_sim_time` 这个非 read-only 的参数覆写成功了。只读参数只能在启动时修改，而不能在启动后修改，这就是为什么 "qos_overrides" 参数会出现一些警告。

### 2.6 node 启动时加载参数

```bash
ros2 run demo_nodes_cpp talker --ros-args --params-file talker.yaml
```

命令行不会有额外打印信息，但是 read-only 的参数此时会生效。

## 3. 理解 action

动作（Actions）是 ROS 2 中的通信类型之一，用于长时间运行的任务。它们由三个部分组成：目标（goal）、反馈（feedback）和结果（result）。

action 基于主题和 services 构建。它们的功能类似于 services，但 action 可以被取消。它们还提供稳定的反馈，这与返回单个响应的 services 不同。

![单 action client](/Docsy/images/Action-SingleActionClient.gif)

如图所示，action 使用 client-server 模型，与 pub sub 模型类似。action client node 将信息发送到 action server node，然后 server node 处理并返回结果。

仔细看图，client 先发一个 goal request 到 server，得到 server 的 response 后，client 发送 result request 到 server，此时 server 通过 feedback topic 与 client 保持连接，同步状态等，直到处理完成后，通过 result response 返回处理后的信息给 client。这个架构比仅用 topic 或者 services 都要复杂，但是强大、更加现代化，对复杂系统兼容性强，易于管理。

### 3.1 使用 action

打开两个终端，分别运行：

```bash
ros2 run turtlesim turtlesim_node
```

```bash
ros2 run turtlesim turtle_teleop_key
```

启动控制 node 后，看到提示信息：`Use g|b|v|c|d|e|r|t keys to rotate to absolute orientations. 'f' to cancel a rotation.`

其中 `g|b|v|c|d|e|r|t` 围绕键盘的 `f` 按键形成一个圆圈，按下对应方向的按键即命令乌龟转向对应的方向，比如按 `t`，是让乌龟朝向右上方。

按下 `t` 后，node 窗口会打印：

```text
[INFO] [1762503823.706663289] [turtlesim]: Rotation goal completed successfully
```

如果在转向的过程中按下另一个方向，会打印：

```text
[WARN] [1762503902.170788364] [turtlesim]: Rotation goal received before a previous goal finished. Aborting previous goal.
```

该 action 服务器选择中止第一个目标，因为它有了一个新目标。它可以选择其他目标，例如拒绝新目标或在第一个目标完成后执行第二个目标。

通过 `ros2 node info /turtlesim` 可以发现返回值中存在：

```text
Service Clients:

Action Servers:
    /turtle1/rotate_absolute: turtlesim/action/RotateAbsolute
Action Clients:
```

可以得知这是基于 action 实现的复杂功能，而不是每个使用了 action 的 node 就天然具备的功能。

### 3.2 查看 ROS 2 action 列表

```bash
ros2 action list
```

返回：

```text
/turtle1/rotate_absolute
```

和其他的 list 命令一样，可以通过 `-t` 来查看 action 的类型：

```bash
ros2 action list -t
```

返回：

```text
/turtle1/rotate_absolute [turtlesim/action/RotateAbsolute]
```

### 3.3 查看 ROS 2 action 类型

```bash
ros2 action type <action>
```

例如：

```bash
ros2 action type /turtle1/rotate_absolute
```

返回：

```text
turtlesim/action/RotateAbsolute
```

### 3.4 查看 ROS 2 action 信息

```bash
ros2 action info <action>
```

例如：

```bash
ros2 action info /turtle1/rotate_absolute
```

返回：

```text
Action: /turtle1/rotate_absolute
Action clients: 1
    /teleop_turtle
Action servers: 1
    /turtlesim
```

可以看到 action clients 和 servers 都直接打印出来了。

### 3.5 查看 ROS 2 action 的接口

```bash
ros2 interface show <action_type>
```

例如：

```bash
ros2 interface show turtlesim/action/RotateAbsolute
```

返回：

```text
# The desired heading in radians
float32 theta
---
# The angular displacement in radians to the starting position
float32 delta
---
# The remaining rotation in radians
float32 remaining
```

第一部分（第一个 `---` 上方）是 goal 的结构，第二部分（第一个 `---` 和第二个 `---` 之间）是 result 的结构，最后一部分（第二个 `---` 下方）是 feedback 的结构，如[上图](#31-使用-action)所示。

### 3.6 ROS 2 action 发送 goal

```bash
ros2 action send_goal <action_name> <action_type> <values>
```

`<values>` 需要是 YAML 格式。在终端输入：

```bash
ros2 action send_goal /turtle1/rotate_absolute turtlesim/action/RotateAbsolute "{theta: -1.57}" --feedback
```

可以看到海龟开始旋转。返回：

```text
Waiting for an action server to become available...
Sending goal:
   theta: -1.57

Goal accepted with ID: e6092c831f994afda92f0086f220da27

Feedback:
  remaining: -3.1268222332000732

Feedback:
  remaining: -3.1108222007751465

...

Result:
  delta: 3.1200008392333984

Goal finished with status: SUCCEEDED
```

Feedback 展示的是剩余的弧度，直到完成。action client 通过 send goal 到 action server 来实现对海龟的旋转。

## 4. 总结

本文介绍了 ROS 2 中三种重要的通信和配置机制：

1. **服务（Services）**：基于请求/响应模型的通信方式，适用于需要即时响应的操作。服务允许客户端向服务器发送请求并接收响应，与主题的单向通信不同，服务提供了双向通信能力。

2. **参数（Parameters）**：节点的配置值，用于定义节点的默认行为。参数可以在运行时查询和修改（非只读参数），也可以保存到文件中以便在将来的会话中重新加载。只读参数只能在节点启动时设置。

3. **动作（Actions）**：用于长时间运行任务的通信机制，由目标、反馈和结果三部分组成。动作基于主题和服务构建，提供了可取消的任务执行和定期反馈功能，非常适合需要长时间运行且需要进度更新的任务，如机器人导航。

机器人系统可能会使用 action 进行导航。action 目标可以告诉机器人前往某个位置。当机器人导航到该位置时，它可以沿途发送更新（即反馈），然后在到达目的地后发送最终结果消息。

通过理解这三种机制，可以更好地设计和实现 ROS 2 机器人系统，选择合适的通信方式来处理不同的任务需求。

---

## 参考文档

- [Understanding ROS 2 services](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Services/Understanding-ROS2-Services.html)
- [Understanding ROS 2 parameters](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Parameters/Understanding-ROS2-Parameters.html)
- [Understanding ROS 2 action](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Actions/Understanding-ROS2-Actions.html)
