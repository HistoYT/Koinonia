document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('qrTrigger');
    const lightbox = document.getElementById('qrLightbox');
    const backdrop = document.getElementById('qrLightboxBackdrop');
    const closeBtn = document.getElementById('qrLightboxClose');
    if (!trigger || !lightbox || !backdrop || !closeBtn) return;

    function open() {
        lightbox.hidden = false;
        document.body.classList.add('no-scroll');
        closeBtn.focus();
    }

    function close() {
        lightbox.hidden = true;
        document.body.classList.remove('no-scroll');
        trigger.focus();
    }

    trigger.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightbox.hidden) close();
    });
});
