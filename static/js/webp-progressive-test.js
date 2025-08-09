// WebP 渐进加载测试脚本
(function() {
    'use strict';
    
    // 测试 WebP 是否支持渐进加载
    function testWebPProgressive() {
        return new Promise((resolve) => {
            const img = new Image();
            let progressiveSteps = 0;
            let lastSize = 0;
            
            // 监听加载进度
            img.addEventListener('load', () => {
                console.log('✅ WebP 图片完全加载完成');
                resolve({
                    isProgressive: progressiveSteps > 1,
                    steps: progressiveSteps
                });
            });
            
            img.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const currentSize = e.loaded;
                    if (currentSize > lastSize) {
                        progressiveSteps++;
                        lastSize = currentSize;
                        console.log(`📊 WebP 加载进度: ${Math.round(e.loaded/e.total*100)}% (步骤 ${progressiveSteps})`);
                    }
                }
            });
            
            // 使用一个大的 WebP 文件进行测试
            img.src = '/Docsy/images/bg1.webp?t=' + Date.now();
        });
    }
    
    // 原生 WebP 渐进加载实现
    function setProgressiveWebPBackground() {
        const coverBlock = document.querySelector('.td-cover-block') || document.body;
        const testImg = new Image();
        
        // 监听渐进加载事件
        testImg.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const progress = e.loaded / e.total;
                console.log(`🔄 WebP 原生渐进加载: ${Math.round(progress * 100)}%`);
                
                // 根据加载进度调整图片质量效果
                if (progress < 0.3) {
                    coverBlock.style.filter = 'blur(10px) brightness(0.8)';
                } else if (progress < 0.7) {
                    coverBlock.style.filter = 'blur(5px) brightness(0.9)';
                } else {
                    coverBlock.style.filter = 'blur(2px)';
                }
            }
        });
        
        testImg.addEventListener('load', () => {
            // 完全加载后移除所有滤镜
            coverBlock.style.filter = 'none';
            coverBlock.style.transition = 'filter 0.3s ease-in-out';
            console.log('✅ WebP 原生渐进加载完成');
        });
        
        // 设置背景图片
        const imageUrl = '/Docsy/images/bg' + (Math.floor(Math.random() * 15) + 1) + '.webp';
        coverBlock.style.backgroundImage = `url('${imageUrl}')`;
        coverBlock.style.backgroundSize = 'cover';
        coverBlock.style.backgroundPosition = 'center';
        coverBlock.style.backgroundRepeat = 'no-repeat';
        
        // 开始加载测试
        testImg.src = imageUrl;
    }
    
    // 初始化测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🧪 开始测试 WebP 渐进加载...');
            
            const result = await testWebPProgressive();
            console.log('📋 WebP 测试结果:', result);
            
            if (result.isProgressive) {
                console.log('🎉 您的 WebP 文件支持原生渐进加载！');
                setProgressiveWebPBackground();
            } else {
                console.log('❌ WebP 文件不支持原生渐进加载，建议重新编码');
            }
        });
    }
})();
