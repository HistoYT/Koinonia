function initHeroCarousel() {
    const hero = document.querySelector('.hero');
    const slides = document.querySelectorAll('.hero-slide');
    if (!hero || slides.length < 2) return;

    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.querySelector('.hero-arrow-prev');
    const nextBtn = document.querySelector('.hero-arrow-next');
    const intervalMs = 6000;

    let currentSlide = 0;
    let timer = null;

    const goTo = (index) => {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide] && dots[currentSlide].classList.remove('active');
        dots[currentSlide] && dots[currentSlide].setAttribute('aria-selected', 'false');

        currentSlide = (index + slides.length) % slides.length;

        slides[currentSlide].classList.add('active');
        dots[currentSlide] && dots[currentSlide].classList.add('active');
        dots[currentSlide] && dots[currentSlide].setAttribute('aria-selected', 'true');
    };

    const start = () => {
        stop();
        timer = setInterval(() => goTo(currentSlide + 1), intervalMs);
    };
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            goTo(i);
            start();
        });
    });
    prevBtn && prevBtn.addEventListener('click', () => { goTo(currentSlide - 1); start(); });
    nextBtn && nextBtn.addEventListener('click', () => { goTo(currentSlide + 1); start(); });

    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);

    start();
}
