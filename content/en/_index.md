---
title: Liu TzuCheng's Doc Site
---

<!-- 引入 Playwrite PL 字体 - 优化版本 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playwrite+PL:wght@100..400&display=swap" rel="stylesheet">

{{< blocks/cover title="Code & Thoughts" image_anchor="top" height="full" >}}
<a class="btn btn-lg btn-transparent me-3 mb-4" href="/docs/">
  Learn More <i class="fas fa-arrow-alt-circle-right ms-2"></i>
</a>
<a class="btn btn-lg btn-transparent me-3 mb-4" href="https://github.com/pinyinjj">
  GitHub <i class="fab fa-github ms-2 "></i>
</a>

<p class="lead">Technical sharing and experience recording.</p>

{{< /blocks/cover >}}

<!-- 调试信息显示区域 -->
<div id="debug-info" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; max-width: 300px; z-index: 1000;">
    <div>调试信息:</div>
    <div id="debug-content">正在加载...</div>
</div>

<!-- 透明按钮样式 -->
<style>
/* Playwrite PL 字体样式 */
.td-cover-block h1,
.td-cover-block .display-1,
.td-cover-block .display-2,
.td-cover-block .display-3,
.td-cover-block .display-4 {
    font-family: 'Playwrite PL', cursive !important;
    font-weight: 300 !important; /* 使用较细的权重，因为字体范围是100-400 */
    letter-spacing: 0.02em !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3) !important;
    line-height: 1.2 !important;
    font-feature-settings: "liga" 1, "kern" 1 !important; /* 启用连字和字距调整 */
}

/* 透明按钮样式 */
.btn-transparent {
    background: rgba(255, 255, 255, 0.2) !important;
    border: 2px solid rgba(255, 255, 255, 0.8) !important;
    color: white !important;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.btn-transparent:hover {
    background: rgba(255, 255, 255, 0.3) !important;
    border-color: rgba(255, 255, 255, 1) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    color: white !important;
    text-decoration: none;
}

.btn-transparent:focus {
    background: rgba(255, 255, 255, 0.3) !important;
    border-color: rgba(255, 255, 255, 1) !important;
    color: white !important;
    box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25);
}

/* 确保图标也是白色 */
.btn-transparent i {
    color: white !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .btn-transparent {
        margin: 5px !important;
        width: auto;
    }
}
</style>

<script>
// 智能随机背景图片功能
(function() {
    'use strict';
    
    // 防止重复执行
    if (window.RandomBackgroundInitialized) {
        return;
    }
    window.RandomBackgroundInitialized = true;
    
    // 调试信息显示函数
    function showDebug(message) {
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            const timestamp = new Date().toLocaleTimeString();
            debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            console.log(message);
        }
    }
    
    // 配置参数
    const config = {
        username: 'pinyinjj',
        collectionId: '1954116',
        corsProxy: 'https://api.allorigins.win/raw?url='
        // corsProxy: 'https://your-site-name.netlify.app/.netlify/functions/cors-proxy?url='
    };
    
    // 从收藏夹获取图片并随机选择一张
    async function getRandomBackgroundImage() {
        try {
            const apiUrl = `${config.corsProxy}https://wallhaven.cc/api/v1/collections/${config.username}/${config.collectionId}`;
            showDebug(`获取收藏夹图片: ${apiUrl}`);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const responseData = JSON.parse(text);
            
            if (responseData.data && responseData.data.length > 0) {
                // 提取所有图片路径
                const allPaths = responseData.data.map(item => item.path);
                showDebug(`获取到 ${allPaths.length} 张图片`);
                
                // 随机选择一张图片
                const randomIndex = Math.floor(Math.random() * allPaths.length);
                const selectedImage = allPaths[randomIndex];
                
                showDebug(`随机选择图片: ${selectedImage}`);
                return selectedImage;
            } else {
                showDebug('收藏夹中没有图片');
                return null;
            }
            
        } catch (error) {
            showDebug(`获取图片失败: ${error.message}`);
            return null;
        }
    }
    
    // 设置背景图片
    async function setRandomBackground() {
        const coverBlock = document.querySelector('.td-cover-block');
        if (coverBlock) {
            const randomImage = await getRandomBackgroundImage();
            
            if (randomImage) {
                coverBlock.style.backgroundImage = `url('${randomImage}')`;
                showDebug(`设置背景图片成功: ${randomImage}`);
            } else {
                showDebug('没有可用的背景图片');
            }
        }
    }
    
    // 公开的配置接口
    window.RandomBackground = {
        // 手动刷新背景
        refresh: function() {
            setRandomBackground();
        },
        // 隐藏调试信息
        hideDebug: function() {
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
                debugInfo.style.display = 'none';
            }
        },
        // 显示调试信息
        showDebug: function() {
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
                debugInfo.style.display = 'block';
            }
        }
    };
    
    // 只执行一次：页面加载完成后设置随机背景
    document.addEventListener('DOMContentLoaded', function() {
        showDebug('开始设置随机背景');
        setRandomBackground();
    });
    
})();
</script>

