import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { problemsIn } from '../scripts/check-dist.mjs';

const page = (body: string) => Buffer.from(`<!doctype html><title>t</title><p>${body}</p>`);

const caught: [string, string][] = [
  ['email address', 'write to jane.doe@example.org'],
  ['email hidden by an entity', 'jane&#64;example.org'],
  ['email hidden by percent-encoding', 'jane%40example.org'],
  ['mailto link', '<a href="mailto:x">x</a>'],
  ['phone number', 'call (907) 555-0100'],
  ['phone number with an en dash', '907–555–0100'],
  ['phone number as one digit run', 'phone 9075550100'],
  ['international phone number', '+44 20 7946 0958'],
  ['street address with a full suffix word', '100 Elm Circle'],
  ['street address with a directional', '1234 N Main St'],
  ['street address with an ordinal', '350 5th Ave'],
  ['street address in capitals', '1600 PENNSYLVANIA AVENUE'],
  ['PO box', 'P.O. Box 1234'],
  ['military mail address', 'APO AE 09012'],
  ['state and ZIP code', 'Anchorage, Alaska 99506'],
  ['state code and ZIP code', 'Anchorage, AK 99506'],
];

const clean = [
  'Airmark · 50,000+ Air Force users',
  'Sites for a council of 47,000+ junior officers.',
  'Sole developer of Penpal, live since August 2026.',
  'npm i @quillmark/quillify',
  'U.S. Air Force Academy, 2025',
];

for (const [label, body] of caught) {
  test(`catches ${label}`, () => {
    assert.notEqual(problemsIn('index.html', page(body)).length, 0, body);
  });
}

test('passes the copy the site actually uses', () => {
  for (const body of clean) assert.deepEqual(problemsIn('index.html', page(body)), [], body);
});

test('fails an image that carries EXIF or XMP metadata', () => {
  assert.notEqual(problemsIn('photo.jpg', Buffer.from('\xff\xd8\xff\xe1\0\x10Exif\0\0MM', 'latin1')).length, 0);
  assert.notEqual(problemsIn('shot.png', Buffer.from('\x89PNG....iTXtXML:com.adobe.xmp\0<x:xmpmeta>', 'latin1')).length, 0);
  assert.deepEqual(problemsIn('icon.png', Buffer.from('\x89PNG\r\n\x1a\n....IHDR....IDAT', 'latin1')), []);
});

test('check-dist exits 1 on a planted street address', () => {
  const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', 'tests/fixtures/pii'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /street address/);
});
