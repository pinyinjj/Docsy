// 随机背景功能
function setRandomBackground() {
    // 图片文件夹路径
    const imageFolder = '/Docsy/static/images/';
    
    // 支持的图片格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
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
    
    // 检查图片是否存在的函数
    function checkImageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }
    
    // 获取可用的图片列表
    async function getAvailableImages() {
        const availableImages = [];
        
        // 检查预定义的图片文件
        for (const fileName of imageFiles) {
            const imageUrl = imageFolder + fileName;
            const exists = await checkImageExists(imageUrl);
            if (exists) {
                availableImages.push(imageUrl);
            }
        }
        
        // 如果没有找到预定义的图片，尝试一些常见的文件名
        if (availableImages.length === 0) {
            const commonNames = [
                'background.jpg', 'background.png', 'bg.jpg', 'bg.png',
                'wallpaper.jpg', 'wallpaper.png', 'cover.jpg', 'cover.png'
            ];
            
            for (const fileName of commonNames) {
                const imageUrl = imageFolder + fileName;
                const exists = await checkImageExists(imageUrl);
                if (exists) {
                    availableImages.push(imageUrl);
                }
            }
        }
        
        return availableImages;
    }
    
    // 设置背景图片
    async function setBackground() {
        const availableImages = await getAvailableImages();
        
        if (availableImages.length === 0) {
            console.log('没有找到可用的背景图片');
            return;
        }
        
        // 随机选择一张图片
        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const selectedImage = availableImages[randomIndex];
        
        console.log('选择的背景图片:', selectedImage);
        
        // 设置背景图片
        document.body.style.backgroundImage = `url('${selectedImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        
        // 添加一些样式以确保内容可读性
        document.body.style.minHeight = '100vh';
    }
    
    setBackground();
}

// 页面加载完成后设置随机背景
document.addEventListener('DOMContentLoaded', function() {
    setRandomBackground();
});

// 可选：添加一个按钮来手动切换背景
function addBackgroundToggleButton() {
    const button = document.createElement('button');
    button.textContent = '切换背景';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 10px 15px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;
    
    button.addEventListener('click', setRandomBackground);
    document.body.appendChild(button);
}

// 如果需要切换按钮，取消注释下面这行
// document.addEventListener('DOMContentLoaded', addBackgroundToggleButton);
