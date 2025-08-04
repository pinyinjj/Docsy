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
        // 根据环境动态设置默认图片路径
        defaultImage: (function() {
            if (window.HUGO_ENV && window.HUGO_ENV.isProduction) {
                return window.HUGO_ENV.baseURL + 'images/default_img.png';
            } else {
                return '/static/images/default_img.png';
            }
        })()
    };
    
    // 全局变量存储预加载的图片
    let preloadedImages = [];
    let isPreloading = false;
    
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
    
    // 从收藏夹获取图片并随机选择多张
    async function getRandomBackgroundImages(count = 2) {
        try {
            const apiUrl = `${config.corsProxy}https://wallhaven.cc/api/v1/collections/${config.username}/${config.collectionId}`;
            console.log('获取收藏夹图片:', apiUrl);
            
            // 添加错误处理，避免扩展拦截导致的错误
            if (typeof fetch === 'undefined') {
                console.warn('fetch API不可用，可能是被扩展拦截');
                return [];
            }
            
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
                
                // 随机选择指定数量的图片
                const selectedImages = [];
                const shuffled = [...allPaths].sort(() => 0.5 - Math.random());
                
                for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                    selectedImages.push(shuffled[i]);
                }
                
                console.log(`随机选择 ${selectedImages.length} 张图片:`, selectedImages);
                return selectedImages;
            } else {
                console.log('收藏夹中没有图片');
                return [];
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('API请求超时，使用默认图片');
            } else {
                console.error('获取图片失败:', error.message);
            }
            return [];
        }
    }
    
    // 预加载多张图片
    async function preloadMultipleImages() {
        if (isPreloading) {
            console.log('正在预加载中，跳过重复请求');
            return;
        }
        
        isPreloading = true;
        
        try {
            const images = await getRandomBackgroundImages(2);
            if (images.length > 0) {
                // 预加载所有图片
                const preloadPromises = images.map(img => preloadImage(img));
                const preloadedUrls = await Promise.allSettled(preloadPromises);
                
                // 过滤出成功加载的图片
                preloadedImages = preloadedUrls
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);
                
                console.log(`成功预加载 ${preloadedImages.length} 张图片`);
                
                // 将预加载的图片存储到sessionStorage中，供about页面使用
                if (preloadedImages.length > 1) {
                    sessionStorage.setItem('preloadedAboutImage', preloadedImages[1]);
                    console.log('已为about页面预加载图片:', preloadedImages[1]);
                }
            }
        } catch (error) {
            console.error('预加载图片失败:', error);
        } finally {
            isPreloading = false;
        }
    }
    
    // 设置背景图片
    async function setRandomBackground() {
        const coverBlock = document.querySelector('.td-cover-block');
        if (coverBlock) {
            let imageToUse = null;
            
            // 检查是否有预加载的图片
            if (preloadedImages.length > 0) {
                imageToUse = preloadedImages[0];
                preloadedImages.shift(); // 移除已使用的图片
                console.log('使用预加载的图片:', imageToUse);
            } else {
                // 如果没有预加载的图片，获取新的图片
                const images = await getRandomBackgroundImages(1);
                if (images.length > 0) {
                    imageToUse = images[0];
                }
            }
            
            if (imageToUse) {
                try {
                    coverBlock.style.backgroundImage = `url('${imageToUse}')`;
                    console.log('设置背景图片成功:', imageToUse);
                    return true;
                } catch (error) {
                    console.error('背景图片设置失败:', error.message);
                    return false;
                }
            } else {
                console.log('没有可用的背景图片，使用默认图片');
                try {
                    const defaultImagePath = getImagePath('default_img.png');
                    await preloadImage(defaultImagePath, 5000);
                    coverBlock.style.backgroundImage = `url('${defaultImagePath}')`;
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
    
    // 为about页面设置背景图片
    async function setAboutBackground() {
        const coverBlock = document.querySelector('.td-cover-block');
        if (coverBlock) {
            // 首先检查sessionStorage中是否有预加载的图片
            const preloadedImage = sessionStorage.getItem('preloadedAboutImage');
            
            if (preloadedImage) {
                try {
                    coverBlock.style.backgroundImage = `url('${preloadedImage}')`;
                    console.log('使用预加载的about页面背景图片:', preloadedImage);
                    sessionStorage.removeItem('preloadedAboutImage'); // 使用后清除
                    return true;
                } catch (error) {
                    console.error('预加载的about页面背景图片设置失败:', error.message);
                }
            }
            
            // 如果没有预加载的图片，获取新的图片
            const images = await getRandomBackgroundImages(1);
            if (images.length > 0) {
                try {
                    await preloadImage(images[0]);
                    coverBlock.style.backgroundImage = `url('${images[0]}')`;
                    console.log('设置about页面背景图片成功:', images[0]);
                    return true;
                } catch (error) {
                    console.error('about页面背景图片加载失败:', error.message);
                }
            }
            
            // 使用默认图片
            try {
                const defaultImagePath = getImagePath('default_img.png');
                await preloadImage(defaultImagePath, 5000);
                coverBlock.style.backgroundImage = `url('${defaultImagePath}')`;
                console.log('设置about页面默认背景图片成功');
                return true;
            } catch (error) {
                console.error('about页面默认图片加载失败:', error.message);
                return false;
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
        },
        refreshAbout: function() {
            console.log('手动刷新about页面背景图片');
            setAboutBackground();
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
            // 检查当前页面是否为about页面
            const isAboutPage = window.location.pathname.includes('/about/');
            
            if (isAboutPage) {
                const success = await setAboutBackground();
                if (success) {
                    setTimeout(() => {
                        showPage();
                    }, 100);
                } else {
                    showPage();
                }
            } else {
                // 主页或其他页面：预加载两张图片，使用第一张
                await preloadMultipleImages();
                const success = await setRandomBackground();
                
                if (success) {
                    setTimeout(() => {
                        showPage();
                    }, 100);
                } else {
                    showPage();
                }
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
    
    // 添加全局错误处理，避免扩展导致的错误
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('message port closed')) {
            console.warn('检测到浏览器扩展错误，忽略此错误');
            return false;
        }
    });
    
    window.addEventListener('load', function() {
        // 页面加载完成
    });
    
})(); 