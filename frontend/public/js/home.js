document.addEventListener('DOMContentLoaded', function() {
    // Animaciones para la página principal
    animarHero();
    
    // Contador de estadísticas si existe
    if (document.querySelector('.stats-counter')) {
        iniciarContadores();
    }
});

function animarHero() {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(50px)';
        
        setTimeout(() => {
            heroContent.style.transition = 'all 1s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 100);
    }
}

function iniciarContadores() {
    const contadores = document.querySelectorAll('.counter');
    
    contadores.forEach(contador => {
        const target = parseInt(contador.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                contador.textContent = Math.ceil(current);
                setTimeout(updateCounter, 20);
            } else {
                contador.textContent = target;
            }
        };
        
        updateCounter();
    });
}
