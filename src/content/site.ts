import { z } from 'astro/zod';

const ledger = z.array(z.string().regex(/^(own|ttq|cgoc|writing|education)-m?\d+$/)).min(1);
const link = z.strictObject({
  label: z.string().min(1).max(40),
  href: z.string().regex(/^https:\/\/[^\s]+$/),
});
const status = z.enum(['Shipped', 'Open source', 'In development', 'Prototype']);

// A picture in /media: `${src}-${w}.avif|webp` for each width, or `${src}.avif|webp` when widths is empty.
const image = z.strictObject({
  src: z.string().regex(/^[a-z0-9-]+$/),
  widths: z.array(z.number().int().positive()).max(2),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1).max(160),
});
const loop = z.strictObject({
  video: z.string().regex(/^[a-z0-9-]+\.mp4$/),
  poster: image,
  label: z.string().min(1).max(40),
});
const media = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('image'), image }),
  z.strictObject({ kind: z.literal('loop'), loop }),
  z.strictObject({ kind: z.literal('phones'), images: z.array(image).length(2) }),
]);

const tile = z.strictObject({
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1).max(24),
  size: z.enum(['large', 'medium']),
  status: z.array(status).min(1),
  line: z.string().min(1).max(80),
  proof: z.array(z.string().min(1).max(60)).min(1).max(3),
  role: z.string().min(1).max(60),
  credit: z.string().max(60).optional(),
  stack: z.array(z.string().min(1)).min(1).max(5),
  command: z.string().max(40).optional(),
  media: z.array(media).max(2),
  sites: z.array(z.strictObject({ link, text: z.string().max(40), status: status.optional(), ledger })).max(3),
  links: z.array(link).max(2),
  ledger,
});

const Site = z.strictObject({
  name: z.string(),
  role: z.string().max(80),
  description: z.string().max(200),
  hero: z.strictObject({ line: z.string().max(80), loop, proof: z.string().max(60), ledger }),
  profiles: z.array(link).min(1),
  source: link,
  work: z.array(tile).min(1),
  also: z.array(z.strictObject({
    name: z.string(),
    line: z.string().max(80),
    role: z.string().max(40).optional(),
    status,
    link: link.optional(),
    ledger,
  })),
  writing: z.array(z.strictObject({
    date: z.string().regex(/^\d{4}-\d{2}$/),
    title: z.string().max(80),
    with: z.string().max(40).optional(),
    text: z.string().max(80),
    link,
    ledger,
  })).min(1),
  education: z.array(z.strictObject({ credential: z.string().max(60), detail: z.string().max(60).optional(), ledger })).min(1),
  stack: z.strictObject({ items: z.array(z.string()).min(1), ledger }),
  contact: z.strictObject({ line: z.string().max(80) }),
});

const airmarkLoop = {
  video: 'airmark-accept-loop.mp4',
  poster: {
    src: 'airmark-accept-poster',
    widths: [],
    width: 960,
    height: 660,
    alt: 'Airmark memo editor: the subject and a paragraph change and the typeset preview updates live.',
  },
  label: 'Airmark',
};

export const site = Site.parse({
  name: 'Enrique Oti',
  role: 'Senior software engineer and cybersecurity professional',
  description:
    'Enrique Oti, senior software engineer and cybersecurity professional. Document engines, accredited web apps and native Apple software.',
  hero: {
    line: 'I ship secure software, from typesetting engines to Apple TV.',
    loop: airmarkLoop,
    proof: 'Airmark · 50,000+ Air Force users',
    ledger: ['ttq-01', 'ttq-02'],
  },
  profiles: [
    { label: 'GitHub', href: 'https://github.com/ark-232' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/eaoti/' },
  ],
  source: { label: 'Source on GitHub', href: 'https://github.com/ark-232/arkwerx.com' },

  work: [
    {
      id: 'airmark',
      name: 'Airmark',
      size: 'large',
      status: ['Shipped'],
      line: 'Official Air Force correspondence, formatted in the browser.',
      proof: ['50,000+ Air Force users', 'ATO', 'Handles CUI'],
      role: 'Core developer',
      credit: 'With the Tongue to Quill team',
      stack: ['SvelteKit', 'TypeScript', 'Typst', 'Docker'],
      media: [{
        kind: 'image',
        image: {
          src: 'airmark-editor-preview',
          widths: [800, 1600],
          width: 800,
          height: 549,
          alt: 'Airmark: structured memo fields on the left, the typeset memo on the right.',
        },
      }],
      sites: [],
      links: [
        { label: 'Team page', href: 'https://tonguetoquill.com/about' },
        { label: 'Quillmark engine', href: 'https://github.com/borb-sh/quillmark' },
      ],
      ledger: ['ttq-01', 'ttq-02', 'ttq-03', 'ttq-04', 'ttq-05', 'ttq-09', 'ttq-m1', 'ttq-m2'],
    },
    {
      id: 'quillify',
      name: 'quillify',
      size: 'medium',
      status: ['Shipped', 'Open source'],
      line: 'Turns published PDF forms into fillable templates, in the browser.',
      proof: ['Converts most Air Force forms with every field in place.'],
      role: 'Architect and lead developer',
      stack: ['TypeScript', 'WebAssembly', 'pdf.js'],
      command: 'npm i @quillmark/quillify',
      media: [],
      sites: [],
      links: [
        { label: 'GitHub', href: 'https://github.com/tonguetoquill/quillify' },
        { label: 'npm', href: 'https://www.npmjs.com/package/@quillmark/quillify' },
      ],
      ledger: ['ttq-10', 'ttq-11', 'ttq-12', 'ttq-14', 'ttq-26'],
    },
    {
      id: 'fletch',
      name: 'fletch',
      size: 'medium',
      status: ['In development'],
      line: 'An API that fills a government form and returns a signable PDF.',
      proof: ['Converts in sandboxed Chromium, network blocked.'],
      role: 'Lead developer',
      stack: ['TypeScript', 'Chromium', 'SQLite', 'Docker'],
      media: [
        {
          kind: 'loop',
          loop: {
            video: 'fletch-console-loop.mp4',
            poster: {
              src: 'fletch-console-poster',
              widths: [],
              width: 960,
              height: 610,
              alt: 'fletch console: a government form fills while API requests stream in.',
            },
            label: 'fletch',
          },
        },
        {
          kind: 'image',
          image: {
            src: 'fletch-security',
            widths: [800, 1600],
            width: 800,
            height: 500,
            alt: 'Terminal: the fletch status endpoint reports a read-only root, no new privileges and a seccomp filter.',
          },
        },
      ],
      sites: [],
      links: [],
      ledger: ['ttq-23', 'ttq-24', 'ttq-25'],
    },
    {
      id: 'pngres',
      name: 'PNGres',
      size: 'medium',
      status: ['Open source'],
      line: 'A deliberately impractical file store hidden in pictures of a monkey.',
      proof: ['Streams video straight out of the PNGs.'],
      role: 'Solo',
      stack: ['Rust', 'BLAKE3'],
      media: [{
        kind: 'image',
        image: {
          src: 'pngres-inspector',
          widths: [800, 1600],
          width: 800,
          height: 529,
          alt: 'PNGres inspector: the cover image, an identical-looking shard, and its low bits revealing the hidden file.',
        },
      }],
      sites: [],
      links: [{ label: 'GitHub', href: 'https://github.com/ark-232/pngres' }],
      ledger: ['own-13', 'own-14', 'own-15', 'own-16', 'own-17', 'own-18', 'own-m5'],
    },
    {
      id: 'dewline',
      name: 'Dewline',
      size: 'medium',
      status: ['In development'],
      line: 'A native Mac markdown editor for files agents also edit.',
      proof: ['Built to snapshot before any outside write.'],
      role: 'Solo',
      stack: ['Swift', 'AppKit', 'Rust'],
      media: [],
      sites: [],
      links: [{ label: 'GitHub', href: 'https://github.com/ark-232/dewline' }],
      ledger: ['own-01', 'own-02', 'own-03', 'own-04', 'own-05', 'own-06', 'own-m5'],
    },
    {
      id: 'cgoc',
      name: 'DAF CGOC',
      size: 'large',
      status: ['Shipped'],
      line: 'Sites for a council of 47,000+ junior officers.',
      proof: ['Sole developer of Penpal, live since August 2026.'],
      role: 'Deputy Technology Director (volunteer)',
      stack: ['JavaScript', 'Firebase', 'GitHub Pages'],
      media: [{
        kind: 'phones',
        images: [
          {
            src: 'penpal-mobile',
            widths: [390, 780],
            width: 390,
            height: 844,
            alt: 'Penpal on a phone: the mentorship headline and the find-a-mentor button.',
          },
          {
            src: 'thinktank-mobile',
            widths: [390, 780],
            width: 390,
            height: 844,
            alt: 'Think Tank on a phone: the research path graphic and the join-a-cohort button.',
          },
        ],
      }],
      sites: [
        { link: { label: 'dafcgoc.org', href: 'https://dafcgoc.org/' }, text: 'Rebuilt for phones.', ledger: ['cgoc-01', 'cgoc-02', 'cgoc-03', 'cgoc-04', 'cgoc-14'] },
        { link: { label: 'Penpal', href: 'https://penpal.dafcgoc.org/' }, text: 'Mentor matching.', ledger: ['cgoc-06', 'cgoc-07', 'cgoc-08', 'cgoc-09', 'cgoc-10', 'cgoc-m1', 'cgoc-14'] },
        { link: { label: 'Think Tank', href: 'https://thinktank.dafcgoc.org/' }, text: 'Research cohorts.', status: 'In development', ledger: ['cgoc-11', 'cgoc-12', 'cgoc-13'] },
      ],
      links: [],
      ledger: ['cgoc-01', 'cgoc-06', 'cgoc-m1', 'cgoc-14'],
    },
  ],

  also: [
    {
      name: 'Quillmark MCP server',
      line: 'AI assistants render finished documents from Quillmark templates.',
      role: 'One of the developers',
      status: 'Open source',
      link: { label: 'GitHub', href: 'https://github.com/tonguetoquill/quillmark-mcp' },
      ledger: ['ttq-15', 'ttq-16', 'ttq-17', 'ttq-18', 'ttq-27'],
    },
    {
      name: 'Northlight',
      line: 'An Apple TV dashboard with a Mac menu bar companion.',
      role: 'Solo',
      status: 'In development',
      link: { label: 'GitHub', href: 'https://github.com/ark-232/northlight' },
      ledger: ['own-07', 'own-08', 'own-09', 'own-10', 'own-11', 'own-12'],
    },
    {
      name: 'Sandtable',
      line: 'Tabletop exercises, rendered through the MCP server.',
      status: 'Prototype',
      ledger: ['ttq-19', 'ttq-20', 'ttq-21', 'ttq-22'],
    },
  ],

  writing: [
    {
      date: '2026-04',
      title: 'Reforming the Long Blue Line',
      with: 'David Petzold',
      text: 'Give cadets real authority, within limits.',
      link: { label: 'Read on LinkedIn', href: 'https://www.linkedin.com/feed/update/urn:li:activity:7449411088774758401/' },
      ledger: ['writing-05', 'writing-06', 'writing-07', 'writing-08', 'writing-09'],
    },
  ],

  education: [
    { credential: 'B.S. Computer Science and Cyber Science', detail: 'U.S. Air Force Academy, 2025', ledger: ['education-01', 'education-05'] },
    { credential: 'MSc Countering Extremist Crime and Terrorism', detail: 'University College London, in progress', ledger: ['education-02'] },
    { credential: 'CompTIA Security+', ledger: ['education-04'] },
  ],
  stack: {
    items: ['Rust', 'TypeScript', 'Swift', 'Python', 'SvelteKit', 'SwiftUI', 'WebAssembly', 'Typst', 'Cloudflare Workers', 'Firebase', 'Docker', 'Terraform'],
    ledger: ['education-06', 'education-07'],
  },

  contact: { line: 'Have a project or a question? Write.' },
});

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export type Site = z.infer<typeof Site>;
export type Tile = Site['work'][number];
export type Image = z.infer<typeof image>;
export type Loop = z.infer<typeof loop>;
