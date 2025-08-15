document.addEventListener('DOMContentLoaded', function() {
    initSmoothNavigation();
    verificarBackend();
    actualizarNavegacionActiva();
});

function initSmoothNavigation() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

async function verificarBackend() {
    try {
        const response = await fetch('/api/datos-ecosistema');
        if (response.ok) {
            console.log('✅ Backend conectado correctamente');
        } else {
            console.warn('⚠️ Backend respondió con error:', response.status);
        }
    } catch (error) {
        console.warn('❌ Backend no disponible:', error);
    }
}

function actualizarNavegacionActiva() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}
