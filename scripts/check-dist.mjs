// Fails the build if the output could publish contact details, or if the shipped JavaScript outgrows its budget.
// Usage: node scripts/check-dist.mjs <dir>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const JS_BUDGET_GZIP = 16 * 1024;
const TEXT = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg', '.webmanifest', '']);

const PATTERNS = [
  ['mailto or tel link', /\b(?:mailto|tel):/i],
  ['email address', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['phone number', /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b/],
  ['international phone number', /\+\d{1,3}[\s.-]?\d{2,4}[\s.-]\d{3,4}[\s.-]\d{3,4}\b/],
  ['street address', /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Ter|Cir|Pkwy|Hwy)\b\.?/],
  ['PO box', /\bP\.?\s?O\.?\s+Box\s+\d+/i],
  ['state and ZIP code', /\b(?:A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\s\d{5}(?:-\d{4})?\b/],
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Binary files are checked as runs of printable ASCII, which is where EXIF, XMP and container metadata live.
function textOf(path) {
  const buf = readFileSync(path);
  if (TEXT.has(extname(path))) return buf.toString('utf8');
  return buf.toString('latin1').match(/[\x20-\x7e]{8,}/g)?.join('\n') ?? '';
}

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/check-dist.mjs <dir>');
  process.exit(2);
}

const problems = [];
let jsBytes = 0;
for (const path of files(dir)) {
  const text = textOf(path);
  for (const [label, pattern] of PATTERNS) {
    const match = text.match(pattern);
    if (match) problems.push(`${path}: ${label}: "${match[0]}"`);
  }
  if (extname(path) === '.js') jsBytes += gzipSync(readFileSync(path)).length;
  if (extname(path) === '.html') {
    for (const [, body] of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
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
