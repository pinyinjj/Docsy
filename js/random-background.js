(function() {
    'use strict';

    if (window.RandomBackgroundInitialized) return;
    window.RandomBackgroundInitialized = true;

    // 获取本地Animated WebP图片列表
    function getLocalImageList() {
        const imageFolder = '/Docsy/images/backgrounds/';
        const totalImages = 15;
        const imageFiles = [];
        for (let i = 1; i <= totalImages; i++) {
            imageFiles.push(`bg${i}.webp`);
        }
        return imageFiles.map(filename => imageFolder + filename);
    }

    // 随机选择一张图片并设置为背景
    function setRandomBackground() {
        const images = getLocalImageList();
        if (images.length === 0) return false;
        const selectedImage = images[Math.floor(Math.random() * images.length)];
        
        // 优先选择封面块，然后是博客页面，最后是body
        const targetElement = document.querySelector('.td-cover-block') || document.body;

        targetElement.style.setProperty('background-image', `url('${selectedImage}')`, 'important');
        targetElement.style.setProperty('background-size', 'cover', 'important');
        targetElement.style.setProperty('background-position', 'center', 'important');
        targetElement.style.setProperty('background-repeat', 'no-repeat', 'important');
        targetElement.style.setProperty('background-attachment', 'fixed', 'important');

        return true;
    }

    // 初始化
    function initialize() {
        setRandomBackground();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
