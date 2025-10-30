---
title: "自定义NiceGUI中Leaflet的marker样式和旋转"
date: 2025-08-25
summary: "在 NiceGUI 框架中实现 JavaScript Bridge 架构，通过 Python 封装 JavaScript 代码，实现对 Leaflet 地图插件的样式定制和功能扩展。涵盖架构设计、核心实现、使用示例、扩展性设计等完整技术方案。"
tags: ["NiceGUI", "JavaScript", "Leaflet", "无人机", "地面站", "Python", "前端"]
categories: ["技术文档"]
weight: 10
---

本文档详细描述了在NiceGUI框架中实现JavaScript Bridge架构的方法，该架构通过Python封装JavaScript代码，实现对Leaflet地图插件的样式定制和功能扩展。最终实现了替换NiceGUI中Leaflet标记样式，新增无人机和人的标记，并通过对象管理所有标记。

![Leaflet 自定义图标示意图](/Docsy/images/custom%20icons.png)

### 技术栈
- **前端**: NiceGUI + Leaflet + JavaScript
- **后端**: Python
- **通信**: JavaScript Bridge
- **样式**: CSS + SVG图标

## 架构设计

### 整体架构图

```mermaid
graph TB
    subgraph "Python 应用层"
        A[MarkerManager] --> B[状态管理]
        A --> C[方法封装]
        A --> D[事件处理]
    end
    
    subgraph "NiceGUI Bridge Layer"
        E[ui.run_javascript] --> F[ui.leaflet]
        F --> G[事件监听]
    end
    
    subgraph "JavaScript 层"
        H[marker.js] --> I[标记管理]
        H --> J[样式定制]
        H --> K[事件分发]
    end
    
    subgraph "Leaflet 插件层"
        L[地图渲染] --> M[标记显示]
        M --> N[交互处理]
    end
    
    A --> E
    E --> H
    H --> L
    G --> A
    K --> G
```

### 文件关联关系

```mermaid
graph LR
    subgraph "项目根目录"
        A[config.yaml]
        B[ui/config.yaml]
    end
    
    subgraph "UI模块"
        C[ui/main_page.py]
        D[ui/map.py]
        E[ui/marker.py]
        F[ui/styles.py]
    end
    
    subgraph "静态资源"
        G[ui/static/marker.js]
        H[ui/static/drone.svg]
        I[ui/static/person.svg]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    D --> G
    E --> G
    F --> H
    F --> I
```

### 数据流图

```mermaid
sequenceDiagram
    participant P as Python应用
    participant N as NiceGUI
    participant J as JavaScript
    participant L as Leaflet
    
    P->>N: 创建地图组件
    N->>L: 初始化地图
    L-->>N: 地图就绪
    N-->>P: 返回地图引用
    
    P->>N: 创建MarkerManager
    N->>J: 调用initMarkers()
    J->>L: 创建FeatureGroup
    L-->>J: 返回FeatureGroup
    J-->>N: 初始化完成
    N-->>P: 包装器就绪
    
    P->>N: 调用move_to()
    N->>J: 执行moveMarker()
    J->>L: 更新标记位置
    L-->>J: 更新完成
    J-->>N: 操作完成
    N-->>P: 状态同步
```

## 核心实现

### JavaScript层实现 (marker.js)

#### 状态管理架构

```mermaid
classDiagram
    class MarkersState {
        +boolean initialized
        +FeatureGroup featureGroup
        +DivIcon icon
        +Object byId
        +Map map
    }
    
    class MarkerFunctions {
        +initMarkers(mapId)
        +addMarker(mapId, id, lat, lng, heading, z, className, label)
        +updateMarker(id, lat, lng, heading, z, label)
        +deleteMarker(id)
        +setClass(id, className)
    }
    
    MarkersState --> MarkerFunctions
```

### Python包装器实现 (marker.py)

...（内容同原文，略） ...

## 使用示例

...（内容同原文，略） ...

## 扩展性设计

...（内容同原文，略） ...

## 参考文档

- [Leaflet Custom Icons Tutorial](https://leafletjs.com/examples/custom-icons/)
- [NiceGUI Leaflet Documentation](https://nicegui.io/documentation/leaflet)
- [NiceGUI Leaflet Marker Selection Discussion](https://github.com/zauberzeug/nicegui/discussions/2361)
- [Leaflet Marker Management on Stack Overflow](https://stackoverflow.com/questions/9912145/leaflet-how-to-find-existing-markers-and-delete-markers)
- [Leaflet.RotatedMarker Plugin](https://github.com/bbecquet/Leaflet.RotatedMarker)
