---
title: "AirSim 编译时 UnrealBuildTool 路径错误问题解决方案"
date: 2026-01-16
summary: "解决使用 Visual Studio 2022 编译 AirSim 时出现卡在 Generating files for Blocks.uproject 的问题，错误原因在于 UnrealBuildTool 路径配置错误，修复 GenerateProjectFiles.bat 脚本中的路径即可解决。"
tags: ["AirSim", "编译", "Windows", "C++"]
categories: ["踩坑记录"]
weight: 10
draft: false
---

## 1. 问题描述

在使用 Visual Studio 2022 编译 AirSim 1.8.1 时，执行编译脚本后出现以下错误：

- 编译过程卡在 `Generating files for Blocks.uproject` 步骤
- 错误信息：`Unhandled Exception: System.IO.FileNotFoundException`
- 执行的命令为：
```text
Running C:/Program Files/Epic Games/UE_4.27/Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.exe -projectfiles -project="C:/Users/Administrator/Documents/Airsim/Unreal/Environments/Blocks/Blocks.uproject" -game -rocket -progress -log="C:\Users\Administrator\Documents\Airsim\Unreal\Environments\Blocks/Saved/Logs/UnrealVersionSelector-2025.12.17-10.32.37.log"
```

**环境信息**：

- **AirSim 版本**：1.8.1（[下载地址](https://github.com/microsoft/airsim/releases)）
- **Unreal Engine 版本**：4.27.2
- **Visual Studio 版本**：Visual Studio 2022 Developer Command Prompt v17.14.22
- **操作系统**：Windows

## 2. 问题原因

错误发生的原因在于 `GenerateProjectFiles.bat` 脚本中使用了错误的 `UnrealBuildTool.exe` 路径。

- **错误路径**：`C:/Program Files/Epic Games/UE_4.27/Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.exe`
- **正确路径**：`C:/Program Files/Epic Games/UE_4.27/Engine/Binaries/DotNET/UnrealBuildTool.exe`

注意：正确的路径中，`UnrealBuildTool.exe` 直接位于 `Binaries/DotNET/` 目录下，而不是在 `Binaries/DotNET/UnrealBuildTool/` 子目录中。

## 3. 解决方案

### 3.1 定位脚本文件

找到 AirSim 项目中的 `GenerateProjectFiles.bat` 脚本文件，路径通常为：
```text
C:\Users\Administrator\Documents\AirSim\Unreal\Environments\Blocks\GenerateProjectFiles.bat
```

### 3.2 修改脚本内容

打开 `GenerateProjectFiles.bat` 文件，将内容修改为：

```bash
setlocal
set UEVer=%1
if "%UEVer%"=="" set "UEVer=4.27"

set UnrealBuildTool=%PROGRAMFILES%\Epic Games\UE_%UEVer%\Engine\Binaries\DotNET\UnrealBuildTool.exe

for %%f in (*.uproject) do (
	echo Generating files for %%f
	"%UnrealBuildTool%" -projectfiles -project="%cd%\%%f" -game -rocket -progress
)
```

**关键修改**：将 `UnrealBuildTool` 变量设置为正确的路径：
```bash
set UnrealBuildTool=%PROGRAMFILES%\Epic Games\UE_%UEVer%\Engine\Binaries\DotNET\UnrealBuildTool.exe
```

注意：修复后的路径直接指向 `Binaries/DotNET/UnrealBuildTool.exe`，移除了多余的 `UnrealBuildTool/` 子目录。

### 3.3 重新编译

修改脚本后，重新执行编译流程，问题应已解决。

---

## 参考文档

- [AirSim GitHub 仓库](https://github.com/microsoft/airsim)
- [AirSim 官方文档](https://microsoft.github.io/AirSim/)
- [Unreal Engine 官方文档](https://www.unrealengine.com/en-US/docs)
