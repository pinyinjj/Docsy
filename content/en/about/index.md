---
title: About Me
linkTitle: About
menu: {main: {weight: 10}}
---

{{< blocks/cover image_anchor="top" height="full" >}}

<div class="contact-info-container">
  <div class="contact-card">
    <div class="contact-icon">
      <i class="fab fa-qq"></i>
    </div>
    <div class="contact-details">
      <p class="contact-value">914640123</p>
    </div>
  </div>
  
  <div class="contact-card">
    <div class="contact-icon">
      <i class="fab fa-weixin"></i>
    </div>
    <div class="contact-details">
      <p class="contact-value">miao23333QAQ</p>
    </div>
  </div>
  
  <div class="contact-card">
    <div class="contact-icon">
      <i class="fas fa-envelope"></i>
    </div>
    <div class="contact-details">
      <p class="contact-value">workworkzed@gmail.com</p>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.contact-card');
  
  cards.forEach(card => {
    card.addEventListener('click', function() {
      const value = this.querySelector('.contact-value').innerText;
      
      // Copy to clipboard
      navigator.clipboard.writeText(value).then(() => {
        // Create feedback tooltip
        const feedback = document.createElement('div');
        feedback.innerText = 'Copied';
        feedback.style.position = 'absolute';
        feedback.style.top = '10%';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        feedback.style.color = 'white';
        feedback.style.padding = '5px 10px';
        feedback.style.borderRadius = '20px';
        feedback.style.fontSize = '0.8rem';
        feedback.style.zIndex = '100';
        feedback.style.pointerEvents = 'none';
        feedback.style.animation = 'fadeOut 1.5s forwards';
        
        this.style.position = 'relative';
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
const style = document.createElement('style');
style.textContent = `
@keyframes fadeOut {
  0% { opacity: 0; transform: translate(-50%, 0); }
  20% { opacity: 1; transform: translate(-50%, -20px); }
  80% { opacity: 1; transform: translate(-50%, -20px); }
  100% { opacity: 0; transform: translate(-50%, -40px); }
}
`;
document.head.appendChild(style);
</script>

{{< /blocks/cover >}}

{{% blocks/section color="primary" %}}

## About Me

Welcome to my personal space where I share my journey in technology and development.

{{% /blocks/section %}}
