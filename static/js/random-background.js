// 智能随机背景图片功能
(function() {
    'use strict';
    
    // 防止重复执行
    if (window.RandomBackgroundInitialized) {
        return;
    }
    window.RandomBackgroundInitialized = true;
    
    // 配置参数
    const config = {
        timeout: 3000, // 3秒超时
        defaultImage: '/Docsy/static/images/default_img.png' // 默认图片路径
    };
    
    // 预加载图片（带超时）
    function preloadImage(imageUrl, timeout = config.timeout) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => {
                console.log('图片加载超时:', imageUrl);
                reject(new Error('图片加载超时'));
            }, timeout);
            
            img.onload = () => {
                clearTimeout(timer);
                console.log('背景图片预加载成功:', imageUrl);
                resolve(imageUrl);
            };
            img.onerror = () => {
                clearTimeout(timer);
                console.error('背景图片预加载失败:', imageUrl);
                reject(new Error('图片加载失败'));
            };
            img.src = imageUrl;
        });
    }
    
    // 获取本地图片列表
    function getLocalImageList() {
        const imageFolder = '/Docsy/static/images/';
        const imageFiles = [
            'default_img.png',
            'background1.jpg',
            'background2.jpg',
            'background3.jpg',
            'background4.jpg',
            'background5.jpg',
            // 可以继续添加更多图片文件名
        ];
        
        return imageFiles.map(filename => imageFolder + filename);
    }
    
    // 随机选择本地图片
    async function getRandomLocalImage() {
        const imageList = getLocalImageList();
        console.log('本地图片列表:', imageList);
        
        // 检查哪些图片存在
        const availableImages = [];
        
        for (const imageUrl of imageList) {
            try {
                await preloadImage(imageUrl, 2000); // 2秒超时检查
                availableImages.push(imageUrl);
                console.log('✅ 找到可用图片:', imageUrl);
            } catch (error) {
                console.log('❌ 图片不可用:', imageUrl);
            }
        }
        
        if (availableImages.length === 0) {
            console.log('没有找到可用的本地图片');
            return null;
        }
        
        // 随机选择一张图片
        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const selectedImage = availableImages[randomIndex];
        
        console.log('🎲 随机选择的本地图片:', selectedImage);
        return selectedImage;
    }
    
    // 设置背景图片
    async function setRandomBackground() {
        console.log('=== 开始设置随机背景 ===');
        
        // 优先查找 .td-cover-block 元素
        const coverBlock = document.querySelector('.td-cover-block');
        const targetElement = coverBlock || document.body;
        
        console.log('目标元素:', targetElement);
        
        try {
            // 获取随机图片
            const randomImage = await getRandomLocalImage();
            
            if (randomImage) {
                // 预加载并设置背景
                await preloadImage(randomImage);
                
                // 设置背景样式
                targetElement.style.setProperty('background-image', `url('${randomImage}')`, 'important');
                targetElement.style.setProperty('background-size', 'cover', 'important');
                targetElement.style.setProperty('background-position', 'center', 'important');
                targetElement.style.setProperty('background-repeat', 'no-repeat', 'important');
                targetElement.style.setProperty('background-attachment', 'fixed', 'important');
                
                console.log('✅ 背景图片设置成功:', randomImage);
                return true;
            } else {
                // 使用默认图片
                console.log('使用默认图片:', config.defaultImage);
                try {
                    await preloadImage(config.defaultImage, 5000);
                    targetElement.style.setProperty('background-image', `url('${config.defaultImage}')`, 'important');
                    targetElement.style.setProperty('background-size', 'cover', 'important');
                    targetElement.style.setProperty('background-position', 'center', 'important');
                    targetElement.style.setProperty('background-repeat', 'no-repeat', 'important');
                    targetElement.style.setProperty('background-attachment', 'fixed', 'important');
                    
                    console.log('✅ 默认背景图片设置成功');
                    return true;
                } catch (error) {
                    console.error('默认图片也加载失败:', error.message);
                    return false;
                }
            }
        } catch (error) {
            console.error('设置背景图片时出错:', error);
            return false;
        }
    }
    
    // 公开的配置接口
    window.RandomBackground = {
        refresh: function() {
            console.log('手动刷新背景图片');
            setRandomBackground();
        }
    };
    
    // 初始化函数
    async function initialize() {
        console.log('🎨 初始化随机背景功能...');
        
        try {
            const success = await setRandomBackground();
            
            if (success) {
                console.log('✅ 随机背景功能初始化成功');
            } else {
                console.log('❌ 随机背景功能初始化失败');
            }
        } catch (error) {
            console.error('初始化过程中出错:', error);
        }
    }
    
    // 初始化逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
