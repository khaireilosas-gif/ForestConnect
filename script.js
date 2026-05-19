document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. THEME TOGGLE (DARK/LIGHT MODE)
    // ==========================================
    const toggleBtn = document.getElementById('theme-toggle'); 
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '☀️ Light'; 
    } else {
        body.classList.remove('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '🌙 Dark'; 
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                toggleBtn.innerHTML = '☀️ Light'; 
            } else {
                localStorage.setItem('theme', 'light');
                toggleBtn.innerHTML = '🌙 Dark'; 
            }
        });
    }

    // ==========================================
    // 2. MOBILE HAMBURGER MENU
    // ==========================================
    const menuIcon = document.getElementById('menu-icon');
    const navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuIcon.innerHTML = navLinks.classList.contains('active') ? '✕' : '☰';
        });
    }

    // ==========================================
    // 3. SMART NAVBAR HIDING
    // ==========================================
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    if (navbar) {
        window.addEventListener('scroll', () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) navbar.style.top = (scrollTop > lastScrollTop) ? "-100px" : "0";
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
        }, { passive: true });
    }
});