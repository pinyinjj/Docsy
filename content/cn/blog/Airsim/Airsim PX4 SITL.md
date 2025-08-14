---
title: "Tailscale下轻量化Airsim PX4 SITL实践"
date: 2025-08-08
summary: ""
tags: []
categories: ["学习笔记"]
weight: 10
draft: true
---

1.原理和为什么要进行PX4 SITL 
2.网络拓扑图
3.实现细节
3.1 Airsim Settings
3.2 WSL上的PX4
3.3 多终端Tailscale组网，tailscale避开端口WSL的端口转发，直接IP访问
3.4 QGC远程控制
4. 总结

参考https://www.cnblogs.com/Biiigwang/p/17753556.html