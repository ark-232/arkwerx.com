// Fails the build if the output could publish contact details, or if the shipped JavaScript outgrows its budget.
// Usage: node scripts/check-dist.mjs <dir>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const JS_BUDGET_GZIP = 16 * 1024;
const TEXT = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg', '.webmanifest', '']);

const STATES =
  'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming';
const STATE_CODES = 'A[AEKLPRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY]';
const SUFFIX =
  'St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Ter|Terrace|Cir|Circle|Pkwy|Parkway|Hwy|Highway|Loop|Trl|Trail';

export const PATTERNS = [
  ['mailto or tel link', /\b(?:mailto|tel):/i],
  ['email address', /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/iu],
  ['phone number', /(?:\+?1[\s.\-–]?)?\(?\b[2-9]\d{2}\)?[\s.\-–]\d{3}[\s.\-–]\d{4}\b/],
  ['international phone number', /\+\d{1,3}[\s.\-–]?\d{2,4}[\s.\-–]\d{3,4}[\s.\-–]\d{3,4}\b/],
  ['street address', new RegExp(`\\b\\d{1,6}\\s+(?:[NSEW]\\.?\\s+|(?:North|South|East|West)\\s+)?(?:[\\p{L}\\d]+\\s+){1,3}(?:${SUFFIX})\\b`, 'iu')],
  ['PO box', /\bP\.?\s?O\.?\s+Box\s+\d+/i],
  ['military mail address', /\b[AFD]PO\s+A[AEP]\s+\d{5}\b/i],
  ['state and ZIP code', new RegExp(`\\b(?:${STATE_CODES}|${STATES}),?\\s+\\d{5}(?:-\\d{4})?\\b`, 'i')],
];

// Phone numbers written as one digit run (JSON-LD, tel-style text) only show up once separators are gone.
const DIGIT_RUN = /\+?(?:\d[\s().\-–]*){10,15}/g;

const METADATA = [/Exif\0\0/, /eXIf/, /<x:xmpmeta/, /http:\/\/ns\.adobe\.com\/xap/];

// Undoes the encodings that hide an @ or a digit from a plain search: HTML entities, percent-encoding and \u escapes.
export function normalize(text) {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&commat;/gi, '@')
    .replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u\{?([0-9a-f]{4,5})\}?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

export function problemsIn(path, buf) {
  const problems = [];
  const isText = TEXT.has(extname(path));
  if (!isText) {
    const raw = buf.toString('latin1');
    for (const marker of METADATA) if (marker.test(raw)) problems.push(`${path}: image metadata (${marker.source})`);
  }
  // Binary files are also searched as runs of printable ASCII, where metadata text would sit.
  const text = normalize(isText ? buf.toString('utf8') : buf.toString('latin1').match(/[\x20-\x7e]{8,}/g)?.join('\n') ?? '');
  for (const [label, pattern] of PATTERNS) {
    const match = text.match(pattern);
    if (match) problems.push(`${path}: ${label}: "${match[0]}"`);
  }
  if (extname(path) === '.html') {
    const visible = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
    for (const run of visible.match(DIGIT_RUN) ?? []) {
      const digits = run.replace(/\D/g, '').length;
      if (digits >= 10 && digits <= 15) problems.push(`${path}: phone number as a digit run: "${run.trim()}"`);
    }
  }
  return problems;
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function main(dir) {
  const problems = [];
  let jsBytes = 0;
  for (const path of files(dir)) {
    const buf = readFileSync(path);
    problems.push(...problemsIn(path, buf));
    if (extname(path) === '.js') jsBytes += gzipSync(buf).length;
    if (extname(path) === '.html') {
      for (const [, body] of buf.toString('utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
        jsBytes += gzipSync(body).length;
      }
    }
  }
  if (jsBytes > JS_BUDGET_GZIP) problems.push(`JavaScript is ${jsBytes} bytes gzipped, over the ${JS_BUDGET_GZIP}-byte budget`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`check-dist: ${dir} clean; JavaScript ${jsBytes} bytes gzipped of ${JS_BUDGET_GZIP}`);
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/check-dist.mjs <dir>');
    process.exit(2);
  }
  main(dir);
}
