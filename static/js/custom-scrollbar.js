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

            /* 侧边栏滚动条 */
            .td-sidebar,
            .td-sidebar-toc {
                scrollbar-width: thin;
                scrollbar-color: rgba(150, 150, 150, 0.4) transparent;
            }

            .td-sidebar::-webkit-scrollbar,
            .td-sidebar-toc::-webkit-scrollbar {
                width: 6px;
            }

            .td-sidebar::-webkit-scrollbar-thumb,
            .td-sidebar-toc::-webkit-scrollbar-thumb {
                background: rgba(150, 150, 150, 0.4);
                border-radius: 3px;
            }

            .td-sidebar::-webkit-scrollbar-thumb:hover,
            .td-sidebar-toc::-webkit-scrollbar-thumb:hover {
                background: rgba(150, 150, 150, 0.6);
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

