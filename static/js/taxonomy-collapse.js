/**
 * Taxonomy Collapse/Expand Functionality
 * 现代化的标签和分类折叠/展开功能
 * 点击箭头按钮展开/收起tags和categories
 */

(function() {
    'use strict';

    function initTaxonomyCollapse() {
        // 查找所有taxonomy cloud容器
        const taxonomyClouds = document.querySelectorAll('.taxonomy-terms-cloud');
        
        taxonomyClouds.forEach(function(cloud) {
            // 跳过已初始化的
            if (cloud.dataset.initialized === 'true') {
                return;
            }
            
            // 标记为已初始化
            cloud.dataset.initialized = 'true';
            
            // 获取或创建title元素
            let title = cloud.querySelector('.taxonomy-title');
            if (!title) {
                title = document.createElement('h5');
                title.className = 'taxonomy-title';
                // 根据容器类型设置标题
                if (cloud.classList.contains('taxo-tags')) {
                    title.textContent = 'Tag Cloud';
                } else if (cloud.classList.contains('taxo-categories')) {
                    title.textContent = 'Categories';
                } else {
                    title.textContent = 'Taxonomy';
                }
                // 将标题插入到terms列表之前
                const firstChild = cloud.firstElementChild;
                if (firstChild && firstChild.classList.contains('taxonomy-terms')) {
                    cloud.insertBefore(title, firstChild);
                } else {
                    cloud.prepend(title);
                }
            }
            
            // 检查是否已经添加了箭头按钮
            if (title.querySelector('.taxonomy-toggle-arrow')) {
                return;
            }
            
            // 获取terms列表元素
            const termsList = cloud.querySelector('.taxonomy-terms');
            if (!termsList) {
                return;
            }
            
            // 创建箭头按钮
            const arrowButton = document.createElement('button');
            arrowButton.className = 'taxonomy-toggle-arrow';
            arrowButton.setAttribute('aria-label', 'Toggle taxonomy');
            arrowButton.setAttribute('aria-expanded', 'false');
            
            // 创建箭头图标 (使用SVG)
            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('width', '16');
            arrowSvg.setAttribute('height', '16');
            arrowSvg.setAttribute('viewBox', '0 0 16 16');
            arrowSvg.setAttribute('fill', 'none');
            arrowSvg.setAttribute('stroke', 'currentColor');
            arrowSvg.setAttribute('stroke-width', '2');
            arrowSvg.setAttribute('stroke-linecap', 'round');
            arrowSvg.setAttribute('stroke-linejoin', 'round');
            
            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            // 箭头默认向下（表示可以展开）
            arrowPath.setAttribute('d', 'M4 6 L8 10 L12 6');
            arrowSvg.appendChild(arrowPath);
            
            arrowButton.appendChild(arrowSvg);
            
            // 将箭头按钮插入到title中（作为最后一个子元素）
            title.appendChild(arrowButton);

            // 让标题本身也成为点击区域（除箭头按钮外）
            title.setAttribute('role', 'button');
            title.setAttribute('tabindex', '0');
            title.classList.add('taxonomy-title-clickable');

            function toggleCloud(e) {
                if (e) e.preventDefault();
                if (cloud.dataset.animating === 'true') return;
                const isCollapsed = cloud.classList.contains('taxonomy-collapsed');
                if (isCollapsed) {
                    expandTaxonomy(cloud, termsList, arrowButton);
                } else {
                    collapseTaxonomy(cloud, termsList, arrowButton);
                }
            }

            title.addEventListener('click', function(e) {
                if (e.target.closest('.taxonomy-toggle-arrow')) return;
                toggleCloud(e);
            });
            title.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    toggleCloud(e);
                }
            });

            // 初始状态：收起（不占用空间）
            cloud.classList.add('taxonomy-collapsed');
            termsList.style.display = 'none';

            // 排序：按数量从高到低排序
            sortTermsByCount(termsList);

            // 点击箭头按钮切换展开/收起
            arrowButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleCloud(e);
            });
        });
    }
    
    /**
     * 展开taxonomy
     */
    function expandTaxonomy(cloud, termsList, arrowButton) {
        if (cloud.dataset.animating === 'true') return;
        cloud.dataset.animating = 'true';
        // 移除收起状态
        cloud.classList.remove('taxonomy-collapsed');
        cloud.classList.add('taxonomy-expanded');
        
        // 显示列表
        termsList.style.display = 'block';
        
        // 获取实际高度
        const actualHeight = termsList.scrollHeight;
        
        // 设置初始高度为0，然后动画到实际高度
        termsList.style.maxHeight = '0px';
        termsList.style.opacity = '0';
        termsList.style.overflow = 'hidden';
        
        // 强制重排
        void termsList.offsetHeight;
        
        // 触发展开动画
        requestAnimationFrame(function() {
            termsList.style.transition = 'max-height 0.4s ease-out, opacity 0.4s ease-out';
            termsList.style.maxHeight = actualHeight + 'px';
            termsList.style.opacity = '1';
        });
        
        // 更新箭头方向
        arrowButton.setAttribute('aria-expanded', 'true');
        arrowButton.classList.add('expanded');
        
        // 动画完成后清理
        setTimeout(function() {
            termsList.style.maxHeight = '';
            termsList.style.overflow = '';
            cloud.dataset.animating = 'false';
        }, 420);
    }
    
    /**
     * 收起taxonomy
     */
    function collapseTaxonomy(cloud, termsList, arrowButton) {
        if (cloud.dataset.animating === 'true') return;
        cloud.dataset.animating = 'true';
        // 标记正在收起，但不要立刻添加 collapsed 类，避免样式覆盖动画
        cloud.classList.remove('taxonomy-expanded');
        
        // 获取当前高度
        const currentHeight = termsList.scrollHeight;
        
        // 设置当前高度
        termsList.style.maxHeight = currentHeight + 'px';
        termsList.style.overflow = 'hidden';
        
        // 强制重排
        void termsList.offsetHeight;
        
        // 触发收起动画
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                termsList.style.transition = 'max-height 0.4s ease-in, opacity 0.4s ease-in';
                termsList.style.maxHeight = '0px';
                termsList.style.opacity = '0';
                
                // 动画完成后隐藏
                setTimeout(function() {
                    termsList.style.display = 'none';
                    termsList.style.maxHeight = '';
                    termsList.style.opacity = '';
                    termsList.style.overflow = '';
                    // 动画结束后再真正进入 collapsed 状态
                    cloud.classList.add('taxonomy-collapsed');
                    cloud.dataset.animating = 'false';
                }, 420);
            });
        });
        
        // 更新箭头方向
        arrowButton.setAttribute('aria-expanded', 'false');
        arrowButton.classList.remove('expanded');
    }
    
    /**
     * 按数量排序terms（从高到低）
     */
    function sortTermsByCount(termsList) {
        const terms = Array.from(termsList.children);
        
        // 提取每个term的count并排序
        terms.sort(function(a, b) {
            const countA = parseInt(a.querySelector('.taxonomy-count')?.textContent || '0');
            const countB = parseInt(b.querySelector('.taxonomy-count')?.textContent || '0');
            
            // 从高到低排序
            return countB - countA;
        });
        
        // 重新插入排序后的terms
        terms.forEach(function(term) {
            termsList.appendChild(term);
        });
    }

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTaxonomyCollapse);
    } else {
        // DOM已经加载完成
        initTaxonomyCollapse();
    }

    // 使用MutationObserver监听动态添加的taxonomy clouds
    const observer = new MutationObserver(function(mutations) {
        let shouldInit = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('taxonomy-terms-cloud')) {
                            shouldInit = true;
                        } else if (node.querySelector && node.querySelector('.taxonomy-terms-cloud')) {
                            shouldInit = true;
                        }
                    }
                });
            }
        });
        
        if (shouldInit) {
            initTaxonomyCollapse();
        }
    });

    // 开始监听
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();

