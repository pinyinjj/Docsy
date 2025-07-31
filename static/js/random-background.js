// 随机背景图片功能
(function() {
    'use strict';
    
    // Wallhaven图片列表 - 你可以添加更多图片
    const wallhavenImages = [
        'https://w.wallhaven.cc/full/3q/wallhaven-3q9qky.png',

    ];
    
    // 从数组中随机选择一张图片
    function getRandomImage() {
        const randomIndex = Math.floor(Math.random() * wallhavenImages.length);
        return wallhavenImages[randomIndex];
    }
    
    // 设置背景图片
    function setRandomBackground() {
        const coverBlock = document.querySelector('.td-cover-block');
        if (coverBlock) {
            const randomImage = getRandomImage();
            coverBlock.style.backgroundImage = `url('${randomImage}')`;
            console.log('设置随机背景图片:', randomImage);
        }
    }
    
    // 页面加载完成后设置随机背景
    document.addEventListener('DOMContentLoaded', function() {
        setRandomBackground();
    });
    
    // 如果页面已经加载完成，立即设置
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setRandomBackground);
    } else {
        setRandomBackground();
    }
})(); 