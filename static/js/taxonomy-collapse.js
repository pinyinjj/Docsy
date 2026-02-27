/**
 * Taxonomy and Sidebar Collapse/Expand Functionality
 * 现代化的标签、分类及侧边栏文件夹折叠/展开功能
 */

(function() {
    'use strict';

    function initTaxonomyCollapse() {
        // 1. 查找右侧侧边栏的 taxonomy cloud 容器
        const taxonomyClouds = document.querySelectorAll('.taxonomy-terms-cloud');
        
        // 2. 查找左侧侧边栏中的子分类部分
        // Docsy 的侧边栏结构中，有子项的分类会带有 .with-child 类
        const sidebarSections = document.querySelectorAll('.td-sidebar-nav__section.with-child');
        
        // 合并容器进行统一处理
        const containers = [...taxonomyClouds, ...sidebarSections];
        
        containers.forEach(function(container) {
            // 跳过已初始化的
            if (container.dataset.initialized === 'true') {
                return;
            }
            
            let title = null;
            let contentList = null;
            let isSidebar = container.classList.contains('td-sidebar-nav__section');

            if (isSidebar) {
                // 左侧侧边栏逻辑：container 本身就是带有 with-child 的 li
                // 标题是该 li 下直接的 a 标签，列表是该 li 下直接的 ul
                title = container.querySelector(':scope > a');
                contentList = container.querySelector(':scope > ul');
                
                // 排除顶层的 "Blog" 根节点 (tree-root)
                if (!title || !contentList || title.classList.contains('tree-root')) {
                    return;
                }
            } else {
                // 右侧标签云逻辑
                title = container.querySelector('.taxonomy-title');
                contentList = container.querySelector('.taxonomy-terms');
                
                if (!title) {
                    title = document.createElement('h5');
                    title.className = 'taxonomy-title';
                    title.textContent = container.classList.contains('taxo-tags') ? 'Tags' : 
                                      (container.classList.contains('taxo-categories') ? 'Categories' : 'Taxonomy');
                    container.insertBefore(title, container.firstElementChild);
                }
            }

            if (!title || !contentList) return;
            
            // 标记初始化
            container.dataset.initialized = 'true';
            
            // 添加箭头按钮
            if (!title.querySelector('.taxonomy-toggle-arrow')) {
                const arrowButton = document.createElement('button');
                arrowButton.className = 'taxonomy-toggle-arrow';
                arrowButton.setAttribute('aria-label', 'Toggle section');
                
                const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                arrowSvg.setAttribute('width', '14');
                arrowSvg.setAttribute('height', '14');
                arrowSvg.setAttribute('viewBox', '0 0 16 16');
                arrowSvg.setAttribute('fill', 'none');
                arrowSvg.setAttribute('stroke', 'currentColor');
                arrowSvg.setAttribute('stroke-width', '2.5');
                arrowSvg.setAttribute('stroke-linecap', 'round');
                arrowSvg.setAttribute('stroke-linejoin', 'round');
                
                const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrowPath.setAttribute('d', 'M4 6 L8 10 L12 6');
                arrowSvg.appendChild(arrowPath);
                arrowButton.appendChild(arrowSvg);
                title.appendChild(arrowButton);
            }

            const arrowButton = title.querySelector('.taxonomy-toggle-arrow');
            title.classList.add('taxonomy-title-clickable');
            
            // 绑定点击事件
            function toggleContainer(e) {
                // 如果点击的是链接文本本身
                if (e.target.closest('a') === title || e.target === title) {
                    // 如果该分类下有子项，则拦截跳转并切换收纳
                    if (contentList && contentList.children.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                    } else {
                        return; // 如果没有子项，则允许正常跳转
                    }
                } else if (e.target.closest('.taxonomy-toggle-arrow')) {
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    // 点击了标题区域的其他位置
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                if (container.dataset.animating === 'true') return;
                
                if (container.classList.contains('taxonomy-collapsed')) {
                    expandContainer(container, contentList, arrowButton);
                } else {
                    collapseContainer(container, contentList, arrowButton);
                }
            }

            // 监听标题点击
            title.addEventListener('click', toggleContainer);

            // 初始状态逻辑
            const hasActiveChild = container.querySelector('.active') !== null || container.querySelector('.td-sidebar-nav-active-item') !== null;
            const isSinglePage = document.body.classList.contains('td-page') && !document.querySelector('.blog-page');
            
            // 默认收起逻辑：
            // 1. 如果包含激活项（当前文章所属分类），必须展开
            // 2. 如果是详情页（single），右侧 tags/cats 默认收起
            // 3. 只有在列表页且不是侧边栏时，才默认展开
            if (hasActiveChild) {
                container.classList.add('taxonomy-expanded');
                if (arrowButton) arrowButton.classList.add('expanded');
                contentList.style.display = 'block';
            } else if (!isSidebar && !isSinglePage) {
                // 仅在非详情页的右侧云默认展开
                container.classList.add('taxonomy-expanded');
                if (arrowButton) arrowButton.classList.add('expanded');
                contentList.style.display = 'block';
            } else {
                container.classList.add('taxonomy-collapsed');
                if (arrowButton) arrowButton.classList.remove('expanded');
                contentList.style.display = 'none';
            }

            // 右侧标签云额外排序
            if (!isSidebar) sortTermsByCount(contentList);
        });
    }

    function expandContainer(container, list, arrow) {
        if (container.dataset.animating === 'true') return;
        container.dataset.animating = 'true';
        container.classList.remove('taxonomy-collapsed');
        container.classList.add('taxonomy-expanded');
        list.style.display = 'block';
        const height = list.scrollHeight;
        list.style.maxHeight = '0px';
        list.style.opacity = '0';
        list.style.overflow = 'hidden';
        void list.offsetHeight;
        list.style.transition = 'max-height 0.4s ease-out, opacity 0.4s ease-out';
        list.style.maxHeight = height + 'px';
        list.style.opacity = '1';
        if (arrow) arrow.classList.add('expanded');
        setTimeout(() => {
            list.style.maxHeight = '';
            list.style.overflow = '';
            container.dataset.animating = 'false';
        }, 420);
    }

    function collapseContainer(container, list, arrow) {
        if (container.dataset.animating === 'true') return;
        container.dataset.animating = 'true';
        list.style.maxHeight = list.scrollHeight + 'px';
        list.style.overflow = 'hidden';
        void list.offsetHeight;
        list.style.transition = 'max-height 0.4s ease-in, opacity 0.4s ease-in';
        list.style.maxHeight = '0px';
        list.style.opacity = '0';
        if (arrow) arrow.classList.remove('expanded');
        setTimeout(() => {
            list.style.display = 'none';
            list.style.maxHeight = '';
            list.style.opacity = '';
            container.classList.remove('taxonomy-expanded');
            container.classList.add('taxonomy-collapsed');
            container.dataset.animating = 'false';
        }, 420);
    }
    
    function sortTermsByCount(list) {
        const terms = Array.from(list.children);
        if (terms.length <= 1) return;
        terms.sort((a, b) => {
            const countA = parseInt(a.querySelector('.taxonomy-count')?.textContent || '0');
            const countB = parseInt(b.querySelector('.taxonomy-count')?.textContent || '0');
            return countB - countA;
        });
        terms.forEach(term => list.appendChild(term));
    }

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTaxonomyCollapse);
    } else {
        initTaxonomyCollapse();
    }

    // 使用MutationObserver监听动态内容
    const observer = new MutationObserver(function(mutations) {
        let shouldInit = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.classList && (node.classList.contains('taxonomy-terms-cloud') || node.classList.contains('td-sidebar-nav__section'))) {
                            shouldInit = true;
                        } else if (node.querySelector && (node.querySelector('.taxonomy-terms-cloud') || node.querySelector('.td-sidebar-nav__section'))) {
                            shouldInit = true;
                        }
                    }
                });
            }
        });
        if (shouldInit) initTaxonomyCollapse();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
