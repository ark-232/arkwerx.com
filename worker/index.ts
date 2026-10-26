import { EMAIL, LIMITS, TOPICS, cleanName, type Topic } from '../src/contact-rules.ts';

const FROM = { email: 'form@arkwerx.com', name: 'arkwerx.com contact form' };
const MIN_ELAPSED_MS = 3000;
// A 4,000-character message of four-byte characters, form-encoded, is about 48 KB.
const MAX_BODY_BYTES = 65_536;

declare global {
  interface Env {
    // Comma-separated verified Email Routing destinations, set with `wrangler secret put CONTACT_TO`.
    CONTACT_TO: string;
  }
}

type ContactEnv = Pick<Env, 'EMAIL' | 'CONTACT_LIMIT' | 'CONTACT_LIMIT_ALL' | 'CONTACT_TO'>;

function json(body: object, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

// One IPv6 client usually holds a whole /64, so the limit applies to the prefix.
export function senderKey(ip: string) {
  return ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
}

export async function contact(request: Request, env: ContactEnv): Promise<Response> {
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'invalid' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'invalid' }, 400);
  }
  const field = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };

  // Bots that fill the hidden field or submit faster than a person can type get a quiet success.
  if (field('botcheck')) return json({ ok: true });
  if (!(Number(field('elapsed')) >= MIN_ELAPSED_MS)) return json({ ok: true });

  const name = cleanName(field('name'));
  const email = field('email').trim();
  const topic = field('topic');
  const message = field('message').replace(/\r\n?/g, '\n').trim();

  const invalid: string[] = [];
  if (!name || name.length > LIMITS.name) invalid.push('name');
  if (email.length > LIMITS.email || !EMAIL.test(email)) invalid.push('email');
  if (!Object.hasOwn(TOPICS, topic)) invalid.push('topic');
  if (!message || message.length > LIMITS.message) invalid.push('message');
  if (invalid.length) return json({ error: 'invalid', fields: invalid }, 400);

  const sender = await env.CONTACT_LIMIT.limit({ key: senderKey(request.headers.get('CF-Connecting-IP') ?? 'unknown') });
  const everyone = await env.CONTACT_LIMIT_ALL.limit({ key: 'all' });
  if (!sender.success || !everyone.success) return json({ error: 'rate_limited' }, 429);

  const to = env.CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean);
  if (!to.length) {
    console.error('contact: CONTACT_TO is empty');
    return json({ error: 'unavailable' }, 502);
  }
  try {
    await env.EMAIL.send({
      to,
      from: FROM,
      replyTo: { email, name },
      subject: `${TOPICS[topic as Topic]}: ${name}`,
      text: `${message}\n\n${name} <${email}>\nSent from the contact form on arkwerx.com.`,
    });
  } catch (error) {
    // The code names the failure; the message can quote addresses, so it stays out of the log.
    console.error('contact: send failed', (error as { code?: string }).code ?? 'no code');
    return json({ error: 'unavailable' }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api/contact') return json({ error: 'not_found' }, 404);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    return contact(request, env);
  },
} satisfies ExportedHandler<Env>;
