/**
 * Adjust the line-clamp of blog post and collection descriptions based on the title height.
 * If the title is only one line, the description should show more lines.
 */
(function() {
    function adjustBlogCards() {
        // 1. Handle main blog post cards
        const postCards = document.querySelectorAll('.blog-post-item');
        postCards.forEach(card => {
            const title = card.querySelector('h3');
            const desc = card.querySelector('p');
            
            if (title && desc) {
                const titleHeight = title.offsetHeight;
                // Threshold based on 1.4rem title font size
                if (titleHeight < 40) {
                    desc.style.webkitLineClamp = '5';
                } else {
                    desc.style.webkitLineClamp = '4';
                }
            }
        });

        // 2. Handle blog collection/category cards
        const collectionCards = document.querySelectorAll('.blog-collection-card');
        collectionCards.forEach(card => {
            const title = card.querySelector('.blog-collection-title');
            const desc = card.querySelector('.blog-collection-description');
            
            if (title && desc) {
                const titleHeight = title.offsetHeight;
                // Collection titles have different font size (h5 usually ~1.25rem)
                // Threshold ~35px for 1 line
                if (titleHeight < 35) {
                    desc.style.webkitLineClamp = '4'; // Increase from default 3 to 4 if title is 1 line
                } else {
                    desc.style.webkitLineClamp = '3';
                }
            }
        });
    }

    // Run on load
    window.addEventListener('DOMContentLoaded', adjustBlogCards);
    // Run on window resize as title might wrap
    window.addEventListener('resize', adjustBlogCards);
    
    // Also run immediately if script is loaded after DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        adjustBlogCards();
    }
})();
