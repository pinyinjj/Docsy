---
title: "GitInfo 功能测试页面"
date: 2025-10-29
summary: "此页面用于测试GitHub部署时的GitInfo功能是否正常工作"
tags: ["测试"]
categories: ["技术文档"]
draft: false
---

## GitInfo 测试说明

本页面用于测试和验证Hugo的GitInfo功能在GitHub Actions部署时是否正常工作。

### 预期显示效果

在页面顶部的元数据区域，应该显示：

**本地开发环境：**
- 更新于 [日期]

**GitHub Pages部署：**
- 更新于 [日期]: [提交消息] ([提交哈希缩写])
- 提交信息应该是可点击的链接

### 功能验证清单

- [ ] 显示更新日期
- [ ] 显示Git提交消息
- [ ] 显示提交哈希缩写
- [ ] 链接可以跳转到GitHub commit页面
- [ ] 中文日期格式正确（2006年1月2日）

### 技术实现

GitInfo功能依赖于：
1. Hugo配置中的 `enableGitInfo: true`
2. GitHub Actions checkout时的 `fetch-depth: 0`
3. Hugo构建命令中的 `--enableGitInfo` 参数

如果以上三项都正确配置，GitInfo应该能正常工作。

---

**测试时间：** 2025-10-29  
**测试目的：** 验证Git提交信息显示功能

