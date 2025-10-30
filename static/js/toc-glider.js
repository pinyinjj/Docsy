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

  function moveGliderToLink(link, immediate) {
    var tocContainer = select('.td-page.td-blog .td-sidebar-toc .td-toc') || select('.td-page.td-blog .td-toc');
    if (!tocContainer || !link) return;
    var glider = ensureGlider(tocContainer);
    
    // Temporarily disable transition for immediate snap
    if (immediate) {
      glider.style.transition = 'none';
    }
    
    var containerRect = tocContainer.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var offsetY = linkRect.top - containerRect.top + tocContainer.scrollTop;
    glider.style.height = link.offsetHeight + 'px';
    glider.style.transform = 'translateY(' + offsetY + 'px)';
    
    // Re-enable transition after a frame
    if (immediate) {
      window.requestAnimationFrame(function() {
        glider.style.transition = '';
      });
    }
  }

  var hoveredLink = null;
  var isHovering = false;

  function updateGlider() {
    // NEVER update glider during hover - it should be frozen
    if (isHovering) return;
    
    var tocContainer = select('.td-page.td-blog .td-sidebar-toc .td-toc') || select('.td-page.td-blog .td-toc');
    var tocNav = select('#TableOfContents', tocContainer);
    if (!tocContainer || !tocNav) return;

    var link = getActiveTocLink();
    if (!link) return;

    var glider = ensureGlider(tocContainer);

    var containerRect = tocContainer.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var offsetY = linkRect.top - containerRect.top + tocContainer.scrollTop;

    // Resize to match active link height
    glider.style.height = link.offsetHeight + 'px';
    // Move using translateY to keep transitions smooth
    glider.style.transform = 'translateY(' + offsetY + 'px)';
  }

  // Build a map from ToC links to actual headings in the document
  function buildTocMap() {
    var links = selectAll('.td-page.td-blog .td-toc #TableOfContents a');
    var items = [];
    links.forEach(function (link) {
      var hash = link.getAttribute('href');
      if (!hash || hash.charAt(0) !== '#') return;
      var id = decodeURIComponent(hash.slice(1));
      var heading = document.getElementById(id);
      if (heading) {
        items.push({ link: link, heading: heading });
      }
    });
    return items;
  }

  // Determine active heading by scroll position and update ToC active class
  function setActiveByScroll(tocItems, offset) {
    if (isHovering) return;
    if (!tocItems || tocItems.length === 0) return;
    var scrollPos = window.pageYOffset || document.documentElement.scrollTop || 0;
    var threshold = scrollPos + (offset || 0) + 1; // +1 to bias to current section

    var current = tocItems[0];
    for (var i = 0; i < tocItems.length; i++) {
      var rect = tocItems[i].heading.getBoundingClientRect();
      var top = rect.top + scrollPos; // heading absolute top
      if (top <= threshold) {
        current = tocItems[i];
      } else {
        break;
      }
    }

    // Update classes
    selectAll('.td-page.td-blog .td-toc #TableOfContents a.active').forEach(function (a) { a.classList.remove('active'); });
    if (current && current.link) {
      current.link.classList.add('active');
    }
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

    // Precompute ToC map and header offset
    var tocItems = buildTocMap();
    var headerOffset = 0;
    var navbar = select('.td-navbar');
    if (navbar) {
      var nbcr2 = navbar.getBoundingClientRect();
      headerOffset = Math.max(0, nbcr2.height || 0) + 8;
    }

    // Set initial active by scroll and position glider
    setActiveByScroll(tocItems, headerOffset);
    updateGlider();

    // Bootstrap ScrollSpy event (ignored while hovering)
    document.addEventListener('activate.bs.scrollspy', function (e) {
      if (isHovering) return;
      onScrollSpyActivate(e);
    });

    // Fallback: watch class changes within ToC
    var tocNav = select('.td-page.td-blog .td-toc #TableOfContents');
    if (tocNav && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (isHovering) return;
        updateGlider();
      });
      observer.observe(tocNav, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
    }

    // Also update on scroll to keep glider responsive even if ScrollSpy doesn't emit yet
    window.addEventListener('scroll', function () {
      if (isHovering) return;
      window.requestAnimationFrame(function () {
        setActiveByScroll(tocItems, headerOffset);
        updateGlider();
      });
    }, { passive: true });

    // Update on resize to keep alignment
    window.addEventListener('resize', function () {
      if (isHovering) return;
      // Recalculate offset and positions on resize
      var nb = select('.td-navbar');
      if (nb) {
        var r = nb.getBoundingClientRect();
        headerOffset = Math.max(0, r.height || 0) + 8;
      }
      tocItems = buildTocMap();
      setActiveByScroll(tocItems, headerOffset);
      updateGlider();
    });
    // Update after images/fonts load affecting layout
    window.addEventListener('load', function () {
      tocItems = buildTocMap();
      setActiveByScroll(tocItems, headerOffset);
      updateGlider();
    });

    // Hover interactions: glider follows hovered link, then returns
    var tocContainer = select('.td-page.td-blog .td-sidebar-toc .td-toc') || select('.td-page.td-blog .td-toc');
    var hoverReturnTimer = null;
    if (tocContainer) {
      // Entering the ToC starts a hover session (freeze scroll-driven updates)
      tocContainer.addEventListener('mouseenter', function () {
        if (hoverReturnTimer) window.clearTimeout(hoverReturnTimer);
        isHovering = true;
        tocContainer.classList.add('is-hovering');
      }, true);

      // Attach per-link mouseenter to move the glider directly to that link
      selectAll('#TableOfContents a', tocContainer).forEach(function (linkEl) {
        linkEl.addEventListener('mouseenter', function () {
          if (!tocContainer.contains(linkEl)) return;
          hoveredLink = linkEl;
          moveGliderToLink(hoveredLink, true);
        }, true);
      });

      // Leaving the ToC ends the hover session and returns to scroll-active item
      tocContainer.addEventListener('mouseleave', function () {
        if (hoverReturnTimer) window.clearTimeout(hoverReturnTimer);
        hoverReturnTimer = window.setTimeout(function () {
          tocContainer.classList.remove('is-hovering');
          isHovering = false;
          hoveredLink = null;
          setActiveByScroll(tocItems, headerOffset);
          updateGlider();
        }, 80);
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


