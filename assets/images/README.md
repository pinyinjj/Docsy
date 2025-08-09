# 图片资源管理

这个目录用于存放所有的图片资源，Hugo 会自动处理和优化这些图片。

## 目录结构

```
assets/images/
├── posts/              # 博客文章图片
│   ├── airsim/        # AirSim 系列
│   ├── web-dev/       # Web 开发系列
│   ├── ml/            # 机器学习系列
│   └── arch/          # 系统架构系列
├── ui/                # 界面相关图片
│   ├── icons/         # 图标
│   └── logos/         # 标志
└── temp/              # 临时图片

## 使用方法

### 基本引用
```go
{{< figure src="images/posts/airsim/demo.jpg" alt="演示图片" >}}
```

### 自动优化
```go
{{ $img := resources.Get "images/posts/demo.jpg" }}
{{ $resized := $img.Resize "800x600 smart q85" }}
<img src="{{ $resized.RelPermalink }}" alt="优化后的图片">
```

## 优势

1. ✅ 自动图片处理和优化
2. ✅ 响应式图片生成
3. ✅ 格式转换（如转为 WebP）
4. ✅ 版本控制和缓存
5. ✅ 构建时压缩
