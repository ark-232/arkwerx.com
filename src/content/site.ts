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
const plate = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('image'), image }),
  z.strictObject({ kind: z.literal('loop'), loop }),
  z.strictObject({ kind: z.literal('phones'), images: z.array(image).length(2) }),
]);

const project = z.strictObject({
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1).max(32),
  with: z.string().max(40).optional(),
  kind: z.string().min(1).max(20),
  year: z.number().int().min(2021),
  status,
  line: z.string().min(1).max(90),
  spec: z.string().max(60).optional(),
  plate: plate.optional(),
  links: z.array(link).max(3),
  ledger,
});

const Site = z.strictObject({
  name: z.literal('ArkWerx'),
  descriptor: z.string().max(40),
  established: z.number().int(),
  seal: z.string().max(140),
  description: z.string().max(200),
  source: link,
  works: z.array(project).min(1),
  collaborations: z.array(project),
  disclaimer: z.string().max(240),
  members: z.array(z.strictObject({ name: z.string().max(40), title: z.string().max(40), bio: z.string().max(400), ledger })).min(1),
  contact: z.string().max(80),
});

export const site = Site.parse({
  name: 'ArkWerx',
  descriptor: 'Advisory & Engineering',
  established: 2021,
  seal: 'The shield and the eagle come from a family coat of arms. Ultra fines is Latin for “beyond the borders”.',
  description: 'ArkWerx is a private advisory and engineering firm.',
  source: { label: 'Source on GitHub', href: 'https://github.com/ark-232/arkwerx.com' },

  works: [
    {
      id: 'dewline',
      name: 'Dewline',
      kind: 'macOS',
      year: 2026,
      status: 'Shipped',
      line: 'A Mac editor for documents that people and machines write together.',
      links: [
        { label: 'dewline.arkwerx.com', href: 'https://dewline.arkwerx.com/' },
        { label: 'Source', href: 'https://github.com/ark-232/dewline' },
      ],
      ledger: ['own-01', 'own-04', 'own-05'],
    },
    {
      id: 'northlight',
      name: 'Northlight',
      kind: 'tvOS · macOS',
      year: 2026,
      status: 'In development',
      line: 'A quiet wall of live information for the Apple TV, run from the Mac.',
      plate: {
        kind: 'image',
        image: {
          src: 'northlight-sky',
          widths: [800, 1600],
          width: 800,
          height: 450,
          alt: 'Northlight on an Apple TV: space weather, the space station’s position, aurora and daylight.',
        },
      },
      links: [{ label: 'Source', href: 'https://github.com/ark-232/northlight' }],
      ledger: ['own-07', 'own-08', 'own-09'],
    },
    {
      id: 'pngres',
      name: 'PNGres',
      kind: 'Rust',
      year: 2026,
      status: 'Open source',
      line: 'A file store hidden inside ordinary pictures.',
      plate: {
        kind: 'image',
        image: {
          src: 'pngres-inspector',
          widths: [800, 1600],
          width: 800,
          height: 529,
          alt: 'PNGres inspector: a cover image, an identical-looking shard, and its low bits revealing the hidden file.',
        },
      },
      links: [{ label: 'Source', href: 'https://github.com/ark-232/pngres' }],
      ledger: ['own-13', 'own-14', 'own-m5'],
    },
  ],

  collaborations: [
    {
      id: 'airmark',
      name: 'Airmark',
      with: 'Tongue to Quill',
      kind: 'Web',
      year: 2025,
      status: 'Shipped',
      line: 'Official correspondence, composed and typeset in the browser.',
      spec: '50,000+ users · Authorization to Operate',
      plate: {
        kind: 'loop',
        loop: {
          video: 'airmark-accept-loop.mp4',
          poster: {
            src: 'airmark-accept-poster',
            widths: [],
            width: 960,
            height: 660,
            alt: 'Airmark memo editor: the subject and a paragraph change and the typeset preview updates live.',
          },
          label: 'Airmark',
        },
      },
      links: [{ label: 'tonguetoquill.com', href: 'https://tonguetoquill.com/about' }],
      ledger: ['ttq-01', 'ttq-02', 'ttq-04'],
    },
    {
      id: 'quillify',
      name: 'quillify',
      with: 'Tongue to Quill',
      kind: 'Library',
      year: 2026,
      status: 'Open source',
      line: 'Published PDF forms, turned into templates anyone can fill.',
      spec: 'npm i @quillmark/quillify',
      links: [
        { label: 'Source', href: 'https://github.com/tonguetoquill/quillify' },
        { label: 'npm', href: 'https://www.npmjs.com/package/@quillmark/quillify' },
      ],
      ledger: ['ttq-10', 'ttq-11', 'ttq-26'],
    },
    {
      id: 'fletch',
      name: 'fletch',
      with: 'Tongue to Quill',
      kind: 'API',
      year: 2026,
      status: 'In development',
      line: 'A form goes in and a signable document comes out, with the network shut off.',
      plate: {
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
      links: [],
      ledger: ['ttq-23', 'ttq-24', 'ttq-25'],
    },
    {
      id: 'mcp',
      name: 'Quillmark MCP server',
      with: 'Tongue to Quill',
      kind: 'Server',
      year: 2026,
      status: 'Open source',
      line: 'AI assistants produce finished documents from templates.',
      links: [{ label: 'Source', href: 'https://github.com/tonguetoquill/quillmark-mcp' }],
      ledger: ['ttq-15', 'ttq-16', 'ttq-27'],
    },
    {
      id: 'sandtable',
      name: 'Sandtable',
      with: 'Tongue to Quill',
      kind: 'Web',
      year: 2026,
      status: 'Prototype',
      line: 'Tabletop exercises, written and rendered as documents.',
      links: [],
      ledger: ['ttq-19', 'ttq-20'],
    },
    {
      id: 'cgoc',
      name: 'Council programs',
      with: 'the DAF CGOC',
      kind: 'Web',
      year: 2026,
      status: 'Shipped',
      line: 'Mentorship and research programs for a council of 47,000 junior officers.',
      plate: {
        kind: 'phones',
        images: [
          { src: 'penpal-mobile', widths: [390, 780], width: 390, height: 844, alt: 'Penpal on a phone: the mentorship headline and the find-a-mentor button.' },
          { src: 'thinktank-mobile', widths: [390, 780], width: 390, height: 844, alt: 'Think Tank on a phone: the research path graphic and the join-a-cohort button.' },
        ],
      },
      links: [
        { label: 'Penpal', href: 'https://penpal.dafcgoc.org/' },
        { label: 'dafcgoc.org', href: 'https://dafcgoc.org/' },
      ],
      ledger: ['cgoc-01', 'cgoc-06', 'cgoc-m1', 'cgoc-14'],
    },
  ],
  disclaimer:
    'Collaborations listed here were done in a personal capacity, not as ArkWerx business. They do not represent the views of the Department of the Air Force, the Department of War or the U.S. Government.',

  members: [
    {
      name: 'Enrique O.',
      title: 'Principal',
      bio: 'Enrique O. founded ArkWerx and leads its work. He is a software engineer and security practitioner whose work runs from secure web applications and document systems to native Apple software, including software that holds a government Authorization to Operate.',
      ledger: ['own-01', 'own-07', 'ttq-01', 'ttq-04'],
    },
  ],

  contact: 'Write to the firm.',
});

export type Project = z.infer<typeof project>;
export type Image = z.infer<typeof image>;
export type Loop = z.infer<typeof loop>;
