(function() {
    'use strict';

    if (window.CustomScrollbarInitialized) return;
    window.CustomScrollbarInitialized = true;

    // 创建自定义滚动条样式
    function injectScrollbarStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 自定义滚动条样式 - Webkit浏览器 (Chrome, Safari, Edge) */
            * {
                scrollbar-width: thin; /* Firefox */
                scrollbar-color: rgba(155, 155, 155, 0.5) transparent; /* Firefox */
            }

            *::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            *::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 10px;
            }

            *::-webkit-scrollbar-thumb {
                background: rgba(155, 155, 155, 0.5);
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: padding-box;
                transition: background 0.3s ease;
            }

            *::-webkit-scrollbar-thumb:hover {
                background: rgba(155, 155, 155, 0.8);
                background-clip: padding-box;
            }

            *::-webkit-scrollbar-thumb:active {
                background: rgba(100, 100, 100, 0.9);
                background-clip: padding-box;
            }

            /* 为特定元素定制滚动条 */
            body {
                scrollbar-width: thin;
                scrollbar-color: rgba(100, 150, 200, 0.6) transparent;
            }

            body::-webkit-scrollbar {
                width: 12px;
            }

            body::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(100, 150, 200, 0.6), rgba(100, 150, 200, 0.4));
                border-radius: 10px;
            }

            body::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(100, 150, 200, 0.8), rgba(100, 150, 200, 0.6));
            }

            /* 平滑滚动 */
            html {
                scroll-behavior: smooth;
            }

            /* 针对代码块的滚动条 */
            pre, code {
                scrollbar-width: thin;
                scrollbar-color: rgba(200, 200, 200, 0.5) transparent;
            }

            pre::-webkit-scrollbar,
            code::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            pre::-webkit-scrollbar-thumb,
            code::-webkit-scrollbar-thumb {
                background: rgba(200, 200, 200, 0.5);
                border-radius: 4px;
            }

            pre::-webkit-scrollbar-thumb:hover,
            code::-webkit-scrollbar-thumb:hover {
                background: rgba(200, 200, 200, 0.8);
            }

            /* 彻底删除左侧侧边栏各级容器的原有滚动条显示，并取消容器内边距以允许元素填满宽度 */
            .td-sidebar,
            .td-sidebar__inner,
            .td-sidebar-nav,
            .td-sidebar-nav__section.ul-0 {
                overflow: hidden !important;
                -ms-overflow-style: none;
                scrollbar-width: none;
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }
            
            .td-sidebar::-webkit-scrollbar,
            .td-sidebar__inner::-webkit-scrollbar,
            .td-sidebar-nav::-webkit-scrollbar,
            .td-sidebar-nav__section.ul-0::-webkit-scrollbar {
                display: none !important;
            }

            /* 仅保留我们自定义的、位于标题下方的分类列表滚动条 */
            .td-sidebar-nav .ul-1 {
                scrollbar-width: thin;
                scrollbar-color: rgba(150, 150, 150, 0.4) transparent;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                max-height: calc(100vh - 160px); 
                width: 100% !important;
                padding-top: 5px !important;    /* 增加顶部边距，防止首项悬停效果被截断 */
                padding-bottom: 5px !important; /* 增加底部边距，保持对称 */
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin: 0 !important;
            }

            /* 将 0.8rem 的间距应用到具体的链接元素上，并为文字增加一点点左侧偏移，同时取消加粗 */
            .td-sidebar-link {
                width: 100% !important;
                display: flex !important;
                align-items: center;
                padding-top: 0.3rem !important;    /* 增加垂直内边距，确保悬停背景完整 */
                padding-bottom: 0.3rem !important;
                padding-left: 0.8rem !important;
                padding-right: 0.8rem !important;
                box-sizing: border-box;
                font-weight: normal !important; /* 强制取消加粗 */
            }

            /* 特别为分类标题（带有收纳箭头的）增加左侧微调，使其看起来像 " ROS" */
            .td-sidebar-link.taxonomy-title-clickable span {
                margin-left: 0.3rem; 
            }

            /* 针对嵌套列表 ul-2 及其项，增加左侧缩进以体现层级 */
            .td-sidebar-nav .ul-2 {
                padding-left: 1rem !important;
                width: 100% !important;
            }

            .td-sidebar-nav .ul-2 .td-sidebar-link {
                /* 嵌套链接需要扣除父级的缩进，保持视觉一致 */
                padding-left: 0.8rem !important;
            }

            .td-sidebar-nav .ul-1::-webkit-scrollbar {
                width: 6px;
            }

            .td-sidebar-nav .ul-1::-webkit-scrollbar-track {
                background: transparent;
            }

            .td-sidebar-nav .ul-1::-webkit-scrollbar-thumb {
                background: rgba(150, 150, 150, 0.4);
                border-radius: 3px;
            }

            .td-sidebar-nav .ul-1::-webkit-scrollbar-thumb:hover {
                background: rgba(150, 150, 150, 0.6);
            }

            /* 右侧 TOC 保持原样 */
            .td-sidebar-toc {
                scrollbar-width: thin;
                scrollbar-color: rgba(150, 150, 150, 0.4) transparent;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .td-sidebar-toc::-webkit-scrollbar {
                width: 6px;
            }

            .td-sidebar-toc::-webkit-scrollbar-thumb {
                background: rgba(150, 150, 150, 0.4);
                border-radius: 3px;
            }

            /* 内部容器恢复原有布局，不再强制移除 padding */
            .td-sidebar__inner {
                width: 100%;
            }

            /* 响应式：移动设备上使用更细的滚动条 */
            @media (max-width: 768px) {
                *::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                body::-webkit-scrollbar {
                    width: 8px;
                }
            }

            /* 暗色模式支持（可选） */
            @media (prefers-color-scheme: dark) {
                * {
                    scrollbar-color: rgba(100, 100, 100, 0.6) transparent;
                }

                *::-webkit-scrollbar-thumb {
                    background: rgba(100, 100, 100, 0.6);
                }

                *::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 100, 100, 0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加平滑滚动行为增强
    function enhanceScrollBehavior() {
        // 为所有锚点链接添加平滑滚动
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href !== '') {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });

        // 监听滚动事件，可以在这里添加滚动指示器等效果
        let scrollTimer = null;
        window.addEventListener('scroll', function() {
            // 可以添加滚动进度条或其他效果
            if (scrollTimer !== null) {
                clearTimeout(scrollTimer);
            }
            scrollTimer = setTimeout(function() {
                // 滚动结束后的操作
            }, 150);
        }, false);
    }

    // 初始化
    function initialize() {
        injectScrollbarStyles();
        enhanceScrollBehavior();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

