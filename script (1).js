// تحريك شريط الأخبار العاجلة
document.addEventListener('DOMContentLoaded', function() {
    const newsScroll = document.querySelector('.news-scroll');
    if (newsScroll) {
        const clone = newsScroll.cloneNode(true);
        newsScroll.parentNode.appendChild(clone);
    }
});

// تحسين أداء التحميل
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.image-placeholder');
    images.forEach(img => {
        img.classList.add('loaded');
    });
});

// إضافة تأثير عند التمرير
window.addEventListener('scroll', function() {
    const nav = document.querySelector('.main-nav');
    if (window.scrollY > 50) {
        nav.style.padding = '10px 5%';
    } else {
        nav.style.padding = '15px 5%';
    }
});

