// 智能随机背景图片功能
(function() {
    'use strict';
    
    // 防止重复执行
    if (window.RandomBackgroundInitialized) {
        return;
    }
    window.RandomBackgroundInitialized = true;
    
    // 隐藏页面内容
    function hidePage() {
        const body = document.body;
        if (body) {
            body.style.visibility = 'hidden';
            body.style.opacity = '0';
            body.style.transition = 'opacity 0.5s ease-in-out';
        }
    }
    
    // 显示页面内容
    function showPage() {
        const body = document.body;
        if (body) {
            body.style.visibility = 'visible';
            body.style.opacity = '1';
        }
    }
    
    // 预加载图片（无超时）
    function preloadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log('背景图片预加载成功:', imageUrl);
                resolve(imageUrl);
            };
            img.onerror = () => {
                console.error('背景图片预加载失败:', imageUrl);
                reject(new Error('图片加载失败'));
            };
            img.src = imageUrl;
        });
    }
    
    // 获取本地图片列表
    function getLocalImageList() {
        // 使用 /Docsy/images/ 路径
        const imageFolder = '/Docsy/images/';
        
        // 图片总数配置 - 只需要修改这个数字
        const totalImages = 15;
        
        // 动态生成图片文件列表
        const imageFiles = [];
        for (let i = 1; i <= totalImages; i++) {
            imageFiles.push(`bg${i}.webp`);
        }
        
        console.log('本地图片文件列表:', imageFiles);
        console.log('图片文件夹路径:', imageFolder);
        
        return imageFiles.map(filename => imageFolder + filename);
    }
    
    // 随机选择一张图片并加载
    async function getRandomLocalImage() {
        const imageList = getLocalImageList();
        console.log('本地图片列表:', imageList);
        
        if (imageList.length === 0) {
            console.log('没有可用的图片列表');
            return null;
        }
        
        // 随机选择一张图片
        const randomIndex = Math.floor(Math.random() * imageList.length);
        const selectedImage = imageList[randomIndex];
        
        console.log('🎲 随机选择的图片:', selectedImage);
        console.log('🎲 随机索引:', randomIndex, '总图片数:', imageList.length);
        
        // 尝试加载选中的图片
        try {
            await preloadImage(selectedImage);
            console.log('✅ 图片加载成功:', selectedImage);
            return selectedImage;
        } catch (error) {
            console.log('❌ 图片加载失败:', selectedImage);
            return null;
        }
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
                // 设置背景样式
                targetElement.style.setProperty('background-image', `url('${randomImage}')`, 'important');
                targetElement.style.setProperty('background-size', 'cover', 'important');
                targetElement.style.setProperty('background-position', 'center', 'important');
                targetElement.style.setProperty('background-repeat', 'no-repeat', 'important');
                targetElement.style.setProperty('background-attachment', 'fixed', 'important');
                
                console.log('✅ 背景图片设置成功:', randomImage);
                return true;
            } else {
                console.log('❌ 没有找到可用的背景图片');
                return false;
            }
        } catch (error) {
            console.error('设置背景图片时出错:', error);
            return false;
        }
    }
    
    // 初始化函数
    async function initialize() {
        console.log('🎨 初始化随机背景功能...');
        
        // 立即隐藏页面
        hidePage();
        
        try {
            const success = await setRandomBackground();
            
            if (success) {
                console.log('✅ 随机背景功能初始化成功');
                // 等待一小段时间确保背景图片完全加载
                setTimeout(() => {
                    showPage();
                }, 100);
            } else {
                console.log('❌ 随机背景功能初始化失败');
                showPage();
            }
        } catch (error) {
            console.error('初始化过程中出错:', error);
            showPage();
        }
    }
    
    // 初始化逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
