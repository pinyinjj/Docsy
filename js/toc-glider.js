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
  var lockedLink = null;
  var lockTimer = null;

  function updateGlider() {
    // NEVER update glider during hover or click-lock - it should be frozen
    if (isHovering || lockedLink) return;
    
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
        // Determine level by counting parent ULs
        var level = 0;
        var p = link.parentElement;
        while (p && p.id !== 'TableOfContents') {
          if (p.tagName === 'UL') level++;
          p = p.parentElement;
        }
        items.push({ link: link, heading: heading, level: level });
      }
    });
    return items;
  }

  // Determine active heading by scroll position and update ToC active class
  function setActiveByScroll(tocItems, offset) {
    if (isHovering || lockedLink) return;
    if (!tocItems || tocItems.length === 0) return;

    var topThreshold = offset || 0;
    var quarterThreshold = window.innerHeight * 0.25;
    var middleThreshold = window.innerHeight * 0.5;
    
    var minLevel = 99;
    for (var k = 0; k < tocItems.length; k++) {
      if (tocItems[k].level < minLevel) minLevel = tocItems[k].level;
    }

    var activeIndex = 0;

    for (var i = 0; i < tocItems.length; i++) {
      var item = tocItems[i];
      var rect = item.heading.getBoundingClientRect();
      var isTopLevel = item.level <= minLevel;
      
      // 1. Is this heading already "Gone" (scrolled past the navbar)?
      // We use a -20px buffer to ensure the title is well hidden before switching.
      var isGone = rect.top < topThreshold - 20;
      
      if (isGone) {
        // If it's gone, it's the current best activeIndex, but we keep looking 
        // to see if the NEXT one is also gone or ready to activate.
        activeIndex = i;
        continue;
      }
      
      // 2. This is the FIRST heading that is still visible or just arriving.
      // It is the ONLY candidate that can claim the glider now.
      var threshold = isTopLevel ? middleThreshold : quarterThreshold;
      
      if (rect.top <= threshold) {
        // It reached its trigger line, it becomes active.
        activeIndex = i;
      } else {
        // It hasn't reached its trigger line yet.
        // The glider will stay on the previous heading (already set in activeIndex).
      }
      
      // 3. CRITICAL: Once we've handled the "Front Line" heading, we STOP.
      // This prevents further headings (like 2.2) from activating while 2.1 is still the primary focus.
      break;
    }

    var current = tocItems[activeIndex];

    // Update classes
    selectAll('.td-page.td-blog .td-toc #TableOfContents a.active').forEach(function (a) { a.classList.remove('active'); });
    if (current && current.link) {
      current.link.classList.add('active');
    }
  }

  function onScrollSpyActivate() {
    if (lockedLink) return;
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

    // Add click listeners to ToC links to "lock" the glider
    selectAll('.td-page.td-blog .td-toc #TableOfContents a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (lockTimer) window.clearTimeout(lockTimer);
        lockedLink = link;

        // Force active class and update glider immediately
        selectAll('.td-page.td-blog .td-toc #TableOfContents a.active').forEach(function (a) { 
          a.classList.remove('active'); 
        });
        link.classList.add('active');
        
        moveGliderToLink(link, false);

        // Release lock after scroll completes (approx 1s)
        lockTimer = window.setTimeout(function () {
          lockedLink = null;
        }, 1000);
      });
    });

    // Set initial active by scroll and position glider
    setActiveByScroll(tocItems, headerOffset);
    updateGlider();

    // Bootstrap ScrollSpy event (ignored while hovering)
    document.addEventListener('activate.bs.scrollspy', function (e) {
      if (isHovering || lockedLink) return;
      onScrollSpyActivate(e);
    });

    // Fallback: watch class changes within ToC
    var tocNav = select('.td-page.td-blog .td-toc #TableOfContents');
    if (tocNav && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (isHovering || lockedLink) return;
        updateGlider();
      });
      observer.observe(tocNav, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
    }

    // Also update on scroll to keep glider responsive even if ScrollSpy doesn't emit yet
    window.addEventListener('scroll', function () {
      if (isHovering || lockedLink) return;
      window.requestAnimationFrame(function () {
        setActiveByScroll(tocItems, headerOffset);
        updateGlider();
      });
    }, { passive: true });

    // Update on resize to keep alignment
    window.addEventListener('resize', function () {
      if (isHovering || lockedLink) return;
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


