# ImageTagger

[![GitHub Release](https://img.shields.io/github/v/release/pinyinjj/ImageGlass_ImageTags?style=flat-square)](https://github.com/pinyinjj/ImageGlass_ImageTags/releases)
[![Build Status](https://github.com/pinyinjj/ImageGlass_ImageTags/actions/workflows/build.yml/badge.svg)](https://github.com/pinyinjj/ImageGlass_ImageTags/actions)
[![License](https://img.shields.io/github/license/pinyinjj/ImageGlass_ImageTags?style=flat-square)](../LICENSE)
[![.NET](https://img.shields.io/badge/.NET-8.0-512bd4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/download/dotnet/8.0)
[![GitHub Stars](https://img.shields.io/github/stars/pinyinjj/ImageGlass_ImageTags?style=flat-square)](https://github.com/pinyinjj/ImageGlass_ImageTags/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/pinyinjj/ImageGlass_ImageTags?style=flat-square)](https://github.com/pinyinjj/ImageGlass_ImageTags/network/members)

<img src="ops.png" width="400"> <img src="tags.png" width="400">

## 项目简介
ImageTagger 是一款基于 Windows Forms 的图像打标工具，旨在与 ImageGlass 图片查看器配合使用。它允许用户在浏览图片时快速将其分类到自定义的标签组中，并支持对已打标图片进行批量操作（如复制或移动）。该工具通过 ImageGlass Tools SDK 与 ImageGlass 深度集成，实现了实时图片路径同步和导航控制。

## 安装指南

### 前提条件
1. Windows 操作系统（支持 .NET）。
2. 已安装 [ImageGlass](https://imageglass.org/) 图片查看器。

### 安装步骤
1. 下载 ImageTagger 的最新发布版本压缩包。
2. 将压缩包解压到任意目录。
3. 在 ImageGlass 中将 ImageTagger 配置为外部工具，以便快速访问。

## 使用说明

### 启动应用程序
<img src="launch.png" width="300">

在 ImageGlass 中，打开 **Settings**（设置）菜单，导航至 **Tools**（工具） > **ImageTagger** 来启动插件。它会自动与当前查看的图片同步。

### 标签管理
* **添加标签**：在“Tags”选项卡中，点击右上角的“+”按钮，输入标签名称并确认。
* **删除标签**：从列表中选择一个标签并点击“-”按钮，或右键点击并选择“Delete”。
* **管理标签**：右键点击标签列表可以使用“Clear”（清除该标签下的所有图片路径）或“Duplicate”（复制该标签及其内容）。

### 图像打标
1. 确保 ImageGlass 正在运行并显示一张图片。
2. 在 ImageTagger 的“Tagging”选项卡中，如果同步成功，你将看到当前图片的路径。
3. 每个创建的标签都会显示为一个按钮。
4. 点击标签按钮即可将当前图片添加到该标签。
5. 打标后，ImageGlass 会自动跳转到下一张图片（此操作支持撤销）。

### 批量操作
在“Tags”选项卡中选择一个标签，即可使用底部的功能按钮：
* **Copy to...**：将所选标签下的所有图片复制到指定文件夹。
* **Move to...**：将所选标签下的所有图片移动到指定文件夹（移动成功后会清除该标签列表）。
* **Undo**：撤销上一次打标或导航操作。

## 配置说明

### 数据存储
所有标签和图片路径都存储在应用程序运行目录下的 `tags.json` 文件中。
* 这是一个标准的 JSON 文件，可以手动备份或编辑（请确保格式正确）。

### 窗口行为
* 为了方便在全屏浏览图片时使用，应用程序默认保持“总在最前”（Always on Top）。
* 窗口高度会根据标签数量和日志条目自动调整。

## API 参考
本应用程序主要使用 `ImageGlass.Tools` 库与 ImageGlass 进行通信。

## 贡献
欢迎提交 Issue 和 Pull Request 来改进本项目。

1. Fork 本仓库。
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 开启一个 Pull Request。

## 许可证
本项目采用 Apache License 2.0 许可证。详情请参阅 [LICENSE](../LICENSE) 文件。
