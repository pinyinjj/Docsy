sudo apt update
sudo apt install mavlink-router


为什么ubuntu focal 返回
yj@yj:~/Desktop$ sudo apt install mavlink-router
Reading package lists... Done
Building dependency tree       
Reading state information... Done
E: Unable to locate package mavlink-router

# 或者从源码编译
sudo apt install git

git clone https://github.com/mavlink-router/mavlink-router.git
cd mavlink-router
git submodule update --init --recursive
sudo apt install git meson ninja-build pkg-config gcc g++ systemd

查看meson版本
meson --version
如果低于0.55,则
pip3 install meson==0.55

meson setup build . && ninja -C build

sudo ninja -C build install

验证安装

命令行使用方法：
CLI Parameters
Please see the output of mavlink-routerd --help for the full list of command line options. The most important facts are:

The TCP server is enabled by default
TCP and UDP endpoints can be added multiple times
UDP endpoints added with the -e option are started in normal mode (sending data to the specified address and port)
The last parameter (without a key) can either be one UART device or an UDP connection. This UDP endpoint will be started in server mode (waiting for an incoming connection)!
To route mavlink packets from UART ttyS1 to 2 other UDP endpoints, use the following command:

$ mavlink-routerd -e 192.168.7.1:14550 -e 127.0.0.1:14550 /dev/ttyS1:1500000
The 1500000 after the colon in /dev/ttyS1:1500000 sets the UART baudrate. See more options with mavlink-routerd --help.

It's also possible to route mavlinks packets from an incoming UDP connection instead of UART:

$ mavlink-routerd -e 192.168.7.1:14550 -e 127.0.0.1:14550  0.0.0.0:24550
Additionally, mavlink-router also listens on port 5760 for TCP connections by default. Any client connecting to that port will be able to send and receive MAVLink data.

IPv6 addresses must be enclosed in square brackets like this: [::1]. The port number can be specified in the same way, as with IPv4 then: [::1]:14550. Both unicast and multicast addresses should be handled properly and the interface for a link-local address is auto-detected.

Detailed Description of Capabilities
To understand how MAVLink Router forwards messages between endpoints, it important to know, that a MAVLink message has to have a sender address, but only some messages have a target address (e.g. parameter requests). The sender and target address consist of a system and component ID each, so one UAV can have a flight controller as well as other services running on a companion computer with individual component IDs, but sharing the same system ID. In the target address, a component ID of 0 is used to broadcast to all components on a system, a sysID of 0 broadcasts to all systems.

Endpoints
MAVLink Router supports three basic types of endpoints: UART, UDP link and TCP client. Additionally, it'll act as a TCP server for dynamic clients (if not explicitly deactivated).

Endpoint types (see examples/config.sample for the config file format):

UART: For telemetry radios or other serial links
Configuration: UART device path/name and baudrate
Behavior: Data is received and sent without waiting for incoming data first
UDP:
Configuration: Mode (client or server), IP address and port
Behavior in client mode: Endpoint is configured with a target IP and port combination. So MAVLink messages can be sent directly after startup, but will only be recevied after the first message was received by the remote side, it doesn't know our IP and port otherwise.
When using any non-unicast IP address, e.g. an IPv4 broadcast or IPv6 local network multicast (ff02::1), messages will be "broadcasted" until somebody sends data back. From then on, UDP packets will only be sent to the specific unicast IP of the answering device. When no MAVlink messages were received for 5 seconds, the endpoint switches back to "broadcast" mode (using the configured non-unicast IP address).
Behavior in server mode: Endpoint is configured with a listening port and IP address. This is essentially the opposite of client mode. Messages can be received directly after startup, but we can only send messages out after the first received message, because we don't know the remote IP and port otherwise.
MAVLink messages are always sent to the IP and port from which the last incoming message was received.
TCP Client:
Configuration: Target IP address and port, reconnection interval in case of disconnection
Behavior: Data is received and sent right after the TCP session is established
Defining endpoints:

Endpoints are created by one of these methods:
An endpoint is defined in the configuration file
An endpoint is defined by the corresponding command line option
A TCP client has connected to the TCP server port
Endpoint are destoyed, when
A TCP client disconnects from the TCP server port
MAVLink Router is terminated
(This means that UART, UDP and TCP client endpoints are never destroyed during runtime.)
Message Routing
In general, each message received on one endpoint is delivered to all endpoints in which that target system/component has been seen. If it's a broadcast message, it's delivered to all endpoints. A message is never sent back to the same endpoint it came from.
Details on broadcast rules can be found in the official MAVLink documentation.

Routing rules:

Each endpoint remembers from which systems (system and component ID) it has received messages during it's whole lifetime. (See endpoints chapter for information when an endpoint is created and destroyed.)
A message received on one endpoint is offered to all endpoints but the one it was received on. An endpoint will:
Reject the message, if message's sender address is in the list of connected systems on this endpoint (to prevent message loops)
Reject the message based on the outgoing message filters (if enabled)
Accept the message, if it's targeted to any of the systems in the list of connected systems on this endpoint. Broadcast rules apply when checking if the targeted is reachable via this endpoint. Messages without target address count as broadcast.
If the list of connected systems is empty, only system-ID broadcast messages will be sent, but no component-ID broadcasts since the targeted system isn't known to be reachable via this endpoint.
Reject all other messages
Message filters:

There are two points where messages can be filtered on each endpoint:
In: Messages which are received (from the outside) on this endpoint are dropped or allowed based on the respecitive filter rules before they'll be routed to other endpoints
Out: Messages are dropped or allowed based on the endpoint's filter rules before being transmitted. So this is after internal routing (see "routing rules" chapter above).
A message filter can be based on one of these message identifiers:
MsgId: Filter message based on it's MAVLink message ID (message type like HEARTBEAT)
SrcSys: Filter message based on it's MAVLink source system ID
SrcComp: Filter message based on it's MAVLink source component ID
And a message filter can either be a block- or allow-list:
Block: Discard all messages matching the respective identifier (and allow all other ones)
Allow: Allow all messages matching the respective identifier (and discard all other ones)
Note that while using "Allow" and "Block" filters on the same identifier within an endpoint doesn't make sense, using them on different identifiers can be useful (for example, allowing only specific outgoing SysID, and blocking this system from sending some unwanted message IDs).
So a filter might be named AllowMsgIdOut to only allow messages with the listed message ID to be transmitted on that endpoint. See the example config examples/config.sample for the exact name of each filter parameter.
Message de-duplication:

If enabled, each incoming message is checked, whether another copy was already received the last DeduplicationPeriod milliseconds ago. If it's already known, the message will be dropped as it was never received and the timeout counter for that message will be reset. Messages are identified via their std::hash value of the full MAVLink message including it's header.
As long as no message with exactly the same header sequence number and content is received during the configured period, everything is fine. The most critical message is the heartbeat since it mostly contains static data. So a period shorter than the update period of the fastest static message is fine in any case (less than 1000 ms for 1 Hz heartbeats).
Endpoint groups:

Multiple endpoints can be configured to be in the same endpoin group. Endpoints in the same group will share the same list of connected systems.
When using two (or more) parallel data links, e.g. LTE and telemetry radio, the endpoint must be grouped on both sides. Otherwise one link will not be used any more because of routing rule 1.
Message Sniffing:

A Sniffer can be defined by setting SnifferSysID. This will forward all traffic to endpoints on which this MAVLink system ID is connected. This can be used to log or view all messages flowing though mavlink-router.

https://github.com/mavlink-router/mavlink-router