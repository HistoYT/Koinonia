document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Scroll-triggered animations for sections ---
    const animatedElements = document.querySelectorAll('.scroll-animate');

    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% of the element is visible
        });
        animatedElements.forEach(el => observer.observe(el));
    }

    // --- 2. Hero section looping typing animation ---
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        const eyebrow = document.querySelector('.hero .eyebrow');
        const leadParagraph = document.querySelector('.hero p.lead');
        const ctas = document.querySelector('.hero .hero-ctas');
        const CHAR_DELAY = 32; // ms per character revealed
        const CYCLE = 3000; // ms between typing restarts

        // Split the title's markup into prefix / <em>highlight</em> / suffix
        // so the gold italic emphasis survives being rebuilt character by character.
        const originalHTML = heroTitle.innerHTML.trim();
        const match = originalHTML.match(/^([\s\S]*?)<em>([\s\S]*?)<\/em>([\s\S]*)$/);
        const prefixText = match ? match[1] : originalHTML;
        const emphasisText = match ? match[2] : '';
        const suffixText = match ? match[3] : '';
        const totalChars = prefixText.length + emphasisText.length + suffixText.length;

        [eyebrow, leadParagraph, ctas].forEach(el => el && (el.style.opacity = '0'));
        heroTitle.style.opacity = 1;

        function appendCharSpans(text, container, spans) {
            text.split('').forEach(char => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.opacity = '0';
                span.style.transition = 'opacity 0.4s ease';
                container.appendChild(span);
                spans.push(span);
            });
        }

        function typeTitle() {
            heroTitle.innerHTML = '';
            const spans = [];
            appendCharSpans(prefixText, heroTitle, spans);
            if (emphasisText) {
                const em = document.createElement('em');
                em.className = 'highlight';
                heroTitle.appendChild(em);
                appendCharSpans(emphasisText, em, spans);
            }
            appendCharSpans(suffixText, heroTitle, spans);

            spans.forEach((span, i) => {
                setTimeout(() => { span.style.opacity = '1'; }, i * CHAR_DELAY);
            });
        }

        typeTitle();
        setInterval(typeTitle, CYCLE);

        // Fade in the rest of the hero content once, after the first type-out
        setTimeout(() => {
            [eyebrow, leadParagraph, ctas].forEach(el => {
                if (el) {
                    el.style.transition = 'opacity 0.8s ease';
                    el.style.opacity = '1';
                }
            });
        }, totalChars * CHAR_DELAY + 300);
    }
});