---
title: "在 Linux 上使用 Epic Asset Manager 管理 UE 资源库"
date: 2025-01-27
summary: "介绍如何在 Linux 系统上安装和使用 Epic Asset Manager 来管理 Unreal Engine 资产和项目。"
tags: ["Ubuntu", "实用工具", "仿真", "Linux"]
categories: ["技术文档"]
weight: 10
draft: false
---

## 1. 安装 Flatpak 和 Flathub

如果系统尚未安装 Flathub，需要先进行安装：

### 1.1 安装 Flatpak

```bash
sudo apt install flatpak
sudo apt install gnome-software-plugin-flatpak
```

### 1.2 添加 Flathub 仓库

```bash
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

安装完成后，需要重启系统以使配置生效。

## 2. 安装 Epic Asset Manager

访问 [Flathub 上的 Epic Asset Manager 页面](https://flathub.org/en/apps/io.github.achetagames.epic_asset_manager) 进行安装，或使用命令行安装。

安装完成后，可以通过以下命令启动：

```bash
flatpak run io.github.achetagames.epic_asset_manager
```

![Epic Asset Manager 主界面](/Docsy/images/eam.png)

## 3. 登录和授权

### 3.1 浏览器授权

启动应用后，按照提示点击 `Open In Browser` 按钮。

![登录界面](/Docsy/images/eam-login.png)

### 3.2 复制授权码

在浏览器中完成 Epic Games 账号登录后，会显示授权码。

![Epic Games 授权页面](/Docsy/images/eam-epic-auth.png)

复制授权码字段，粘贴到应用中的授权框内完成授权。

## 4. 浏览和下载资产

授权成功后，可以在资产库中浏览 Unreal Engine 的资产。

![资产库界面](/Docsy/images/eam-assets-lib.png)

选择需要的资产后，可以下载到本地。

![下载资产界面](/Docsy/images/eam-download-asset.png)

## 5. 创建和管理项目

### 5.1 创建项目

点击 `创建项目` 按钮，可以根据当前场景创建新项目。

![创建项目界面](/Docsy/images/eam-project-create.png)

### 5.2 项目操作选项

在项目界面中，可以看到以下操作选项：
- 下载资产
- 添加到现有项目
- 创建新项目

在顶部可以看到下载进度。

## 6. 启动项目

在顶部的 `Project` 分页中，选择已下载的场景，在右侧选择合适的 Unreal Engine 版本，点击 `Launch` 按钮启动项目。

![启动项目界面](/Docsy/images/eam-launch-project.png)

---

## 参考文档

- [Epic Asset Manager GitHub 仓库](https://github.com/AchetaGames/Epic-Asset-Manager)
- [Flathub 设置指南](https://flathub.org/en/setup/Ubuntu)
- [Epic Asset Manager Flathub 页面](https://flathub.org/en/apps/io.github.achetagames.epic_asset_manager)
