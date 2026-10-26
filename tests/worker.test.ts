import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, { contact, senderKey } from '../worker/index.ts';

const ORIGIN = 'https://arkwerx.com';

function fakeEnv({ limited = false, sendError = false, to = 'first@example.com, second@example.com' } = {}) {
  const sent: unknown[] = [];
  const keys: string[] = [];
  const env = {
    CONTACT_TO: to,
    CONTACT_LIMIT: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: !limited }) },
    CONTACT_LIMIT_ALL: { limit: async () => ({ success: true }) },
    EMAIL: {
      send: async (message: unknown) => {
        if (sendError) throw Object.assign(new Error('down'), { code: 'E_INTERNAL_SERVER_ERROR' });
        sent.push(message);
        return { messageId: 'test' };
      },
    },
  };
  return { env: env as never, sent, keys };
}

function post(fields: Record<string, string>, origin = ORIGIN, ip = '203.0.113.7') {
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers: { Origin: origin, 'CF-Connecting-IP': ip },
    body: new URLSearchParams(fields),
  });
}

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  topic: 'question',
  message: 'Does quillify read XFA forms?',
  botcheck: '',
  elapsed: '9000',
};

test('sends a valid message to every recipient with reply-to set to the sender', async () => {
  const { env, sent } = fakeEnv();
  const res = await contact(post(valid), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    to: ['first@example.com', 'second@example.com'],
    from: { email: 'form@arkwerx.com', name: 'arkwerx.com contact form' },
    replyTo: { email: 'ada@example.com', name: 'Ada Lovelace' },
    subject: 'A question about my work: Ada Lovelace',
    text: 'Does quillify read XFA forms?\n\nAda Lovelace <ada@example.com>\nSent from the contact form on arkwerx.com.',
  });
});

test('refuses a post from another origin', async () => {
  const { env, sent } = fakeEnv();
  const res = await contact(post(valid, 'https://evil.example'), env);
  assert.equal(res.status, 403);
  assert.equal(sent.length, 0);
});

test('quietly drops a filled honeypot and a too-fast submission', async () => {
  for (const fields of [{ ...valid, botcheck: 'x' }, { ...valid, elapsed: '900' }, { ...valid, elapsed: '' }]) {
    const { env, sent } = fakeEnv();
    const res = await contact(post(fields), env);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(sent.length, 0);
  }
});

test('names every invalid field', async () => {
  const { env, sent } = fakeEnv();
  const res = await contact(post({ ...valid, name: '', email: 'not-an-address', topic: 'spam', message: ' ' }), env);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid', fields: ['name', 'email', 'topic', 'message'] });
  assert.equal(sent.length, 0);
});

test('rejects a message over 4,000 characters', async () => {
  const { env } = fakeEnv();
  const res = await contact(post({ ...valid, message: 'x'.repeat(4001) }), env);
  assert.deepEqual(await res.json(), { error: 'invalid', fields: ['message'] });
});

test('turns control characters and line separators in the name into spaces', async () => {
  for (const name of ['Ada\r\nBcc: someone@example.com', 'Ada\u2028Bcc: someone@example.com', 'Ada\u000bBcc: someone@example.com']) {
    const { env, sent } = fakeEnv();
    await contact(post({ ...valid, name }), env);
    const message = sent[0] as { subject: string; replyTo: { name: string } };
    assert.equal(message.subject, 'A question about my work: Ada Bcc: someone@example.com');
    assert.ok(!/[\p{Cc}\p{Zl}\p{Zp}]/u.test(message.replyTo.name));
  }
});

test('accepts a long message in a non-Latin script', async () => {
  const { env, sent } = fakeEnv();
  const message = 'ж'.repeat(4000);
  const body = new URLSearchParams({ ...valid, message }).toString();
  const res = await contact(
    new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.7', 'Content-Length': String(Buffer.byteLength(body)) },
      body: new URLSearchParams({ ...valid, message }),
    }),
    env,
  );
  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);
});

test('limits an IPv6 client by its /64', async () => {
  assert.equal(senderKey('2001:db8:abcd:12:1:2:3:4'), '2001:db8:abcd:12');
  assert.equal(senderKey('203.0.113.7'), '203.0.113.7');
  const { env, keys } = fakeEnv();
  await contact(post(valid, ORIGIN, '2001:db8:abcd:12:ffff::1'), env);
  assert.deepEqual(keys, ['2001:db8:abcd:12']);
});

test('reports an empty recipient list instead of sending', async () => {
  const { env, sent } = fakeEnv({ to: ' , ' });
  const res = await contact(post(valid), env);
  assert.equal(res.status, 502);
  assert.equal(sent.length, 0);
});

test('stops at the rate limit and reports a send failure', async () => {
  const limited = fakeEnv({ limited: true });
  assert.equal((await contact(post(valid), limited.env)).status, 429);
  assert.equal(limited.sent.length, 0);
  const failing = fakeEnv({ sendError: true });
  const res = await contact(post(valid), failing.env);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'unavailable' });
});

test('answers only POST /api/contact', async () => {
  const { env } = fakeEnv();
  const get = await worker.fetch(new Request(`${ORIGIN}/api/contact`), env, {} as never);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('Allow'), 'POST');
  const other = await worker.fetch(new Request(`${ORIGIN}/api/other`, { method: 'POST' }), env, {} as never);
  assert.equal(other.status, 404);
});
