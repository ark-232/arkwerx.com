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

// Home index: one highlight glides to the row under the pointer or focus.
const rows = document.querySelector<HTMLElement>('.rows');
if (rows) {
  const hl = rows.querySelector<HTMLElement>('.hl')!;
  let at: HTMLElement | null = null;
  const show = (li: HTMLElement) => {
    if (li === at) return;
    at?.classList.remove('at');
    at = li;
    li.classList.add('at');
    const first = !rows.classList.contains('on');
    hl.classList.toggle('snap', first);
    hl.style.setProperty('--y', `${li.offsetTop}px`);
    hl.style.setProperty('--h', `${li.offsetHeight}px`);
    if (first) void hl.offsetWidth;
    rows.classList.add('on');
  };
  const hide = () => {
    rows.classList.remove('on');
    at?.classList.remove('at');
    at = null;
  };
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  rows.addEventListener('pointerover', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('li');
    if (hover.matches && li) show(li);
  });
  rows.addEventListener('pointerleave', () => hover.matches && !rows.contains(document.activeElement) && hide());
  rows.addEventListener('focusin', (e) => show((e.target as Element).closest<HTMLElement>('li')!));
  rows.addEventListener('focusout', (e) => !rows.contains(e.relatedTarget as Node) && hide());
}

// Home seal: leans a few degrees toward the pointer and catches the light.
const seal = document.querySelector<HTMLElement>('.seal-x');
const front = document.querySelector<HTMLElement>('.front');
if (seal && front) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  front.addEventListener('pointermove', (e) => {
    if (!fine.matches || reduce.matches || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = seal.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      seal.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      seal.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      seal.style.setProperty('--gx', `${(50 + x * 40).toFixed(1)}%`);
      seal.style.setProperty('--gy', `${(30 + y * 25).toFixed(1)}%`);
      seal.style.setProperty('--glare', '1');
    });
  });
  front.addEventListener('pointerleave', () => {
    for (const p of ['--rx', '--ry', '--gx', '--gy', '--glare']) seal.style.removeProperty(p);
  });
}
