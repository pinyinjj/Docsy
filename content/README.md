# 文档生成提示与标签管理规范

以下规范用于指导大模型生成 Markdown 文档的 Front Matter 与标签（tags）选择。


## 标签列表
- AirSim
- CMake
- MAVLink
- MAVSDK-Python
- Linux
- Ubuntu
- Android
- QGroundControl
- NiceGUI
- JavaScript
- Leaflet
- 无人机
- 地面站
- Python
- 前端
- 任务规划
- 容器化
- 编译
- Docker
- C++
- Qt
- 技术文档
- pymavlink
- Paradox Mods
- 大模型
- 仿真
- PX4
- WSL2
- Windows
- RPC
- SITL
- 后端
- QGC


## 标签来源
- 仅从本 README 顶部的“标签列表”中选择 tags（本列表为唯一来源）
- 若文档内容需要列表外的新标签：
  1) 先征得站点维护者的同意；
  2) 同意后，将新标签添加到本 README 的标签列表；
  3) 再将该新标签加入到对应文档的 Front Matter 中

## 生成规则
- Front Matter 的 `tags` 必须来自本 README 的标签列表
- 根据文章内容选择尽量准确、语义明确的标签
- 通用类标签（例如：`无人机`、`地面站`、`技术文档`、`前端`）在匹配时应优先考虑
- 不可擅自创造新标签或使用不在列表中的标签

## 建议工作流
1. 通读本 README 顶部的标签列表
2. 结合文章主题，从中挑选尽可能多的标签覆盖文件内容，并在征得同意前详细描述为什么要使用该标签
3. 若确需新标签：先征求同意 → 添加到本 README 标签列表 → 再使用

## Front Matter 模板示例
```yaml
---
title: "示例标题"
date: 2025-09-30
summary: "一句话或一段话概述本文的核心内容。"
tags: ["MAVLink", "QGroundControl", "无人机", "技术文档"]
categories: ["技术文档"]
weight: 10
---
```
# 大小写校验规则
- 使用标准的写法确保引入的技术框架名称正确，下列是正确的名称,如果文档中包含不符合如下大小写规范的字符串，需要提醒用户，确认是否进行修改或增加标准名称到下方列表中。
- MAVSDK-Python
- AirSim
- MAVLink


## 审核要点（给维护者）
- 新增标签是否必要且通用？是否可以用现有标签替代？
- 标签命名是否规范、简洁、大小写正确（如：`MAVSDK-Python`、`MAVLink`）？
- 同类文档之间的标签是否保持一致性？

