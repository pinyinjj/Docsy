---
title: 关于我
linkTitle: 关于
menu: {main: {weight: 10}}
---

{{< blocks/cover image_anchor="top" height="full" >}}

<div class="contact-info-container">
  <div class="main">
    <div class="up">
      <div class="card1" data-value="miao23333QAQ" title="WeChat">
        <i class="fab fa-weixin"></i>
      </div>
      <div class="card2" data-value="914640123" title="QQ">
        <i class="fab fa-qq"></i>
      </div>
    </div>
    <div class="down">
      <div class="card3" data-value="https://github.com/pinyinjj" title="GitHub">
        <i class="fab fa-github"></i>
      </div>
      <div class="card4" data-value="workworkzed@gmail.com" title="Email">
        <i class="fab fa-google"></i>
      </div>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.card1, .card2, .card3, .card4');
  
  cards.forEach(card => {
    card.addEventListener('click', function() {
      const value = this.getAttribute('data-value');
      
      // Copy to clipboard
      navigator.clipboard.writeText(value).then(() => {
        // Create feedback tooltip
        const feedback = document.createElement('div');
        feedback.innerText = '已复制';
        feedback.style.position = 'absolute';
        feedback.style.top = '-40px';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        feedback.style.color = 'white';
        feedback.style.padding = '5px 10px';
        feedback.style.borderRadius = '20px';
        feedback.style.fontSize = '0.8rem';
        feedback.style.zIndex = '100';
        feedback.style.pointerEvents = 'none';
        feedback.style.whiteSpace = 'nowrap';
        feedback.style.animation = 'fadeOut 1.5s forwards';
        
        this.appendChild(feedback);
        
        // Remove feedback after animation
        setTimeout(() => {
          feedback.remove();
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  });
});

// Add fadeOut animation style
if (!document.getElementById('contact-style')) {
  const style = document.createElement('style');
  style.id = 'contact-style';
  style.textContent = `
  @keyframes fadeOut {
    0% { opacity: 0; transform: translate(-50%, 0); }
    20% { opacity: 1; transform: translate(-50%, -10px); }
    80% { opacity: 1; transform: translate(-50%, -10px); }
    100% { opacity: 0; transform: translate(-50%, -20px); }
  }
  `;
  document.head.appendChild(style);
}
</script>

{{< /blocks/cover >}}
