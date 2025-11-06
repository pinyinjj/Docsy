理解node
    node是ros2实现模块化的基本组件。
    引用gif Nodes-TopicandService.gif 表示两个ros2的节点是如何交互的。ROS 中的每个节点都应负责单一的模块化功能，例如控制车轮电机或发布来自激光测距仪的传感器数据。每个节点都可以通过主题、服务、动作或参数与其他节点发送和接收数据。
    一个完整的机器人系统由许多协同工作的节点组成。在 ROS 2 中，一个可执行文件（C++ 程序、Python 程序等）可以包含一个或多个节点。

    ros2 启动命令 
    ros2 run <package_name> <executable_name>举例 ros2 run demo_nodes_cpp talker 此时demo_nodes_cpp就是包名字，talker就是executable_name
    节点名称可以使用以下命令查找节点名称ros2 node list 
    引用图片ros2-node-list.png
    可以看到/talker 已经显示出来了

    node名称的remapping
    通过ros2 run turtlesim turtlesim_node --ros-args --remap __node:=my_turtle
    上述命令--remap __node:=my_turtle 将node名称定义为my_turtle，通过ros2 node list应该也可以看到这个新建的实例/my_turtle

    ros2 节点信息
    ros2 node info <node_name> 举例 ros2 node info /talker 注意要加斜杠
    引入图片ros2-node-info.png

理解topic
    在上个章节的图片中，我们已经可以看到，publisher node 通过 topic 将信息发送给 subscriber的过程，只要一个node sub了topic,就可以收到对应的消息
    ROS 2 将复杂的系统分解为许多模块化节点。主题是 ROS 图的重要元素，充当节点交换消息的总线。
    引用gif Topic-SinglePublisherandSingleSubscriber.gif

    一个节点可以将数据发布到任意数量的主题，并同时订阅任意数量的主题。
    引用 Topic-MultiplePublisherandMultipleSubscriber.gif
    主题是在节点之间以及系统不同部分之间移动数据的主要方式之一。

    通过rqt_gragh检查当前ros2系统的通信状态
    打开ros2 run demo_nodes_cpp talker
    打开ros2 run demo_nodes_cpp listener
    使用ros2 run rqt_graph rqt_graph 命令，可以看到talker和listener通过/chatter这个话题建立通信
    节点正在向主题发布数据（您输入的击键以移动），并且该节点订阅了该主题以接收数据
    rqt_graph 的突出显示功能在检查具有许多节点和主题以多种不同方式连接的更复杂的系统时非常有用
    引用rqt_gragh.png

    ros2 topic list ，topic信息查询
    在新终端中运行ros2 topic list命令将返回系统中当前活动的所有主题的列表
    ros2 topic list -t 可以在括号中附加了主题类型，
    例子$ ros2 topic list -t 
    /chatter [std_msgs/msg/String]
    /parameter_events [rcl_interfaces/msg/ParameterEvent]
    /rosout [rcl_interfaces/msg/Log]
    可以通过取消勾选hide,来显示所有当前topic在rqt_graph的状态
    引用rqt_gragh_unhide.png

    主题不必只是一对一的交流;它们可以是一对多、多对一或多对多
    通过$ ros2 topic info /chatter 命令来查看当前订阅数量，返回
    Type: std_msgs/msg/String
    Publisher count: 1
    Subscription count: 1

    通过ros2 topic echo 查看正在发布的主题数据
    ros2 topic echo <topic_name>
    使用ros2 topic echo /chatter 主题增加斜杠
    引入图片ros2_topic_echo_chatter.png
    现在返回rqt_graph并取消选中“debug”框,可以见到新增的订阅/_ros2cli_100752，也就是刚才我们通过命令行命令echo创建的node
    ros2-rqt-graph-ubdebug.png

    ros2 interface show 接口/数据结构显示
    在前面运行过了ros2 topic list -t （增加一个链接往上导引到这个位置）后，得知了/chatter 的接口为[std_msgs/msg/String]
    运行ros2 interface show std_msgs/msg/String
    返回
    # This was originally provided as an example message.
    # It is deprecated as of Foxy
    # It is recommended to create your own semantically meaningful message.
    # However if you would like to continue using this please use the equivalent in example_msgs.

    string data
    可以得知为字符串数据结构,字段为data.

    ros2 topic pub 主题发布
    得知消息结构后，通过ros2 topic pub <topic_name> <msg_type> '<args>' 可以直接从终端发送命令数据到topic中。'<args>'是要传递给topic的实际数据，采用正确的数据结构。如上interface为string data时，data就是构建yaml字符串的key。
    如下几种方式都可以发布
    1.ros2 topic pub /chatter std_msgs/msg/String "{data: 'Hello from manual pub.'}"构建YAML 字符串构发布。可以看到sub node 同时收到了两个node的信息。
    引入图片maunal-pub-info.png 和 rqt-graph-manual-pub.png
    2.ros2 topic pub /chatter std_msgs/msg/String 发布空数据
    因为很少会使用到手动pub消息，其他两种自动构建数据结构并发布的方式暂时不考虑

    消息的时间戳
    When publishing messages with timestamps, pub has two methods to automatically fill them out with the current time. For messages with a std_msgs/msg/Header, the header field can be set to auto to fill out the stamp field.
    ros2 topic pub /chatter std_msgs/msg/String "{header: "auto", data: 'Hello from manual pub.'}"此时会报错，因为data类型没有header

    ros2 topic 发布频率查询
    ros2 topic hz <topic> 来得知对应topic的发布频率 ros2 topic hz /chatter
    在检测后会返回
    average rate: 1.000 
	min: 1.000s max: 1.000s std dev: 0.00021s window: 3

    ros2 topic 带宽查询
    ros2 topic bw <topic>
    $ ros2 topic bw /chatter
    Subscribed to [/chatter]
    49 B/s from 2 messages
	Message size mean: 28 B min: 28 B max: 28 B
    39 B/s from 3 messages
	Message size mean: 28 B min: 28 B max: 28 B
    返回带宽利用率和发布到主题的消息数量

    ros2 查询指定topic
    列出给定类型的可用主题列表ros2 topic find <topic_type>
    根据前文可以得知，topic_type为ros2 topic list -t 返回的括号中的内容std_msgs/msg/String
    执行$ ros2 topic find std_msgs/msg/String
    /chatter


节点通过主题发布信息，这允许任意数量的其他节点订阅和访问该信息。在本教程中，您使用 rqt_graph 和命令行工具检查了主题上多个节点之间的连接。您现在应该很好地了解数据如何在 ROS 2 系统中移动






参考文档
https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Topics/Understanding-ROS2-Topics.html