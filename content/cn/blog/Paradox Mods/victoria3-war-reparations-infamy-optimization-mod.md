---
title: "维多利亚3 战争赔款恶名优化mod"
summary: "适用于《维多利亚3》（v1.9.8）的模组，为战争赔款提供可调节的恶名机制，允许玩家自定义恶名获取，并加快衰减速度、提高阈值。"
date: 2025-09-14
tags:
categories: ["游戏插件"]
weight: 10
---

## 概述

本Mod解决了维多利亚3中战争赔款系统的不平衡问题，相比征服领土等其他战争目标，要求战争赔款会产生过高的恶名。Mod提供了灵活可定制的解决方案，在保持游戏平衡的同时改善外交策略选择。

## 功能特性

- **可调节恶名生成**: 较低的divide值会增加恶名生成，可自定义最小/最大值限制
- **5倍更快恶名衰减**: 年衰减率从5.0提升到25.0
- **战争赔款优化**: 减少战争赔款的过度恶名，同时保持战略平衡

## 安装

### 推荐：Steam创意工坊

1. 访问 [Steam创意工坊页面](https://steamcommunity.com/sharedfiles/filedetails/?id=3567979652)
2. 点击"订阅"自动下载和安装
3. 启动维多利亚3 - Mod将自动启用

**注意**：Steam创意工坊安装是最可靠的方法。手动安装可能导致Mod无法正常工作。

### 手动安装

1. 下载Mod文件：[GitHub仓库](https://github.com/pinyinjj/Victoria3-War-Reparations-Infamy-Fix/tree/1.0.0)
2. 放置到维多利亚3 Mod目录
3. 在游戏启动器中启用Mod

## 文件结构

```bash
common/
├── defines/
│   └── 99_mwid_infamy_fix.txt          # 恶名阈值和衰减率
└── treaty_articles/
    └── 05_transfer_money.txt            # 战争赔款恶名计算
```

## 自定义

您可以通过修改 `common/treaty_articles/05_transfer_money.txt` 中的以下值来调整恶名生成：

```txt
divide = 10000  # 较低值 = 更高恶名
min = 0.5       # 最小恶名 (最大值: 5)
max = 20        # 最大恶名 (最大值: 50)
```

## 开发方法

本Mod使用热补丁方法：

1. **完整文件覆盖**: 复制并修改整个 `05_transfer_money.txt` 条约条款文件
2. **选择性值更改**: 仅调整特定参数 (`divide`, `min`, `max`)，同时保留所有其他功能
3. **最小影响**: 精确控制战争赔款恶名，不影响其他外交行动或与其他Mod冲突

核心恶名计算位于：
```bash
game/common/treaty_articles/05_transfer_money.txt - money_transfer.wargoal.infamy
```

## 兼容性

- **游戏版本**: 维多利亚3 v1.9.8
- **多人游戏**: 同步
- **其他Mod**: 由于高加载优先级，与大多数Mod兼容

## 支持

如有问题或建议，请参考Mod讨论页面或在仓库中创建问题。
