---
title: "在 Linux 中使用 Ventoy 制作 Windows 启动盘"
date: 2025-12-05
summary: "使用 Ventoy 在 Linux 系统上制作 Windows 启动 U 盘，支持多系统启动，无需反复格式化，兼容 Legacy BIOS 和 UEFI 启动。"
tags: ["Linux", "Windows", "实用工具"]
categories: ["技术文档"]
weight: 10
draft: false
---

[Ventoy](https://www.ventoy.net/cn/index.html) 是一个开源的多系统启动 U 盘解决方案，支持直接从 ISO/WIM/VHD(x)/EFI 文件启动，无需反复格式化 U 盘。

## 1. 准备工作

### 1.1 获取 Windows ISO 镜像

三选一，建议使用非官方源（Microsoft 官网可能会有神秘报错）：

- **OS.click（推荐）**：https://os.click/en
- **UUP dump**：https://uupdump.net/
- **Microsoft 官网**：https://www.microsoft.com/software-download/windows11

下载完成后校验文件：

```bash
sha256sum windows11.iso
```

## 2. 安装 Ventoy

### 2.1 下载 Ventoy

访问 [Ventoy 官网](https://www.ventoy.net/cn/download.html) 下载 Linux 版本安装包，例如 `ventoy-1.0.00-linux.tar.gz`。

解压安装包：

```bash
tar -xzf ventoy-1.0.00-linux.tar.gz
cd ventoy-1.0.00
```

### 2.2 使用 WebUI 制作 Windows 启动盘

Ventoy 提供了 WebUI 图形化界面，推荐使用此方式安装，GUI 版本可能导致未响应。

1. **启动 WebUI 服务器**：

```bash
sudo ./VentoyWeb.sh
```

启动后会显示以下提示信息：

```text
===============================================================

  Ventoy Server 1.1.07 is running ...

  Please open your browser and visit http://127.0.0.1:24680

===============================================================

################## Press Ctrl + C to exit #####################
```

2. **打开浏览器访问**：

在浏览器中打开 `http://127.0.0.1:24680`。

3. **在 WebUI 中安装**：

WebUI 界面如下图所示：

![Ventoy WebUI 界面](/Docsy/images/ventoy_webui.png)

界面说明：

- **设备选择**：`Device` 下拉框选择目标 U 盘设备，右侧绿色刷新按钮可重新扫描设备
- **版本信息**：
  - **Ventoy In Package**：显示安装包中的 Ventoy 版本（如 1.1.07）和分区格式（MBR/GPT）
  - **Ventoy In Device**：显示设备中已安装的 Ventoy 版本，如果为空则表示未安装
- **Option 菜单**：
  - **Secure Boot Support**：启用安全启动支持，建议勾选以兼容支持 UEFI Secure Boot 的计算机，在一些品牌笔记本电脑安装中，如果不启用安全会导致无法安装系统
  - **Partition Style**：选择分区格式，可选择 `MBR`（Legacy BIOS）或 `GPT`（UEFI）
  - **Partition Configuration**：分区配置选项，可设置在U盘内的保留空间
  - **Clear Ventoy**：清除设备中的 Ventoy
  - **Show All Devices**：显示所有设备
- **状态显示**：`Status - READY` 表示准备就绪
- **操作按钮**：
  - `Install`：安装 Ventoy 到 U 盘
  - `Update`：升级设备中的 Ventoy 版本

在 WebUI 中执行以下操作：

- 选择目标 U 盘设备
- 选择分区格式（MBR 或 GPT）
- 选择文件系统类型（exFAT, NTFS, FAT32 等）
- 点击 `安装` 按钮

**注意：** 安装会格式化 U 盘，清除所有数据。普通 U 盘建议使用 exFAT 文件系统，大容量移动硬盘或 SSD 建议使用 NTFS 文件系统。

## 3. 拷贝镜像文件

安装完成后，U 盘会被分成两个分区：

- **第 1 个分区（镜像分区）**：容量较大，用于存放 ISO 文件
- **第 2 个分区（VTOYEFI 分区）**：32MB，存放 Ventoy 启动文件

将下载的 Windows ISO 镜像文件直接拷贝到第 1 个分区（大一点的分区）中即可。可以将文件放在任意目录及子目录下，Ventoy 会自动遍历所有目录，按字母顺序显示在启动菜单中。

**注意：** 安装完成后，镜像分区也可以手动重新格式化为其他支持的文件系统（exFAT/FAT32/NTFS/UDF/XFS/Ext2/3/4），不影响 Ventoy 功能。

## 4. 启动安装

### 4.1 设置启动顺序

1. 重启计算机，进入 BIOS/UEFI 设置
2. 将 U 盘设置为第一启动项
3. 保存并退出

### 4.2 选择镜像启动

从 U 盘启动后，Ventoy 会显示镜像文件列表，选择要安装的 Windows ISO 文件即可开始安装。

### 4.3 目标分区格式要求

**重要提示：** 如果目标安装位置（通常是系统盘）使用 GPT 分区表且格式为 NTFS，安装过程中可能会出现错误。建议在安装 Windows 前，将目标安装位置格式化为 GPT 格式，以避免安装失败。

## 5. 注意事项

- 安装 Ventoy 会格式化 U 盘，清除所有数据，请提前备份重要文件
- U 盘容量需至少 8GB（推荐 16GB 或更大）
- 可以将 U 盘当作普通存储设备使用，存放普通文件不影响 Ventoy 功能
- 支持同时存放多个 ISO 文件，启动时可以选择
- MBR/GPT 分区格式选项只在安装时有效，升级不会改变现有分区格式

---

## 参考文档

- [Ventoy 官网](https://www.ventoy.net/cn/index.html)
- [Ventoy 使用说明](https://www.ventoy.net/cn/doc_start.html)
- [【情報】推薦一個可下載各版本Windows安裝映像檔(ISO檔)的網站](https://forum.gamer.com.tw/C.php?bsn=60030&snA=666363)
