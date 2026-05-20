document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. THEME TOGGLE (DARK/LIGHT MODE)
    // ==========================================
    const toggleBtn = document.getElementById('theme-toggle'); 
    const body = document.body;
    
    // Check memory for theme
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '☀️ Light'; 
    } else {
        body.classList.remove('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '🌙 Dark'; 
    }
    
    // Toggle theme on click
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

        // 🚨 FIX: Close the mobile menu automatically when a link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    navLinks.classList.remove('active');
                    menuIcon.innerHTML = '☰';
                }
            });
        });
    }

    // ==========================================
    // 3. SMART NAVBAR HIDING
    // ==========================================
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    // 🚨 FIX: Check if we are on a "Full-Screen App" page (Map or AI Chat)
    // If we are, we DISABLE the auto-hiding navbar so it doesn't break the screen math.
    const isAppPage = document.querySelector('.dashboard-wrapper') || document.querySelector('.chat-wrapper');

    if (navbar && !isAppPage) {
        window.addEventListener('scroll', () => {
            // 🚨 FIX: Don't hide the navbar if the mobile menu is currently open!
            if (navLinks && navLinks.classList.contains('active')) return;

            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 50) {
                // Scroll Down -> Hide Navbar | Scroll Up -> Show Navbar
                navbar.style.top = (scrollTop > lastScrollTop) ? "-100px" : "0";
            } else {
                // Always show navbar when at the very top of the page
                navbar.style.top = "0"; 
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
        }, { passive: true });
    }
});