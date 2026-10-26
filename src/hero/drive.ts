import { PALETTE_VARS, SIZE, seek, type Layout, type Palette } from './scene';

const DURATION = 4400;

const figure = document.querySelector<HTMLElement>('.hero-art');
const canvas = figure?.querySelector('canvas');
const ctx = canvas?.getContext('2d');
if (figure && canvas && ctx) run(figure, canvas, ctx);

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const entries = Object.entries(PALETTE_VARS).map(([key, name]) => [key, style.getPropertyValue(name).trim()]);
  return Object.fromEntries(entries) as Palette;
}

function run(figure: HTMLElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let palette = readPalette();
  let layout: Layout = 'wide';
  let t = reduce.matches ? 1 : 0;

  const draw = () => seek(ctx, t, palette, layout);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    layout = width >= height ? 'wide' : 'tall';
    const size = SIZE[layout];
    const k = Math.min(canvas.width / size.w, canvas.height / size.h);
    ctx.setTransform(k, 0, 0, k, (canvas.width - size.w * k) / 2, (canvas.height - size.h * k) / 2);
    draw();
  };

  new ResizeObserver(resize).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    palette = readPalette();
    draw();
  });
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    t = 1;
    draw();
  });

  // Tag widths depend on the mono face, so a late font redraws whatever frame is showing.
  document.fonts.addEventListener('loadingdone', draw);
  const fonts = Promise.race([
    document.fonts.load('500 13px "IBM Plex Mono"'),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined);

  fonts.then(() => {
    const offscreen = figure.getBoundingClientRect().bottom < 0;
    if (t >= 1 || offscreen || reduce.matches) {
      t = 1;
      draw();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      t = reduce.matches ? 1 : Math.min((now - start) / DURATION, 1);
      draw();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
