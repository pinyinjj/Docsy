// Glider follow effect for blog post right-side ToC
(function () {
  function select(selector, root) {
    return (root || document).querySelector(selector);
  }

  function selectAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function getActiveTocLink() {
    return (
      select('.td-page.td-blog .td-toc #TableOfContents a.active') ||
      select('.td-page.td-blog .td-toc #TableOfContents a[aria-current="true"]') ||
      select('.td-page.td-blog .td-toc #TableOfContents a')
    );
  }

  function ensureGlider(container) {
    var glider = select('.toc-glider', container);
    if (!glider) {
      glider = document.createElement('div');
      glider.className = 'toc-glider';
      container.appendChild(glider);
    }
    return glider;
  }

  function updateGlider() {
    var tocContainer = select('.td-page.td-blog .td-sidebar-toc .td-toc') || select('.td-page.td-blog .td-toc');
    var tocNav = select('#TableOfContents', tocContainer);
    if (!tocContainer || !tocNav) return;

    var active = getActiveTocLink();
    if (!active) return;

    var glider = ensureGlider(tocContainer);

    var containerRect = tocContainer.getBoundingClientRect();
    var activeRect = active.getBoundingClientRect();
    var offsetY = activeRect.top - containerRect.top + tocContainer.scrollTop;

    // Resize to match active link height
    glider.style.height = active.offsetHeight + 'px';
    // Move using translateY to keep transitions smooth
    glider.style.transform = 'translateY(' + offsetY + 'px)';
  }

  function onScrollSpyActivate() {
    // Debounce a bit to let classes settle
    window.requestAnimationFrame(updateGlider);
  }

  function init() {
    var isBlog = document.body && document.body.classList.contains('td-blog');
    if (!isBlog) return;

    // Initialize Bootstrap ScrollSpy if available (ensures activate events fire)
    try {
      var tocNav = select('.td-page.td-blog .td-toc #TableOfContents');
      var navbar = select('.td-navbar');
      var offset = 0;
      if (navbar) {
        var nbcr = navbar.getBoundingClientRect();
        offset = Math.max(0, nbcr.height || 0) + 8; // small buffer
      }
      if (window.bootstrap && window.bootstrap.ScrollSpy && tocNav) {
        // ScrollSpy attaches to document.body by default
        new window.bootstrap.ScrollSpy(document.body, {
          target: '#TableOfContents',
          offset: offset
        });
      }
    } catch (e) {
      // no-op
    }

    updateGlider();

    // Bootstrap ScrollSpy event
    document.addEventListener('activate.bs.scrollspy', onScrollSpyActivate);

    // Fallback: watch class changes within ToC
    var tocNav = select('.td-page.td-blog .td-toc #TableOfContents');
    if (tocNav && window.MutationObserver) {
      var observer = new MutationObserver(function () { updateGlider(); });
      observer.observe(tocNav, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
    }

    // Also update on scroll to keep glider responsive even if ScrollSpy doesn't emit yet
    window.addEventListener('scroll', function () { window.requestAnimationFrame(updateGlider); }, { passive: true });

    // Update on resize to keep alignment
    window.addEventListener('resize', updateGlider);
    // Update after images/fonts load affecting layout
    window.addEventListener('load', updateGlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


