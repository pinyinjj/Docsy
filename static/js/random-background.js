// 随机背景功能
function setRandomBackground() {
    // 背景图片数组 - 您可以根据实际图片文件添加更多
    const backgroundImages = [
        '/images/default_img.png',
        // 可以在这里添加更多图片路径
        // '/images/background1.jpg',
        // '/images/background2.jpg',
        // '/images/background3.jpg'
    ];
    
    // 随机选择一张图片
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const selectedImage = backgroundImages[randomIndex];
    
    // 设置背景图片
    document.body.style.backgroundImage = `url('${selectedImage}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    
    // 添加一些样式以确保内容可读性
    document.body.style.minHeight = '100vh';
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
