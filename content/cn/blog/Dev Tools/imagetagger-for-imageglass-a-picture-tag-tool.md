---
title: "ImageTagger for ImageGlass: 一款高效的图片标记工具"
date: 2026-03-09
summary: "ImageTagger 是一款基于 Windows Forms 的图像打标工具，旨在与 ImageGlass 深度集成，实现自定义标签管理和批量图像操作。"
tags: ["Windows", "实用工具", "C#"]
categories: ["技术文档"]
weight: 10
---

# ImageTagger

[![GitHub Release](https://img.shields.io/github/v/release/pinyinjj/ImageGlass_ImageTags?style=flat-square)](https://github.com/pinyinjj/ImageGlass_ImageTags/releases)
[![Build Status](https://github.com/pinyinjj/ImageGlass_ImageTags/actions/workflows/build.yml/badge.svg)](https://github.com/pinyinjj/ImageGlass_ImageTags/actions)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)
[![.NET](https://img.shields.io/badge/.NET-8.0-512bd4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/download/dotnet/8.0)

![Operation interface](/Docsy/images/imagetagger_ops.png)
![Tagging interface](/Docsy/images/imagetagger_tags.png)

## 1. 项目简介

**ImageTagger** 是一款基于 Windows Forms 的开源图像打标工具，专门为配合 [ImageGlass](https://imageglass.org/) 图片查看器使用而设计。

它允许用户在浏览图片的同时，通过简单的点击将图片分类到预定义的标签组中。借助于 ImageGlass Tools SDK，ImageTagger 实现了与查看器的实时路径同步和导航控制，极大地提升了海量图片的整理效率。

## 2. 核心特性

- **深度集成**：与 ImageGlass 实时同步，支持自动跳转下一张。
- **灵活打标**：一键添加、删除自定义标签，支持批量操作。
- **数据透明**：使用简单的 JSON 格式存储打标数据。
- **置顶显示**：默认窗口置顶，方便在全屏模式下无缝使用。
- **撤销支持**：支持对误操作进行撤销。

## 3. 安装指南

### 3.1 前提条件
1. Windows 操作系统。
2. 已安装 [.NET 8.0 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0)。
3. 已安装 [ImageGlass](https://imageglass.org/)。

### 3.2 安装步骤
1. 前往 `Releases` 下载最新压缩包。
2. 将压缩包解压到本地固定目录。
3. **集成到 ImageGlass**：
   - 打开 ImageGlass `Settings`（设置）菜单。
   - 导航至 `Tools`（工具）选项卡。
   - 点击 `Add...`（添加）按钮并选择解压后的 `ImageTagger.exe`。
   - 在名称栏输入 `ImageTagger` 即可。

## 4. 使用说明

### 4.1 启动与连接
![Launch Screenshot](/Docsy/images/imagetagger_launch.png)

在 ImageGlass 中，通过 `Settings` -> `Tools` -> `ImageTagger` 启动。插件启动后会自动监听当前显示的图片路径。

### 4.2 标签管理
* **创建标签**：在 `Tags` 选项卡中点击 `+` 按钮，输入标签名即可。
* **删除标签**：右键点击标签名称，选择 `Delete` 菜单项。
* **快捷打标**：切换到 `Tagging` 选项卡，每个标签都会对应一个按钮，点击即可将当前图片归类。

### 4.3 批量操作
当打标完成后，您可以在 `Tags` 选项卡中对特定标签下的所有文件执行批量操作：
* `Copy to...`：批量复制到目标文件夹。
* `Move to...`：批量移动到目标文件夹。

## 5. 配置说明

### 5.1 数据存储
所有标签和图片路径都存储在插件运行目录下的 `tags.json` 文件中。这是一个标准的 JSON 文件，可以手动备份或编辑（请确保格式正确）。

### 5.2 窗口行为
为了方便在全屏浏览图片时使用，插件默认保持 `Always on Top`（总在最前）。窗口高度会根据标签数量和日志条目自动调整。

## 6. 参与贡献

如果您在使用过程中遇到问题或有更好的建议，欢迎通过以下方式参与：
1. 在 `GitHub Issues` 提交反馈。
2. 提交 `Pull Request` 贡献代码。

## 7. 许可证

本项目采用 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0) 许可证。

---


## 参考文档

- [ImageGlass Tools | ImageGlass Docs](https://imageglass.org/docs/imageglass-tools)
- [GitHub - d2phap/ImageGlass: 🏞 A lightweight, versatile image viewer](https://github.com/d2phap/ImageGlass)
- [GitHub - d2phap/ExifGlass: 📷 EXIF metadata viewing tool](https://github.com/d2phap/ExifGlass)
