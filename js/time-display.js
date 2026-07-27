// 时间显示功能
function createTimeDisplay() {
    // 检查是否已经存在时间显示元素
    if (document.getElementById('time-display')) {
        return; // 如果已存在，不重复创建
    }

    // 创建时间显示元素
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-display';
    
    // 使用简单的样式设置
    timeDisplay.style.position = 'absolute';
    timeDisplay.style.bottom = '20px';
    timeDisplay.style.right = '20px';
    timeDisplay.style.color = 'rgba(255, 255, 255, 0.2)';
    timeDisplay.style.padding = '10px 15px';
    timeDisplay.style.fontFamily = "'Playwrite PL', sans-serif";
    timeDisplay.style.setProperty('font-family', "'Playwrite PL', sans-serif", 'important');
    timeDisplay.style.fontSize = '14px';
    timeDisplay.style.fontWeight = '300';
    timeDisplay.style.zIndex = '9999';
    timeDisplay.style.textAlign = 'right';
    timeDisplay.style.lineHeight = '1.8';
    timeDisplay.style.pointerEvents = 'none';
    timeDisplay.style.transition = 'opacity 0.3s ease';
    timeDisplay.style.backgroundColor = 'transparent';
    timeDisplay.style.border = 'none';
    timeDisplay.style.outline = 'none';
    timeDisplay.style.boxShadow = 'none';

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
        timeDisplay.innerHTML = `${hours}:${minutes}<div style="font-size: 12px; margin-top: 2px;">${month}/${day}/${year}</div>`;
    }

    // 初始更新时间
    updateTime();
    
    // 每秒更新时间
    setInterval(updateTime, 1000);
    
    // 添加到页面
    const coverBlock = document.querySelector('.td-cover-block');
    if (coverBlock) {
        coverBlock.appendChild(timeDisplay);
    } else {
        document.body.appendChild(timeDisplay);
    }
}

// 页面加载完成后创建时间显示
document.addEventListener('DOMContentLoaded', createTimeDisplay); 