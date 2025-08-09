// 时间显示功能
function createTimeDisplay() {
    // 创建时间显示元素
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-display';
    timeDisplay.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        color: rgba(255, 255, 255, 0.2);
        padding: 10px 15px;
        font-family: 'Playwrite PL', sans-serif;
        font-size: 14px;
        font-weight: 300;
        z-index: 1000;
        text-align: right;
        line-height: 1.8;
    `;

    // 更新时间函数
    function updateTime() {
        const now = new Date();
        const month = (now.getMonth() + 1);
        const day = now.getDate();
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        // 使用数字格式显示日期，时间和日期分两行显示
        timeDisplay.innerHTML = `${hours}:${minutes}<div style="font-size: 12px;">${month}/${day}/${year}</div>`;
    }

    // 初始更新时间
    updateTime();
    
    // 每秒更新时间
    setInterval(updateTime, 1000);
    
    // 添加到 cover 区块
    const coverBlock = document.querySelector('.td-cover-block');
    if (coverBlock) {
        coverBlock.appendChild(timeDisplay);
    } else {
        // 如果找不到 cover 区块，则添加到 body
        document.body.appendChild(timeDisplay);
    }
}

// 页面加载完成后创建时间显示
document.addEventListener('DOMContentLoaded', createTimeDisplay); 