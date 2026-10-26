import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('check-dist fails on a planted street address', () => {
  const run = spawnSync(process.execPath, ['scripts/check-dist.mjs', 'tests/fixtures/pii'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /street address/);
});
