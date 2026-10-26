# arkwerx.com

Source for [arkwerx.com](https://arkwerx.com), the site of Enrique Oti IV. Astro builds the page to static files, and one Cloudflare Worker serves them and handles the contact form.

## Develop

```sh
npm ci
npm run build
npm run preview        # site and Worker at http://127.0.0.1:8788
npm test               # Worker and gate tests, then Playwright and axe
```

`npm run preview` needs a `.dev.vars` file (git-ignored) with `CONTACT_TO="a@example.com,b@example.com"`. Locally, sent mail goes to Wrangler's simulator, not to an inbox.

Content lives in `src/content/site.ts`, checked by Zod at build time. Every entry carries the IDs of the facts it rests on, from a ledger kept outside this repo.

## Deploy

```sh
npm run deploy         # build, check-dist, html-validate, then wrangler deploy
```

The Worker sends contact mail through the Email Routing `send_email` binding. Sending is free because every recipient is a verified destination address. The recipients are a Worker secret, never in this repo:

```sh
npx wrangler secret put CONTACT_TO
```

The page sets no cookies and loads nothing from other origins. Security headers live in `public/_headers`. The CSP allows only `'self'`, so scripts and styles stay in external files.

## Project subdomains

Each project gets its own Worker, with a custom domain `<name>.arkwerx.com`. The repo name matches the subdomain. There are no wildcard records, and the custom domain comes off before a Worker is deleted.
