// 智能随机背景图片功能 - 渐进加载版本
(function() {
    'use strict';
    
    // 防止重复执行
    if (window.RandomBackgroundInitialized) {
        return;
    }
    window.RandomBackgroundInitialized = true;
    

    
    // 生成低清版本的 URL - 使用 Canvas 创建模糊缩略图
    function generateLowResImage(img, quality = 0.1, blur = 10) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置较小的画布尺寸
            const scale = quality;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // 应用模糊滤镜
            ctx.filter = `blur(${blur}px)`;
            
            // 绘制缩小的图片
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 转换为 data URL
            const lowResDataUrl = canvas.toDataURL('image/jpeg', 0.5);
            resolve(lowResDataUrl);
        });
    }
    
    // 预加载图片并生成低清版本
    function createLowResVersion(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // 处理跨域问题
            
            img.onload = async () => {
                try {
                    const lowResUrl = await generateLowResImage(img, 0.08, 8);
                    resolve({
                        original: imageUrl,
                        lowRes: lowResUrl,
                        originalImg: img
                    });
                } catch (error) {
                    console.warn('生成低清图片失败，使用原图:', error);
                    resolve({
                        original: imageUrl,
                        lowRes: imageUrl,
                        originalImg: img
                    });
                }
            };
            
            img.onerror = () => {
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
    
    // 随机选择一张图片并创建渐进加载
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
        
        // 创建真实的渐进加载
        try {
            const imageData = await createLowResVersion(selectedImage);
            console.log('✅ 渐进加载图片准备完成:', selectedImage);
            return {
                lowRes: imageData.lowRes,
                highRes: imageData.original,
                lowImg: null, // 低清图片已经是 data URL，不需要 img 对象
                highImg: imageData.originalImg
            };
        } catch (error) {
            console.log('❌ 图片加载失败:', selectedImage);
            return null;
        }
    }
    
    // 渐进式设置背景图片
    async function setRandomBackground() {
        console.log('=== 开始设置渐进式随机背景 ===');
        
        // 优先查找 .td-cover-block 元素
        const coverBlock = document.querySelector('.td-cover-block');
        const targetElement = coverBlock || document.body;
        
        console.log('目标元素:', targetElement);
        
        try {
            // 获取渐进加载的图片对象
            const progressiveImage = await getRandomLocalImage();
            
            if (progressiveImage) {
                // 设置基本背景样式
                targetElement.style.setProperty('background-size', 'cover', 'important');
                targetElement.style.setProperty('background-position', 'center', 'important');
                targetElement.style.setProperty('background-repeat', 'no-repeat', 'important');
                targetElement.style.setProperty('background-attachment', 'fixed', 'important');
                
                // 如果有低清图片，先设置低清背景
                if (progressiveImage.lowRes) {
                    targetElement.style.setProperty('background-image', `url('${progressiveImage.lowRes}')`, 'important');
                    targetElement.style.setProperty('filter', 'blur(8px) brightness(0.9)', 'important');
                    targetElement.style.setProperty('transition', 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
                    console.log('🔽 设置低清背景图片:', progressiveImage.lowRes);
                }
                
                // 监听高清图片加载完成
                progressiveImage.highImg.onload = () => {
                    console.log('🔥 高清图片加载完成，开始切换');
                    
                    // 切换到高清图片并移除模糊效果
                    targetElement.style.setProperty('background-image', `url('${progressiveImage.highRes}')`, 'important');
                    targetElement.style.removeProperty('filter');
                    
                    console.log('✅ 渐进式背景图片设置完成:', progressiveImage.highRes);
                };
                
                // 如果高清图片已经加载完成（缓存情况）
                if (progressiveImage.highImg.complete) {
                    targetElement.style.setProperty('background-image', `url('${progressiveImage.highRes}')`, 'important');
                    targetElement.style.removeProperty('filter');
                    console.log('✅ 高清图片已缓存，直接显示:', progressiveImage.highRes);
                }
                
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
    
    // 初始化函数 - 恢复默认加载方式
    async function initialize() {
        console.log('🎨 初始化渐进式随机背景功能...');
        
        try {
            const success = await setRandomBackground();
            
            if (success) {
                console.log('✅ 渐进式随机背景功能初始化成功');
            } else {
                console.log('❌ 渐进式随机背景功能初始化失败');
            }
        } catch (error) {
            console.error('初始化过程中出错:', error);
        }
    }
    
    // WebP 渐进加载测试功能
    function testWebPProgressive() {
        console.log('🧪 开始测试 WebP 渐进加载支持...');
        
        return new Promise((resolve) => {
            const img = new Image();
            let progressEvents = 0;
            let loadEvents = 0;
            
            // 监听 progress 事件（如果支持渐进加载会触发）
            img.addEventListener('progress', (e) => {
                progressEvents++;
                console.log(`📊 Progress 事件 #${progressEvents}:`, {
                    loaded: e.loaded,
                    total: e.total,
                    lengthComputable: e.lengthComputable
                });
            });
            
            // 监听 load 事件
            img.addEventListener('load', () => {
                loadEvents++;
                console.log(`✅ Load 事件 #${loadEvents}: 图片加载完成`);
                
                setTimeout(() => {
                    const result = {
                        progressEvents: progressEvents,
                        loadEvents: loadEvents,
                        isProgressive: progressEvents > 0,
                        fileSize: '未知',
                        testImage: '/Docsy/images/bg1.webp'
                    };
                    
                    console.log('📋 WebP 渐进加载测试结果:', result);
                    
                    if (result.isProgressive) {
                        console.log('🎉 您的 WebP 文件支持原生渐进加载！');
                    } else {
                        console.log('❌ WebP 文件不支持原生渐进加载');
                        console.log('💡 建议：使用 cwebp -method 6 -pass 10 重新编码');
                    }
                    
                    resolve(result);
                }, 100);
            });
            
            img.addEventListener('error', () => {
                console.error('❌ 测试图片加载失败');
                resolve({ error: true });
            });
            
            // 开始测试 - 使用时间戳避免缓存
            const testUrl = '/Docsy/images/bg1.webp?test=' + Date.now();
            console.log('🔍 测试图片:', testUrl);
            img.src = testUrl;
        });
    }
    
    // 在初始化时运行测试
    async function runProgressiveTest() {
        try {
            await testWebPProgressive();
        } catch (error) {
            console.error('测试过程中出错:', error);
        }
    }
    
    // 初始化逻辑 - 页面正常加载，不隐藏内容
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await initialize();
            // WebP 测试已完成，可以移除
            // setTimeout(runProgressiveTest, 1000);
        });
    } else {
        initialize().then(() => {
            // WebP 测试已完成，可以移除
            // setTimeout(runProgressiveTest, 1000);
        });
    }
    
})();
