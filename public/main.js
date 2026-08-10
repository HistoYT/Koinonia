document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('nav.links');
    const body = document.body;

    if (menuToggle && navLinks) {
        const toggleMenu = () => {
            navLinks.classList.toggle('mobile-menu-active');
            body.classList.toggle('no-scroll');

            // Cambia el ícono de hamburguesa a una "X" y viceversa
            if (navLinks.classList.contains('mobile-menu-active')) {
                menuToggle.innerHTML = '✕';
                menuToggle.setAttribute('aria-label', 'Cerrar menú');
            } else {
                menuToggle.innerHTML = '☰';
                menuToggle.setAttribute('aria-label', 'Abrir menú');
            }
        };

        menuToggle.addEventListener('click', toggleMenu);

        // Cierra el menú cuando se hace clic en un enlace
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('mobile-menu-active')) {
                    toggleMenu();
                }
            });
        });
    }

    // Init hero animation
    if (typeof initHeroCarousel === 'function') {
        initHeroCarousel();
    }
});