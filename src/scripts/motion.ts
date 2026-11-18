const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// Browsers without scroll-driven animations get the same reveal from an IntersectionObserver.
if (!reduce.matches && !CSS.supports('animation-timeline: view()')) {
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
    // A refused play (Low Power Mode, data saver) leaves the loop paused and the button saying Play.
    if (on) video.play().catch((e: DOMException) => {
      if (e.name !== 'NotAllowedError') return;
      choice = false;
      sync();
    });
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

// Home sheet: hairline guides and two ruler readouts follow a fine pointer, unsmoothed.
const sheet = document.querySelector<HTMLElement>('.sheet');
if (sheet) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const [rx, ry] = sheet.querySelectorAll<HTMLElement>('.rd');
  const pad = (n: number) => String(Math.round(n)).padStart(4, '0');
  let at: PointerEvent | null = null;
  let frame = 0;
  const aim = () => {
    frame = 0;
    const r = sheet.getBoundingClientRect();
    const x = at!.clientX - r.left;
    const y = at!.clientY - r.top;
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    sheet.classList.toggle('aim', inside);
    if (!inside) return;
    sheet.classList.toggle('flip', x > r.width - 64);
    sheet.style.setProperty('--px', `${x}px`);
    sheet.style.setProperty('--py', `${y}px`);
    rx.textContent = pad(x);
    ry.textContent = pad(y);
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches || reduce.matches) return;
    at = e;
    frame ||= requestAnimationFrame(aim);
  });
  document.documentElement.addEventListener('pointerleave', () => sheet.classList.remove('aim'));
}
