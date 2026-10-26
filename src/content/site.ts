import { z } from 'astro/zod';

const ledger = z.array(z.string().regex(/^(own|ttq|cgoc|academy|writing|education)-m?\d+$/)).min(1);
const link = z.strictObject({
  label: z.string().min(1).max(40),
  href: z.string().regex(/^https:\/\/[^\s]+$/),
});
const status = z.enum(['Shipped', 'Open source', 'In development']);

const block = z.strictObject({
  name: z.string().min(1),
  years: z.string().min(1),
  role: z.string().min(1).max(200),
  does: z.string().min(1).max(440),
  detail: z.strictObject({
    label: z.enum(['Proof', 'Design']),
    items: z.array(z.string().min(1).max(320)).min(1).max(2),
  }),
  status: z.array(status).min(1),
  note: z.string().max(240).optional(),
  links: z.array(link).max(3),
  ledger,
});

const row = z.strictObject({
  name: z.string().min(1),
  meta: z.string().min(1).max(80),
  text: z.string().min(1).max(640),
  links: z.array(link).max(2),
  ledger,
});

const Site = z.strictObject({
  name: z.string(),
  role: z.string().max(80),
  description: z.string().max(200),
  hero: z.strictObject({ lead: z.string().max(160), follow: z.string().max(160) }),
  profiles: z.array(link).min(1),
  source: link,
  selected: z.strictObject({ blocks: z.array(block).min(1), rows: z.array(row) }),
  building: z.strictObject({ blocks: z.array(block).min(1) }),
  community: z.array(z.strictObject({ title: z.string(), intro: z.string().max(320).optional(), rows: z.array(row).min(1) })).min(1),
  security: z.array(z.strictObject({ label: z.string().max(24), text: z.string().max(560), ledger })).min(1),
  writing: z.array(z.strictObject({
    date: z.string().regex(/^\d{4}-\d{2}$/),
    title: z.string(),
    meta: z.string().max(80),
    argument: z.string().max(320),
    link: link.optional(),
    ledger,
  })).min(1),
  education: z.array(z.strictObject({ credential: z.string(), detail: z.string().max(200), ledger })).min(1),
  contact: z.strictObject({
    intro: z.string().max(320),
    topics: z.array(z.strictObject({ value: z.enum(['work', 'question', 'other']), label: z.string() })).length(3),
  }),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const site = Site.parse({
  name: 'Enrique Oti IV',
  role: 'Software engineer',
  description:
    'Enrique Oti IV builds software that turns forms and paperwork into documents a program can fill and a person can sign.',
  hero: {
    lead: 'I build software that turns forms and paperwork into documents a program can fill and a person can sign.',
    follow: 'The biggest is Airmark, an Air Force correspondence app with more than 50,000 users.',
  },
  profiles: [
    { label: 'GitHub', href: 'https://github.com/ark-232' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/eaoti/' },
  ],
  source: { label: 'Source on GitHub', href: 'https://github.com/ark-232/arkwerx.com' },

  selected: {
    blocks: [
      {
        name: 'Airmark',
        years: '2026–',
        role: 'Core developer on the Tongue to Quill team, since April 2026',
        does:
          'Airmark generates Air Force correspondence in the official format, replacing hand-built Word files. Under it is Quillmark, the team’s open-source engine, which turns Markdown and a schema-checked template into a finished document typeset with Typst.',
        detail: {
          label: 'Proof',
          items: [
            'More than 50,000 Air Force users, in every state and 55 countries, have made about 97,000 documents with it.',
            'It holds an Authorization to Operate and handles Controlled Unclassified Information.',
          ],
        },
        status: ['Shipped'],
        links: [
          { label: 'Team page', href: 'https://tonguetoquill.com/about' },
          { label: 'Quillmark engine', href: 'https://github.com/borb-sh/quillmark' },
        ],
        ledger: ['ttq-01', 'ttq-02', 'ttq-03', 'ttq-04', 'ttq-05', 'ttq-09', 'ttq-m1', 'ttq-m2'],
      },
      {
        name: 'quillify',
        years: '2026–',
        role: 'Architect and lead developer',
        does:
          'An open-source TypeScript and WebAssembly library that turns a published PDF form into a Quillmark template that software can fill and render, all in the browser. That includes dynamic XFA forms, which only Acrobat can lay out.',
        detail: {
          label: 'Proof',
          items: [
            'It converts most of the Air Force’s published forms with every field read back in place.',
            'Its npm releases carry signed build provenance from the public repository.',
          ],
        },
        status: ['Shipped', 'Open source'],
        links: [
          { label: 'GitHub', href: 'https://github.com/tonguetoquill/quillify' },
          { label: 'npm', href: 'https://www.npmjs.com/package/@quillmark/quillify' },
        ],
        ledger: ['ttq-10', 'ttq-11', 'ttq-12', 'ttq-14', 'ttq-26'],
      },
      {
        name: 'Quillmark MCP server',
        years: '2026–',
        role: 'Lead developer',
        does:
          'Lets any MCP-compatible AI assistant list document templates, read their schemas and render finished documents, through three tools over Streamable HTTP or stdio.',
        detail: {
          label: 'Proof',
          items: [
            'Its templates include the official Air Force memorandum, so an assistant can hand back a finished document that is ready to sign.',
            'It ships a hardened container: a non-root user, a read-only root filesystem, every Linux capability dropped and privilege escalation blocked.',
          ],
        },
        status: ['Open source'],
        links: [{ label: 'GitHub', href: 'https://github.com/tonguetoquill/quillmark-mcp' }],
        ledger: ['ttq-15', 'ttq-16', 'ttq-17', 'ttq-18', 'ttq-27'],
      },
    ],
    rows: [
      {
        name: 'Sandtable',
        meta: 'Designed and built · Prototype, closed source',
        text:
          'Tabletop-exercise software. A one-paragraph scenario becomes phases, objectives and suggested injects, each inject renders as a finished document through the MCP server, and players follow a live map of open-source data (earthquakes, geocoded news, aircraft positions). I demonstrated it to the staff of a major Air Force command in May 2026, and they asked me to brief it across the headquarters.',
        links: [],
        ledger: ['ttq-19', 'ttq-20', 'ttq-21', 'ttq-22'],
      },
      {
        name: 'fletch',
        meta: 'Built · Demonstration build, private',
        text:
          'A headless form-filling service. It converts a published government form once, then creates and edits documents over an HTTP API and returns a filled PDF that can still be signed.',
        links: [],
        ledger: ['ttq-23', 'ttq-25'],
      },
    ],
  },

  building: {
    blocks: [
      {
        name: 'Dewline',
        years: '2026–',
        role: 'Solo. I designed the architecture and roadmap and built the scaffold: the Rust engine, the Mac app shell and CI.',
        does:
          'A native Mac markdown editor for files that coding agents also edit. When an agent, git or a sync app rewrites a file you have open, Dewline is built to mark the change, name the writer and take a snapshot first.',
        detail: {
          label: 'Design',
          items: [
            'Every outside write takes one path: detect it, compare it with the last known contents, snapshot, three-way merge, and save only if the disk still matches. Opening a file never rewrites its bytes.',
            'Swift and AppKit own the pixels and the keystroke path. A Rust engine owns the bytes, reached through UniFFI and kept off the keystroke path.',
          ],
        },
        status: ['In development'],
        note: 'Free, with no account, no telemetry and no AI in the editor. Source-available under FSL-1.1; each release becomes Apache-2.0 two years after it ships.',
        links: [{ label: 'GitHub', href: 'https://github.com/ark-232/dewline' }],
        ledger: ['own-01', 'own-02', 'own-03', 'own-04', 'own-05', 'own-06', 'own-m5'],
      },
      {
        name: 'Northlight',
        years: '2026–',
        role: 'Solo. One Swift package of models, feeds and SwiftUI widgets, shared by the tvOS app and the Mac menu bar app.',
        does:
          'A widget dashboard for Apple TV with a Mac menu bar companion: up to six pages of weather, agenda, aurora, aircraft overhead, space weather, launches, GitHub activity, network health and a morning briefing. I built it to replace a home screen full of ads.',
        detail: {
          label: 'Design',
          items: [
            'There is no backend. The TV calls public APIs directly, and the Mac talks only to the TV, over an encrypted local-network channel.',
            'Credentials stay in the Apple TV’s keychain, outside services see the location rounded to about 1 km, and the Mac redacts agent status and writes the briefing with an on-device model.',
          ],
        },
        status: ['In development'],
        note: 'It runs on my own Apple TV. The code is private, and TestFlight builds are planned.',
        links: [],
        ledger: ['own-07', 'own-08', 'own-09', 'own-10', 'own-11', 'own-12'],
      },
      {
        name: 'PNGres',
        years: '2026',
        role: 'Solo',
        does:
          'A deliberately impractical Rust file store that hides any file in the low bits of PNG pictures of a monkey and reassembles it byte for byte, checked with BLAKE3.',
        detail: {
          label: 'Proof',
          items: [
            'It answers HTTP range requests, so a video streams and seeks straight out of the images, and separate instances pull and verify each other’s shards over plain HTTP.',
            'Each image keeps its header twice, in a private PNG chunk and in the pixels, so a file still decodes after an image editor strips the metadata.',
          ],
        },
        status: ['Open source'],
        note: 'Its own FAQ says it is not for production. The 21-page spec is under Writing.',
        links: [{ label: 'GitHub', href: 'https://github.com/ark-232/pngres' }],
        ledger: ['own-13', 'own-14', 'own-15', 'own-16', 'own-17', 'own-18', 'own-m5'],
      },
    ],
  },

  community: [
    {
      title: 'DAF Company Grade Officers’ Council, volunteer since January 2025',
      intro:
        'A volunteer council for more than 47,000 junior officers across the Air Force, Air Force Reserve, Air National Guard and Space Force. I am its Deputy Technology Director, and I build its sites.',
      rows: [
        {
          name: 'dafcgoc.org',
          meta: 'Build and maintain, with the Technology Director',
          text:
            'The council’s public site and the hub for its members, with an interactive map of local councils. It is static, on GitHub Pages, with no build step. In 2026 I redesigned its pages and rebuilt the navigation for accessibility and phones.',
          links: [{ label: 'dafcgoc.org', href: 'https://dafcgoc.org/' }],
          ledger: ['cgoc-01', 'cgoc-02', 'cgoc-03', 'cgoc-04', 'cgoc-14'],
        },
        {
          name: 'Penpal',
          meta: 'Sole developer · In production since August 2026',
          text:
            'Pairs cadets about to commission and new lieutenants with junior officers at their first duty station, so the advice comes from someone who just lived it. It runs serverless on free tiers, and its security lives in the database rules: sign-ups are create-only and readable only by allowlisted staff, and the staff dashboard writes every change to an audit log that nobody can edit or delete.',
          links: [{ label: 'penpal.dafcgoc.org', href: 'https://penpal.dafcgoc.org/' }],
          ledger: ['cgoc-06', 'cgoc-07', 'cgoc-08', 'cgoc-09', 'cgoc-10', 'cgoc-m1', 'cgoc-14'],
        },
        {
          name: 'Think Tank',
          meta: 'Designed and built · In development',
          text:
            'The sign-up site for the council’s Think Tank, a program in development that will put junior officers in research cohorts with Air University and present their papers to senior Air Force leaders. It reuses Penpal’s serverless pattern.',
          links: [{ label: 'thinktank.dafcgoc.org', href: 'https://thinktank.dafcgoc.org/' }],
          ledger: ['cgoc-11', 'cgoc-12', 'cgoc-13'],
        },
      ],
    },
    {
      title: 'Earlier, at the U.S. Air Force Academy, 2021 to 2025',
      rows: [
        {
          name: 'FalconNet',
          meta: 'Led a five-person team · 2023 to 2024',
          text:
            'The Academy’s accountability and operations system for more than 4,100 cadets: sign-outs and passes, attendance at required events and room inspections, in one app for iOS, Android and the web. Two teammates wrote the back end and the front end. I led the team and ran integration, the release pipeline, the security review and production. Version 2.0 launched in September 2023, and the app logged more than a million sessions between January and mid-August 2024.',
          links: [{ label: 'Help-desk site source', href: 'https://github.com/FalconNetCohort/fn-support' }],
          ledger: ['academy-01', 'academy-02', 'academy-03', 'academy-04', 'academy-05', 'academy-07', 'academy-m3'],
        },
        {
          name: 'CadetNet',
          meta: 'Led the service',
          text:
            'A student-run internet service in the Academy dormitories, with about 3,200 paying users at its peak, about 600 wireless access points and, by October 2024, more than 10,000 registered devices. I built its IPsec VPN server on Linux in Google Cloud, configured its Juniper switches and Aruba access points, and recruited and trained the volunteers who ran it. In 2025 I led its planned shutdown after the Academy ended student-run internet service.',
          links: [],
          ledger: ['academy-08', 'academy-09', 'academy-10', 'academy-11'],
        },
        {
          name: 'Bravo 11 hackathon',
          meta: 'Led a five-person team · February 2024',
          text:
            'Most Versatile Solution award at a Department of Defense hackathon with about 600 participants. Our decision-support tool turned logistics and shipping transactions into a weighted, time-reversed flow graph to trace supply chains, attribute suppliers and measure how heavily each path between two parties is used.',
          links: [],
          ledger: ['academy-15', 'academy-16'],
        },
        {
          name: 'Project PEAK',
          meta: 'Senior capstone, team of four',
          text:
            'Low-cost sensor nodes that passively log radio, Wi-Fi and Bluetooth signals, a first step toward locating emitters without transmitting. I wrote the design specification and most of the software: a Python collector that detects attached radios and a FastAPI controller with a live heatmap, in Docker. Bench tests logged Wi-Fi and Bluetooth LE traffic and raw ADS-B frames at 1090 MHz. Direction finding and position fixing were designed but not built.',
          links: [],
          ledger: ['academy-17', 'academy-18', 'academy-19', 'academy-20'],
        },
      ],
    },
  ],

  security: [
    {
      label: 'Competition',
      text:
        'From 2021 to 2025 I competed on the Air Force Academy’s cyber competition team, which won the NSA Cyber Exercise in 2023 and 2025 and the collegiate capture-the-flag at the Rocky Mountain Cyberspace Symposium in 2023. As deputy captain I helped run a team of more than 40, planning its training and picking its competitions. I co-wrote our host-hardening and network tooling and wrote containerized exploitation challenges, with worked solutions, for the training range.',
      ledger: ['academy-12', 'academy-13', 'academy-14', 'academy-m1'],
    },
    {
      label: 'Hostile input',
      text:
        'quillify treats every PDF as hostile, so the page comes back without its form layer, scripts, attachments or metadata. fletch runs that converter in sandboxed headless Chromium with every outside request blocked, and the engine re-checks each converted template at the trust boundary.',
      ledger: ['ttq-13', 'ttq-24'],
    },
    {
      label: 'Accreditation',
      text:
        'I designed and wrote a reference track for government cloud accreditation: Terraform for AWS GovCloud tagged to NIST 800-53 controls, Kyverno admission policy, an Iron Bank hardening manifest and OWASP ZAP scanning in CI. It exists as code and a CI scan; no environment has run it yet.',
      ledger: ['ttq-07', 'ttq-08'],
    },
    {
      label: 'Certification',
      text: 'CompTIA Security+ (SY0-701), October 2026, valid through October 2029.',
      ledger: ['education-04'],
    },
  ],

  writing: [
    {
      date: '2026-04',
      title: 'PNGres: A Primate-Addressable Persistence Layer',
      meta: 'Technical specification, v0.2 · 21 pages, typeset in Typst',
      argument:
        'The on-disk format, HTTP API, live event model, peer-to-peer pull protocol, measured performance and an operator’s handbook for a file store that lives in pictures of a monkey.',
      link: { label: 'Read the PDF', href: 'https://github.com/ark-232/pngres/blob/main/docs/tech-specs.pdf' },
      ledger: ['writing-01', 'writing-02', 'writing-03', 'writing-04'],
    },
    {
      date: '2026-04',
      title: 'Reforming the Long Blue Line: Rethinking How USAFA Builds Leaders for an Era of Great-Power Competition',
      meta: 'Essay, with David Petzold · about 3,000 words',
      argument:
        'Argues that the Air Force Academy’s cadet development model is too centralized and risk-averse, and proposes a leadership sandbox where cadets hold real authority within set limits.',
      ledger: ['writing-05', 'writing-06', 'writing-07', 'writing-08', 'writing-09'],
    },
  ],

  education: [
    {
      credential: 'MSc, Countering Extremist Crime and Terrorism',
      detail: 'University College London, Department of Security and Crime Science · started September 2026, in progress',
      ledger: ['education-02'],
    },
    {
      credential: 'B.S., Computer Science and Cyber Science, minor in Russian',
      detail: 'U.S. Air Force Academy · 2025',
      ledger: ['education-01', 'education-05'],
    },
    {
      credential: 'Languages and tools',
      detail: 'TypeScript, JavaScript, Python, Rust, Swift, Bash and SQL. Svelte, React, Next.js, Flask, FastAPI, SwiftUI and Firebase.',
      ledger: ['education-06', 'education-07'],
    },
  ],

  contact: {
    intro:
      'Write if you would like to work together, have a question about quillify or the MCP server, or want a second set of eyes on something you are building. It comes straight to my inbox, and I reply from my own address.',
    topics: [
      { value: 'work', label: 'Working together' },
      { value: 'question', label: 'A question about my work' },
      { value: 'other', label: 'Something else' },
    ],
  },
  updated: '2026-10-26',
});

export type Site = z.infer<typeof Site>;
