---
title: "使用fuck-u-code优化代码质量"
date: 2025-10-28
summary: "使用fuck-u-code工具进行代码质量分析，评估代码的“屎山等级”并生成报告。支持多语言检测、七维度分析、彩色终端输出和Markdown报告生成。"
tags: ["前端", "后端", "Python", "C++", "JavaScript"]
categories: ["技术文档"]
weight: 10
---

[fuck-u-code](https://github.com/Done-0/fuck-u-code) 是一款专门揭露屎山代码的质量分析工具，能够评估代码的"屎山等级"并输出美观的报告，可以输出md格式报告，供大模型分析使用。

## 项目介绍

**项目地址：** [https://github.com/Done-0/fuck-u-code](https://github.com/Done-0/fuck-u-code)

**项目描述：** Legacy-Mess Detector – assess the "legacy-mess level" of your code and output a beautiful report | 屎山代码检测器，评估代码的"屎山等级"并输出美观的报告

### 核心特性

- **多语言支持**: Go、JS/TS、Python、Java、C/C++
- **屎山指数**: 0~100 分，越高越烂
- **七维度检测**: 复杂度 / 函数长度 / 注释率 / 错误处理 / 命名 / 重复度 / 结构
- **彩色终端报告**: 批评也能笑着听
- **Markdown 输出**: 方便 AI 分析与文档集成
- **灵活配置**: 摘要 / 详细模式，多语言报告
- **全程本地运行**: 不上传代码，安全无忧

## 安装方法

### 方法一：Go 安装（推荐）
```bash
go install github.com/Done-0/fuck-u-code/cmd/fuck-u-code@latest
```

### 方法二：源码构建
```bash
git clone https://github.com/Done-0/fuck-u-code.git
cd fuck-u-code && go build -o fuck-u-code ./cmd/fuck-u-code
```

### 方法三：Docker 构建
```bash
docker build -t fuck-u-code .
```

## 基本使用方法

### 分析本地项目
```bash
# 基本分析 - 本地项目
fuck-u-code analyze /path/to/project
# 或
fuck-u-code /path/to/project

# 默认分析当前目录
fuck-u-code analyze
```

### 分析 Git 仓库
```bash
# 分析 Git 仓库（自动克隆）
fuck-u-code analyze https://github.com/user/repo.git
# 或
fuck-u-code https://github.com/user/repo
```

### Docker 运行
```bash
docker run --rm -v "/path/to/project:/build" fuck-u-code analyze
```

## 常用选项

| 选项           | 简写  | 描述                       |
|---------------|-------|---------------------------|
| `--verbose`   | `-v`  | 显示详细报告               |
| `--top N`     | `-t`  | 最烂的前 N 个文件          |
| `--issues N`  | `-i`  | 每文件显示 N 个问题        |
| `--summary`   | `-s`  | 只看总结，不看过程         |
| `--markdown`  | `-m`  | 输出 Markdown 格式报告     |
| `--lang`      | `-l`  | 报告语言 (zh-CN/en-US/ru-RU) |
| `--exclude`   | `-e`  | 排除指定目录或文件         |
| `--skipindex` | `-x`  | 跳过 index.js/ts 文件      |

### 使用示例
```bash
fuck-u-code analyze --verbose
fuck-u-code analyze --top 3
fuck-u-code analyze --lang en-US
fuck-u-code analyze --summary
fuck-u-code analyze --exclude "**/test/**"
fuck-u-code analyze --markdown > report.md
```

## 代码质量分析脚本

基于 `fuck-u-code` 工具，我编写了一个简单的代码质量分析脚本，用于自动生成 Markdown 格式的代码质量报告。

### 脚本内容

创建 `analyze_code_quality.sh` 文件：

```bash
#!/bin/bash

# 代码质量分析脚本
fuck-u-code analyze --markdown --lang zh-CN --skipindex --exclude "**/tests/**" > code_quality_report.md

echo "代码质量分析完成，报告已生成：code_quality_report.md"
```

### 使用方法

```bash
# 1. 创建脚本文件
nano analyze_code_quality.sh
# 将上述脚本内容复制到文件中

# 2. 赋予执行权限
chmod +x analyze_code_quality.sh

# 3. 运行脚本
./analyze_code_quality.sh
```

### 脚本参数说明

- `--markdown`: 输出 Markdown 格式报告
- `--lang zh-CN`: 使用中文语言
- `--skipindex`: 跳过 index.js/ts 文件
- `--exclude "**/tests/**"`: 排除测试目录

### 输出文件

- `code_quality_report.md` - 代码质量分析报告

### Markdown 输出

适合 **AI 分析、文档集成、CI/CD、团队协作**
```bash
fuck-u-code analyze --markdown
fuck-u-code analyze --markdown > report.md
fuck-u-code analyze --markdown --top 10 --lang en-US > report.md
```

### 默认排除路径

- **前端**: `node_modules`，`dist`，`build`，`*.min.js` 等
- **后端**: `vendor`，`bin`，`target`，`logs`，`migrations` 等

## 疑难解答

### 常见问题

1. **`command not found` 错误**
```bash
# 把 Go bin 路径加到 PATH
export PATH="$PATH:$(go env GOPATH)/bin"
# 并写入 .bash_profile / .zshrc 等
```

2. **权限错误**
```bash
chmod +x analyze_code_quality.sh
chmod +x quick_analyze.sh
```

3. **fuck-u-code 未安装**
```bash
go install github.com/Done-0/fuck-u-code/cmd/fuck-u-code@latest
```

4. **不在项目根目录**
- 确保在包含 `requirements.txt` 和 `app/` 目录的根目录运行

5. **分析失败**
- 检查 `logs/analysis_error.log` 文件
- 确保项目代码没有语法错误

## 报告解读

### 评分系统

- **分数范围**: 0~100 分
- **分数含义**: 越高越烂，欢迎"高分大佬"上榜
- **七维度检测**:
  - 复杂度分析
  - 函数长度检查
  - 注释率统计
  - 错误处理评估
  - 命名规范检查
  - 重复度检测
  - 代码结构分析

### 生成的 Markdown 报告包含

- 📊 整体质量评分
- 📈 各项指标详情
- 🔍 问题文件列表
- 💡 改进建议

### 改进重点

根据报告中的优先级进行代码改进，重点关注：
- 高复杂度函数
- 重复代码
- 缺少注释
- 错误处理
