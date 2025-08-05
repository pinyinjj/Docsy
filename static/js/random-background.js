// 随机背景功能
function setRandomBackground() {
    // 使用从Hugo模板生成的图片列表
    const imagePaths = window.availableImages || [
        '/Docsy/images/default_img.png',
        // 备用图片路径
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
        
        for (const path of imagePaths) {
            const exists = await checkImageExists(path);
            if (exists) {
                availableImages.push(path);
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
