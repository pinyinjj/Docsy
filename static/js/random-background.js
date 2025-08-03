// 智能随机背景图片功能
(function() {
    'use strict';
    
    // 防止重复执行
    if (window.RandomBackgroundInitialized) {
        return;
    }
    window.RandomBackgroundInitialized = true;
    
    // 防止重复初始化
    let isInitializing = false;
    
    // 配置参数
    const config = {
        username: 'pinyinjj',
        collectionId: '1954116',
        corsProxy: 'https://api.allorigins.win/raw?url=',
        timeout: 3000, // 3秒超时
        defaultImage: '/static/images/default_img.png' // 默认图片路径
    };
    
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
    
    // 预加载图片（带超时）
    function preloadImage(imageUrl, timeout = config.timeout) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => {
                console.log('图片加载超时，使用默认图片');
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
    
    // 从收藏夹获取图片并随机选择一张
    async function getRandomBackgroundImage() {
        try {
            const apiUrl = `${config.corsProxy}https://wallhaven.cc/api/v1/collections/${config.username}/${config.collectionId}`;
            console.log('获取收藏夹图片:', apiUrl);
            
            // 为API请求添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, config.timeout);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const responseData = JSON.parse(text);
            
            if (responseData.data && responseData.data.length > 0) {
                const allPaths = responseData.data.map(item => item.path);
                console.log(`获取到 ${allPaths.length} 张图片`);
                
                const randomIndex = Math.floor(Math.random() * allPaths.length);
                const selectedImage = allPaths[randomIndex];
                
                console.log('随机选择图片:', selectedImage);
                return selectedImage;
            } else {
                console.log('收藏夹中没有图片');
                return null;
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('API请求超时，使用默认图片');
            } else {
                console.error('获取图片失败:', error.message);
            }
            return null;
        }
    }
    
    // 设置背景图片
    async function setRandomBackground() {
        const coverBlock = document.querySelector('.td-cover-block');
        if (coverBlock) {
            const randomImage = await getRandomBackgroundImage();
            
            if (randomImage) {
                try {
                    await preloadImage(randomImage);
                    coverBlock.style.backgroundImage = `url('${randomImage}')`;
                    console.log('设置背景图片成功:', randomImage);
                    return true;
                } catch (error) {
                    console.error('背景图片加载失败，使用默认图片:', error.message);
                    try {
                        await preloadImage(config.defaultImage, 5000); // 默认图片给5秒加载时间
                        coverBlock.style.backgroundImage = `url('${config.defaultImage}')`;
                        return true;
                    } catch (defaultError) {
                        console.error('默认图片也加载失败:', defaultError.message);
                        return false;
                    }
                }
            } else {
                console.log('没有可用的背景图片，使用默认图片');
                try {
                    await preloadImage(config.defaultImage, 5000);
                    coverBlock.style.backgroundImage = `url('${config.defaultImage}')`;
                    console.log('设置默认背景图片成功');
                    return true;
                } catch (error) {
                    console.error('默认图片加载失败:', error.message);
                    return false;
                }
            }
        } else {
            console.log('未找到 .td-cover-block 元素');
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
        if (isInitializing) {
            return;
        }
        
        isInitializing = true;
        
        hidePage();
        
        try {
            const success = await setRandomBackground();
            
            if (success) {
                setTimeout(() => {
                    showPage();
                }, 100);
            } else {
                showPage();
            }
        } catch (error) {
            console.error('初始化过程中出错:', error);
            showPage();
        } finally {
            isInitializing = false;
        }
    }
    
    // 初始化逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    window.addEventListener('load', function() {
        // 页面加载完成
    });
    
})(); 