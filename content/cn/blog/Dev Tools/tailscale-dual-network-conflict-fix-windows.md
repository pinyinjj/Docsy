---
title: "修复多网卡 Windows 下 Tailscale 网络连接问题"
date: 2026-05-27
summary: "通过调整 Windows 多网卡环境下的 IPv4 接口优先级，解决 Tailscale 在双网络, 有线加无线或局域网副网卡场景中的连接异常问题。"
tags: ["Windows", "实用工具", "通信"]
categories: ["踩坑记录"]
weight: 10
draft: false
---

## 1. 问题现象

在 Windows 电脑同时连接多个网络时，Tailscale 可能会出现设备在线但访问不稳定的问题。常见场景包括：

- 电脑同时连接 Wi-Fi 和有线网口
- 一张网卡用于访问互联网，另一张网卡连接交换机, 调试设备或独立局域网
- Tailscale 控制台显示节点在线，但 `ping` 对端 Tailscale IP 超时
- 远程桌面, SSH, Web 服务或文件共享偶尔可用，随后又断开
- 重启 Tailscale 后短暂恢复，过一会儿再次异常

这类问题通常不是 Tailscale 账号或 ACL 配置错误，而是 Windows 在多网卡环境中选择了错误的默认路由。

## 2. 原因分析

### 2.1 Windows 接口跃点数

Windows 会为每张网络接口维护一个 `InterfaceMetric`。当系统需要访问外部网络时，通常会优先选择跃点数更低的网卡。

> `InterfaceMetric` 是 Windows 网络接口的优先级指标。数值越小，优先级越高；数值越大，优先级越低。在多网卡环境中，如果连接交换机或封闭局域网的副网卡优先级过高，系统可能把默认流量错误地交给它处理。

Tailscale 依赖系统路由和本地网络栈完成连接。如果 Windows 把默认出口选到了无法访问互联网的副网卡，Tailscale daemon 就可能出现初始化慢, 打洞失败或节点间连接不稳定。

### 2.2 自动跃点数的误判

Windows 默认启用自动跃点数。它会根据链路速度等因素自动推断网卡优先级，但这个推断不一定符合真实使用意图。

例如：

- 有线副网卡速率为 2.5GbE，Wi-Fi 是真实互联网出口
- 副网卡连接的是交换机或设备局域网，没有可用互联网网关
- 两张网卡都有默认网关，但只有其中一张能稳定访问外网

在这些情况下，Windows 可能认为有线副网卡更优先，导致 Tailscale 连接被错误路由影响。

## 3. 自动修复脚本

本文提供的脚本是 `tailscale-dual-network-fix.bat`，下载后以管理员权限运行即可：

- [下载 tailscale-dual-network-fix.bat](/Docsy/files/tailscale-dual-network-fix.bat)

脚本会完成以下操作：

1. 自动请求管理员权限
2. 枚举当前启用的 IPv4 网络接口
3. 让用户选择真正连接互联网的主网卡
4. 让用户选择用于交换机或局域网的副网卡
5. 将主网卡 `InterfaceMetric` 设置为 `10`
6. 将副网卡 `InterfaceMetric` 设置为 `50`
7. 清理 DNS 缓存
8. 重启 `Tailscale` 服务
9. 输出当前 `tailscale status` 状态

其中 `10` 表示主网卡优先级更高，`50` 表示副网卡仍可访问但不抢占默认出口。脚本只修改 IPv4 接口跃点数，清理 DNS 缓存，并重启 `Tailscale` 服务；不会删除 IP 地址, 网关, DNS 服务器或 Tailscale 配置。`Set-NetIPInterface` 写入的是系统网络接口配置，重启后仍会保留。

### 3.1 适用场景

该脚本适合以下 Windows 多网卡场景：

- Wi-Fi 上网，有线网口连接交换机
- 有线网口上网，第二张有线网卡连接设备
- 笔记本同时连接公司网络, 调试网络和 Tailscale
- Tailscale 在单网卡时正常，多网卡时异常

### 3.2 不适用场景

如果存在以下情况，建议先排查其他原因：

- Tailscale 账号未登录
- 设备未加入同一个 tailnet
- ACL 禁止了目标访问
- 目标服务本身没有监听对应端口
- Windows Defender 防火墙阻止了目标服务入站访问

## 4. 手动修复

如果不想使用脚本，也可以手动执行同样的配置。

### 4.1 查看网卡

以管理员身份打开 PowerShell，执行：

```bash
Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0"
Get-NetIPInterface -AddressFamily IPv4 | Sort-Object InterfaceMetric
```

重点确认互联网主网卡和副网卡的 `InterfaceIndex`。如果默认路由中出现多个网关，可以结合 `NextHop`, `RouteMetric` 和实际网络连接判断哪张网卡才是互联网出口。

### 4.2 设置优先级

将真正连接互联网的主网卡设置为高优先级，将副网卡设置为较低优先级：

```bash
Set-NetIPInterface -InterfaceIndex 12 -AddressFamily IPv4 -InterfaceMetric 10 -AutomaticMetric Disabled
Set-NetIPInterface -InterfaceIndex 18 -AddressFamily IPv4 -InterfaceMetric 50 -AutomaticMetric Disabled
```

其中 `12` 需要替换为主网卡 `InterfaceIndex`，`18` 需要替换为副网卡 `InterfaceIndex`。

如需恢复 Windows 自动管理跃点数，可以执行：

```bash
Set-NetIPInterface -InterfaceIndex 12 -AddressFamily IPv4 -AutomaticMetric Enabled
Set-NetIPInterface -InterfaceIndex 18 -AddressFamily IPv4 -AutomaticMetric Enabled
```

### 4.3 刷新验证

继续执行：

```bash
Clear-DnsClientCache
Restart-Service -Name "Tailscale" -Force
tailscale status
```

正常情况下，应该能看到 tailnet 内的设备列表，以及每台设备的 Tailscale IP。

使用目标设备的 Tailscale IP 测试：

```bash
ping 100.x.y.z
```

也可以直接测试目标服务，例如：

```bash
ssh user@100.x.y.z
```

或在浏览器中访问目标 Web 服务。

最后再次确认接口跃点数：

```bash
Get-NetIPInterface -AddressFamily IPv4 | Sort-Object InterfaceMetric
```

确认互联网主网卡的 `InterfaceMetric` 为 `10`，副网卡的 `InterfaceMetric` 为 `50`。
