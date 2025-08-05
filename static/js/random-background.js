// 随机背景功能
function setRandomBackground() {
    console.log('=== 开始随机背景功能 ===');
    
    // 图片文件夹路径
    const imageFolder = '/Docsy/static/images/';
    console.log('📁 图片文件夹路径:', imageFolder);
    
    // 支持的图片格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    console.log('🖼️ 支持的图片格式:', imageExtensions);
    
    // 预定义的图片文件名列表（可以根据实际文件添加）
    const imageFiles = [
        'default_img.png',
        // 'background1.jpg',
        // 'background2.jpg',
        // 'background3.jpg',
        // 'background4.jpg',
        // 'background5.jpg',
        // 可以继续添加更多图片文件名
    ];
    console.log('📋 预定义的图片文件列表:', imageFiles);
    
    // 检查图片是否存在的函数
    function checkImageExists(url) {
        console.log('🔍 正在检查图片是否存在:', url);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log('✅ 图片加载成功:', url);
                resolve(true);
            };
            img.onerror = () => {
                console.log('❌ 图片加载失败:', url);
                resolve(false);
            };
            img.src = url;
        });
    }
    
    // 获取可用的图片列表
    async function getAvailableImages() {
        console.log(' 开始获取可用的图片列表...');
        const availableImages = [];
        
        // 检查预定义的图片文件
        console.log('📝 检查预定义的图片文件...');
        for (const fileName of imageFiles) {
            const imageUrl = imageFolder + fileName;
            console.log('🔗 尝试访问图片地址:', imageUrl);
            const exists = await checkImageExists(imageUrl);
            if (exists) {
                console.log('✅ 找到可用图片:', imageUrl);
                availableImages.push(imageUrl);
            } else {
                console.log('❌ 图片不存在:', imageUrl);
            }
        }
        
        // 如果没有找到预定义的图片，尝试一些常见的文件名
        if (availableImages.length === 0) {
            console.log('⚠️ 预定义图片都不可用，尝试常见文件名...');
            const commonNames = [
                'background.jpg', 'background.png', 'bg.jpg', 'bg.png',
                'wallpaper.jpg', 'wallpaper.png', 'cover.jpg', 'cover.png'
            ];
            
            for (const fileName of commonNames) {
                const imageUrl = imageFolder + fileName;
                console.log(' 尝试常见文件名地址:', imageUrl);
                const exists = await checkImageExists(imageUrl);
                if (exists) {
                    console.log('✅ 找到可用图片:', imageUrl);
                    availableImages.push(imageUrl);
                } else {
                    console.log('❌ 图片不存在:', imageUrl);
                }
            }
        }
        
        console.log('📊 最终可用的图片列表:', availableImages);
        console.log('📊 可用图片数量:', availableImages.length);
        return availableImages;
    }
    
    // 设置背景图片
    async function setBackground() {
        console.log('🎨 开始设置背景图片...');
        const availableImages = await getAvailableImages();
        
        if (availableImages.length === 0) {
            console.log('❌ 没有找到可用的背景图片');
            console.log('💡 请检查以下路径是否存在图片文件:');
            console.log('   - /Docsy/static/images/default_img.png');
            console.log('   - /Docsy/static/images/background.jpg');
            console.log('   - /Docsy/static/images/bg.png');
            return;
        }
        
        // 随机选择一张图片
        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const selectedImage = availableImages[randomIndex];
        
        console.log('🎲 随机选择的背景图片:', selectedImage);
        console.log('🎲 随机索引:', randomIndex, '总图片数:', availableImages.length);
        
        // 设置背景图片
        console.log('🎨 正在设置背景图片样式...');
        console.log('🔗 最终使用的图片地址:', selectedImage);
        
        document.body.style.backgroundImage = `url('${selectedImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        
        // 添加一些样式以确保内容可读性
        document.body.style.minHeight = '100vh';
        
        console.log('✅ 背景图片设置完成');
        console.log('=== 随机背景功能结束 ===');
    }
    
    setBackground();
}

// 页面加载完成后设置随机背景
document.addEventListener('DOMContentLoaded', function() {
    console.log(' 页面加载完成，开始设置随机背景...');
    setRandomBackground();
});
