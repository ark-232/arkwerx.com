const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const scrollDriven = CSS.supports('animation-timeline: view()');

// Browsers without scroll-driven animations get the same reveals from an IntersectionObserver.
if (!reduce.matches && !scrollDriven) {
  root.classList.add('io');
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        reveal.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of document.querySelectorAll('.rv')) reveal.observe(el);
  const fold = () => root.classList.toggle('folded', scrollY > 24);
  addEventListener('scroll', fold, { passive: true });
  fold();
}

// Loops play only in view and only while the tab is visible. The button overrides both that and reduced motion.
for (const box of document.querySelectorAll<HTMLElement>('.loop')) {
  const video = box.querySelector('video')!;
  const button = box.querySelector<HTMLButtonElement>('.loop-toggle')!;
  let visible = false;
  let choice: boolean | null = null;
  const wanted = () => visible && !document.hidden && (choice ?? !reduce.matches);
  const sync = () => {
    const on = wanted();
    button.dataset.state = on ? 'playing' : 'paused';
    button.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} the ${button.dataset.label} loop`);
    if (on) video.play().catch(() => {});
    else video.pause();
  };
  video.addEventListener('playing', () => video.classList.add('on'), { once: true });
  button.addEventListener('click', () => {
    choice = !wanted();
    sync();
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  }, { threshold: 0.25 }).observe(box);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  button.hidden = false;
}

// The real figures are in the HTML; the count runs from the first figure of the same width, so nothing shifts.
if (!reduce.matches) {
  const counter = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        counter.unobserve(e.target);
        const el = e.target as HTMLElement;
        const to = Number(el.dataset.to);
        const from = 10 ** (String(to).length - 1);
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / 1400);
          const k = p === 1 ? 1 : 1 - 2 ** (-10 * p);
          el.textContent = (Math.round((from + (to - from) * k) / 100) * 100).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 1 },
  );
  for (const el of document.querySelectorAll('.count')) counter.observe(el);
}

// A spotlight follows fine pointers along the tile borders.
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const tile of document.querySelectorAll<HTMLElement>('.tile')) {
    tile.addEventListener('pointermove', (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
      tile.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }
}
