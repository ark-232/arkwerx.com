export type Palette = {
  sheet: string;
  ink: string;
  muted: string;
  form: string;
  rule: string;
  canary: string;
  onCanary: string;
  wash: string;
};

export type Layout = 'wide' | 'tall';

export const PALETTE_VARS: Record<keyof Palette, string> = {
  sheet: '--sheet',
  ink: '--ink',
  muted: '--ink-2',
  form: '--form',
  rule: '--rule',
  canary: '--canary',
  onCanary: '--on-canary',
  wash: '--hero-wash',
};

export const SIZE: Record<Layout, { w: number; h: number }> = {
  wide: { w: 960, h: 640 },
  tall: { w: 600, h: 900 },
};

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Field = { r: Rect; tag: string; checks?: number };

const PAGE = { w: 380, h: 560 };
const TITLE: Rect = { x: 24, y: 24, w: 332, h: 52 };
const FIELDS: Field[] = [
  { r: { x: 24, y: 96, w: 166, h: 48 }, tag: 'from: string' },
  { r: { x: 198, y: 96, w: 158, h: 48 }, tag: 'date: date' },
  { r: { x: 24, y: 152, w: 332, h: 48 }, tag: 'to: string[]' },
  { r: { x: 24, y: 208, w: 332, h: 48 }, tag: 'subject: string' },
  { r: { x: 24, y: 264, w: 332, h: 146 }, tag: 'body: markdown' },
  { r: { x: 24, y: 418, w: 332, h: 50 }, tag: 'copies: enum', checks: 3 },
];
const SIGNATURE = { x: 170, y: 530, w: 186 };

const PLACE: Record<Layout, {
  page: Point;
  root: Point;
  step: number;
  bend: Point;
  stamp: Point;
}> = {
  wide: { page: { x: 44, y: 40 }, root: { x: 520, y: 124 }, step: 56, bend: { x: 150, y: 0 }, stamp: { x: 140, y: 566 } },
  tall: { page: { x: 110, y: 20 }, root: { x: 120, y: 612 }, step: 40, bend: { x: 0, y: 110 }, stamp: { x: 206, y: 546 } },
};

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const TAG_H = 22;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function rgba(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`;
}

function bezier(a: Point, c1: Point, c2: Point, b: Point, u: number): Point {
  const v = 1 - u;
  return {
    x: v * v * v * a.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * b.x,
    y: v * v * v * a.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * b.y,
  };
}

// Strokes the first `p` (0 to 1) of a rectangle's perimeter, clockwise from the top-left corner.
function traceRect(ctx: CanvasRenderingContext2D, r: Rect, p: number) {
  if (p <= 0) return;
  const total = 2 * (r.w + r.h);
  let left = p * total;
  const corners: Point[] = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
    { x: r.x, y: r.y },
  ];
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 0; i < 4 && left > 0; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    const k = Math.min(1, left / len);
    ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
    left -= len;
  }
  ctx.stroke();
}

function tagBox(ctx: CanvasRenderingContext2D, text: string, at: Point, pal: Palette, alpha: number, scale: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 13px ${MONO}`;
  const w = Math.ceil(ctx.measureText(text).width) + 16;
  ctx.translate(at.x, at.y + TAG_H / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = pal.sheet;
  ctx.fillRect(0, -TAG_H / 2, w, TAG_H);
  ctx.strokeStyle = pal.form;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, -TAG_H / 2 + 0.5, w - 1, TAG_H - 1);
  ctx.fillStyle = pal.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 8, 1);
  ctx.restore();
}

// Draws the frame at t (0 to 1). The frame depends only on t, the palette, the layout, the caller's transform
// and whether IBM Plex Mono has loaded, which sets the width of the tag text.
export function seek(ctx: CanvasRenderingContext2D, t: number, pal: Palette, layout: Layout) {
  t = clamp01(t);
  const place = PLACE[layout];
  const P = place.page;
  const abs = (r: Rect): Rect => ({ x: P.x + r.x, y: P.y + r.y, w: r.w, h: r.h });

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  // The page.
  ctx.fillStyle = pal.sheet;
  ctx.fillRect(P.x, P.y, PAGE.w, PAGE.h);
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(P.x + 0.5, P.y + 0.5, PAGE.w - 1, PAGE.h - 1);

  // Title block: two heavy bars and a rule, set before the fields.
  const title = abs(TITLE);
  const titleIn = easeOut(span(t, 0, 0.08));
  ctx.fillStyle = rgba(pal.ink, 0.85 * titleIn);
  ctx.fillRect(title.x, title.y + 6, 150 * titleIn, 12);
  ctx.fillStyle = rgba(pal.muted, 0.6 * titleIn);
  ctx.fillRect(title.x, title.y + 28, 96 * titleIn, 7);
  ctx.fillRect(title.x + title.w - 70 * titleIn, title.y + 28, 70 * titleIn, 7);
  ctx.strokeStyle = rgba(pal.ink, titleIn);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(title.x, title.y + title.h);
  ctx.lineTo(title.x + title.w * titleIn, title.y + title.h);
  ctx.stroke();

  // Trace each field box, then tag it and fill it canary.
  const n = FIELDS.length;
  const fillAlpha = Number(pal.wash);
  const tagAt = (i: number) => 0.27 + i * 0.045;
  const glideAt = (i: number) => 0.55 + i * 0.035;
  const GLIDE = 0.17;

  for (let i = 0; i < n; i++) {
    const f = FIELDS[i];
    const r = abs(f.r);
    const fill = span(t, tagAt(i), tagAt(i) + 0.05);
    if (fill > 0) {
      ctx.fillStyle = rgba(pal.canary, fillAlpha * fill);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    const trace = easeInOut(span(t, 0.02 + i * 0.032, 0.11 + i * 0.032));
    ctx.strokeStyle = pal.form;
    ctx.lineWidth = 1.25;
    if (f.checks) {
      for (let c = 0; c < f.checks; c++) {
        const bx = r.x + c * 112;
        const box = { x: bx, y: r.y + 28, w: 14, h: 14 };
        traceRect(ctx, box, trace);
        ctx.fillStyle = rgba(pal.muted, 0.45 * trace);
        ctx.fillRect(bx + 22, r.y + 33, 56 * trace, 5);
        if (c === 0 && fill > 0) {
          ctx.save();
          ctx.strokeStyle = rgba(pal.ink, fill);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(box.x + 3, box.y + 3);
          ctx.lineTo(box.x + box.w - 3, box.y + box.h - 3);
          ctx.moveTo(box.x + box.w - 3, box.y + 3);
          ctx.lineTo(box.x + 3, box.y + box.h - 3);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      traceRect(ctx, r, trace);
      ctx.fillStyle = rgba(pal.muted, 0.45 * trace);
      ctx.fillRect(r.x + 8, r.y + r.h - 12, 44 * trace, 4);
    }
  }

  // The template tree grows and each tag glides into it, leaving a leader line.
  const R = place.root;
  const treeIn = easeOut(span(t, 0.52, 0.6));
  const slot = (i: number): Point => ({ x: R.x + 34, y: R.y + 40 + i * place.step });
  if (treeIn > 0) {
    ctx.save();
    ctx.globalAlpha = treeIn;
    ctx.font = `500 14px ${MONO}`;
    ctx.fillStyle = pal.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText('template', R.x, R.y);
    ctx.restore();
  }
  let lastArrived = -1;
  for (let i = 0; i < n; i++) if (t >= glideAt(i) + GLIDE * 0.6) lastArrived = i;
  if (treeIn > 0) {
    const reach = lastArrived >= 0 ? slot(lastArrived).y : R.y + 14;
    ctx.strokeStyle = rgba(pal.rule, treeIn);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(R.x + 10.5, R.y + 14);
    ctx.lineTo(R.x + 10.5, reach + TAG_H / 2);
    ctx.stroke();
    for (let i = 0; i <= lastArrived; i++) {
      const s = slot(i);
      ctx.beginPath();
      ctx.moveTo(R.x + 10.5, s.y + TAG_H / 2 + 0.5);
      ctx.lineTo(s.x - 4, s.y + TAG_H / 2 + 0.5);
      ctx.stroke();
    }
  }

  for (let i = 0; i < n; i++) {
    const f = FIELDS[i];
    const r = abs(f.r);
    const home: Point = { x: r.x + 8, y: r.y + 7 };
    const appear = easeOut(span(t, tagAt(i), tagAt(i) + 0.03));
    const g = easeInOut(span(t, glideAt(i), glideAt(i) + GLIDE));
    const dest = slot(i);
    const at = g > 0
      ? bezier(home, { x: home.x + place.bend.x, y: home.y + place.bend.y }, { x: dest.x - place.bend.x, y: dest.y - place.bend.y }, dest, g)
      : home;

    if (g > 0) {
      const from: Point = layout === 'wide'
        ? { x: P.x + PAGE.w, y: home.y + TAG_H / 2 }
        : { x: home.x + 12 + i * 10, y: P.y + PAGE.h };
      ctx.save();
      ctx.strokeStyle = rgba(pal.form, 0.55);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(at.x - 2, at.y + TAG_H / 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = pal.form;
      ctx.fillRect(from.x - 2, from.y - 2, 4, 4);
    }
    tagBox(ctx, f.tag, at, pal, appear, 0.92 + 0.08 * appear);
  }

  // Draw the signature line, then set the stamp.
  const sig = { x: P.x + SIGNATURE.x, y: P.y + SIGNATURE.y };
  const line = easeInOut(span(t, 0.88, 0.95));
  if (line > 0) {
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(sig.x, sig.y);
    ctx.lineTo(sig.x + SIGNATURE.w * line, sig.y);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sig.x - 2, sig.y - 18);
    ctx.lineTo(sig.x + 8, sig.y - 8);
    ctx.moveTo(sig.x + 8, sig.y - 18);
    ctx.lineTo(sig.x - 2, sig.y - 8);
    ctx.stroke();
    ctx.restore();
  }

  const stamp = easeOut(span(t, 0.93, 1));
  if (stamp > 0) {
    const S = place.stamp;
    ctx.save();
    ctx.translate(S.x, S.y);
    ctx.rotate(-0.07);
    const k = 1.18 - 0.18 * stamp;
    ctx.scale(k, k);
    ctx.globalAlpha = stamp;
    ctx.font = `600 13px ${MONO}`;
    const label = 'READY TO SIGN';
    const w = ctx.measureText(label).width + 30;
    ctx.fillStyle = rgba(pal.canary, 0.92);
    ctx.fillRect(-w / 2, -17, w, 34);
    ctx.strokeStyle = pal.onCanary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -17, w, 34);
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 4, -13, w - 8, 26);
    ctx.fillStyle = pal.onCanary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  ctx.restore();
}
