document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('events-root');
  if (!root) return;

  const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const CALENDAR_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const CLOCK_ICON = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.4-9.3-9C1.2 8.4 3 4.8 6.8 4.4 9 4.2 11 5.3 12 7c1-1.7 3-2.8 5.2-2.6 3.8.4 5.6 4 4.1 7.6C19 16.6 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/></svg>';
  const GRAIN_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 22V6" stroke="#C79A45" stroke-width="1.6"/><path d="M12 9c-3-1-4.5-3.5-4-6.5 3 1 4.6 3.3 4 6.5Z" fill="#C79A45"/><path d="M12 9c3-1 4.5-3.5 4-6.5-3 1-4.6 3.3-4 6.5Z" fill="#C79A45"/></svg>';

  const AUTOPLAY_MS = 7000;
  const CURTAIN_MS = 550;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Parte "2026-09-12" en año/mes/día locales, sin pasar por Date(iso) directo,
  // para que no se corra un día por interpretarlo como medianoche UTC.
  function parseIsoDateLocal(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return { year, month, day };
  }

  function formatLongDate(isoDate) {
    const { year, month, day } = parseIsoDateLocal(isoDate);
    return `${day} de ${MONTHS[month - 1]} de ${year}`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderLoading() {
    return el('p', 'events-loading', 'Cargando eventos…');
  }

  function renderErrorState() {
    const wrap = el('div', 'events-empty');
    wrap.appendChild(el('p', 'events-empty-title', 'No se pudo conectar con el servidor'));
    wrap.appendChild(el('p', 'events-empty-hint', 'Recarga la página en unos segundos. Si sigue sin cargar, verifica que estás en la dirección correcta del sitio.'));
    return wrap;
  }

  function renderEmptyState() {
    const wrap = el('div', 'events-empty');
    wrap.appendChild(el('p', 'events-empty-title', 'Todavía no hay eventos programados'));
    wrap.appendChild(el('p', 'events-empty-hint', 'Vuelve pronto — estamos preparando el próximo encuentro.'));
    return wrap;
  }

  function renderMetaItem(iconHtml, text) {
    const item = el('span', 'event-meta-item');
    const icon = el('span', 'event-meta-icon');
    icon.innerHTML = iconHtml;
    item.appendChild(icon);
    item.appendChild(document.createTextNode(text));
    return item;
  }

  // ---------- Countdown ----------

  function renderCountdownBlock() {
    const wrap = el('div', 'event-countdown');
    const units = [
      { unit: 'days', label: 'días' },
      { unit: 'hours', label: 'horas' },
      { unit: 'minutes', label: 'min' },
      { unit: 'seconds', label: 'seg' },
    ];
    units.forEach(({ unit, label }) => {
      const block = el('div', 'cd-block');
      const value = el('span', 'cd-value', '00');
      value.setAttribute('data-unit', unit);
      block.appendChild(value);
      block.appendChild(el('span', 'cd-label', label));
      wrap.appendChild(block);
    });
    return wrap;
  }

  function startCountdown(container, target) {
    const unitEls = {
      days: container.querySelector('[data-unit="days"]'),
      hours: container.querySelector('[data-unit="hours"]'),
      minutes: container.querySelector('[data-unit="minutes"]'),
      seconds: container.querySelector('[data-unit="seconds"]'),
    };

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        container.innerHTML = '';
        container.appendChild(el('p', 'event-countdown-live', '¡Es hoy!'));
        clearInterval(timer);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (unitEls.days) unitEls.days.textContent = pad(days);
      if (unitEls.hours) unitEls.hours.textContent = pad(hours);
      if (unitEls.minutes) unitEls.minutes.textContent = pad(minutes);
      if (unitEls.seconds) unitEls.seconds.textContent = pad(seconds);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return timer;
  }

  // ---------- Tarjeta destacada (usada sola o dentro del carrusel) ----------

  function renderFeatured(event, animate) {
    const card = el('div', animate ? 'event-featured scroll-animate' : 'event-featured');

    const copy = el('div', 'event-copy');
    copy.appendChild(el('span', 'eyebrow', 'Próximo encuentro'));
    copy.appendChild(el('h3', null, event.title));

    const meta = el('div', 'event-meta');
    meta.appendChild(renderMetaItem(CALENDAR_ICON, formatLongDate(event.eventDate)));
    if (event.eventTime) meta.appendChild(renderMetaItem(CLOCK_ICON, event.eventTime));
    if (event.location) meta.appendChild(renderMetaItem(PIN_ICON, event.location));
    copy.appendChild(meta);

    if (event.description) copy.appendChild(el('p', 'event-description', event.description));

    const { year, month, day } = parseIsoDateLocal(event.eventDate);
    const [hh, mm] = (event.eventTime || '23:59').split(':').map(Number);
    const target = new Date(year, month - 1, day, hh || 0, mm || 0, 0);
    const countdown = renderCountdownBlock();
    copy.appendChild(countdown);

    if (event.ctaUrl) {
      const cta = document.createElement('a');
      cta.className = 'btn btn-gold';
      cta.style.width = 'fit-content';
      cta.href = event.ctaUrl;
      cta.textContent = event.ctaLabel || 'Más información';
      copy.appendChild(cta);
    }

    card.appendChild(copy);

    const media = el('div', 'event-media');
    if (event.imageUrl) {
      const img = document.createElement('img');
      img.src = event.imageUrl;
      img.alt = event.title;
      img.className = 'event-media-img';
      media.appendChild(img);
    } else {
      const frame = el('div', 'frame', null);
      frame.innerHTML = CALENDAR_ICON;
      frame.appendChild(el('span', null, 'Próximamente el afiche de este evento'));
      media.appendChild(frame);
    }
    card.appendChild(media);

    const timer = startCountdown(countdown, target);
    return { card, timer };
  }

  function observeReveal(container) {
    const targets = container.querySelectorAll('.scroll-animate');
    if (!targets.length) return;
    if (reduceMotion) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.1 },
    );
    targets.forEach((t) => observer.observe(t));
  }

  // ---------- Carrusel con transición de cortinas ----------

  function renderCarousel(events) {
    const wrap = el('div', 'event-carousel scroll-animate');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-roledescription', 'carrusel');
    wrap.setAttribute('aria-label', 'Próximos eventos de Koinonía');

    const stageWrap = el('div', 'event-carousel-stage');
    const slideMount = el('div', 'event-carousel-slide');
    const curtainLeft = el('div', 'event-curtain event-curtain-left');
    const curtainRight = el('div', 'event-curtain event-curtain-right');
    const seam = el('div', 'event-curtain-seam');
    seam.innerHTML = GRAIN_ICON;

    stageWrap.appendChild(slideMount);
    stageWrap.appendChild(curtainLeft);
    stageWrap.appendChild(curtainRight);
    stageWrap.appendChild(seam);
    wrap.appendChild(stageWrap);

    const dotsWrap = el('div', 'event-carousel-dots');
    const dots = events.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'event-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Ir al evento ${i + 1} de ${events.length}`);
      dotsWrap.appendChild(dot);
      return dot;
    });
    wrap.appendChild(dotsWrap);

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'event-arrow event-arrow-prev';
    prevBtn.setAttribute('aria-label', 'Evento anterior');
    prevBtn.innerHTML = '‹';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'event-arrow event-arrow-next';
    nextBtn.setAttribute('aria-label', 'Siguiente evento');
    nextBtn.innerHTML = '›';
    wrap.appendChild(prevBtn);
    wrap.appendChild(nextBtn);

    let index = 0;
    let timer = null;
    let autoplayId = null;
    let busy = false;

    function mount(i) {
      if (timer) clearInterval(timer);
      slideMount.innerHTML = '';
      const rendered = renderFeatured(events[i], false);
      slideMount.appendChild(rendered.card);
      timer = rendered.timer;
      dots.forEach((dot, di) => dot.classList.toggle('active', di === i));
    }

    function goTo(newIndex) {
      if (busy || newIndex === index) return;
      busy = true;
      index = (newIndex + events.length) % events.length;

      if (reduceMotion) {
        mount(index);
        busy = false;
        return;
      }

      wrap.classList.add('is-transitioning');
      window.setTimeout(() => {
        mount(index);
        window.setTimeout(() => {
          wrap.classList.remove('is-transitioning');
          busy = false;
        }, 60);
      }, CURTAIN_MS);
    }

    function next() {
      goTo(index + 1);
    }
    function prev() {
      goTo(index - 1);
    }

    function stopAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
      autoplayId = null;
    }
    function startAutoplay() {
      if (reduceMotion) return;
      stopAutoplay();
      autoplayId = setInterval(next, AUTOPLAY_MS);
    }

    prevBtn.addEventListener('click', () => {
      stopAutoplay();
      prev();
      startAutoplay();
    });
    nextBtn.addEventListener('click', () => {
      stopAutoplay();
      next();
      startAutoplay();
    });
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        stopAutoplay();
        goTo(i);
        startAutoplay();
      });
    });

    wrap.addEventListener('mouseenter', stopAutoplay);
    wrap.addEventListener('mouseleave', startAutoplay);
    wrap.addEventListener('focusin', stopAutoplay);
    wrap.addEventListener('focusout', startAutoplay);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        stopAutoplay();
        prev();
        startAutoplay();
      } else if (e.key === 'ArrowRight') {
        stopAutoplay();
        next();
        startAutoplay();
      }
    });

    mount(0);
    startAutoplay();

    return wrap;
  }

  // ---------- Orquestación ----------

  function render(events) {
    root.innerHTML = '';

    if (events.length === 0) {
      root.appendChild(renderEmptyState());
      return;
    }

    if (events.length === 1) {
      const { card } = renderFeatured(events[0], true);
      root.appendChild(card);
    } else {
      root.appendChild(renderCarousel(events));
    }

    observeReveal(root);
  }

  root.innerHTML = '';
  root.appendChild(renderLoading());

  fetch('/api/events')
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => render(data.events || []))
    .catch(() => {
      root.innerHTML = '';
      root.appendChild(renderErrorState());
    });
});
