const form = document.querySelector<HTMLFormElement>('form.contact-form');
if (form) wire(form);

type Problem = { name: string; message: string };

const MESSAGES = {
  name: 'Enter your name.',
  email: 'Enter an email address I can reply to.',
  topic: 'Pick what it is about.',
  message: 'Write a message.',
  long: 'Keep it under 4,000 characters.',
  failed: 'Your message did not send. Your text is still here, so try again in a minute, or reach me on LinkedIn.',
  limited: 'Too many messages from your connection just now. Wait a minute and send it again.',
};

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

function wire(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('.form-status')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const sent = document.getElementById('contact-sent')!;

  const setError = (name: string, message: string) => {
    const el = document.getElementById(`c-${name}-error`);
    if (el) el.textContent = message;
    form.querySelectorAll<HTMLElement>(`[name="${name}"]`).forEach((input) => {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  };

  const check = (data: FormData): Problem[] => {
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const problems: Problem[] = [];
    if (!name || name.length > 100) problems.push({ name: 'name', message: MESSAGES.name });
    if (email.length > 254 || !EMAIL.test(email)) problems.push({ name: 'email', message: MESSAGES.email });
    if (!data.get('topic')) problems.push({ name: 'topic', message: MESSAGES.topic });
    if (!message) problems.push({ name: 'message', message: MESSAGES.message });
    else if (message.length > 4000) problems.push({ name: 'message', message: MESSAGES.long });
    return problems;
  };

  const show = (problems: Problem[]) => {
    for (const field of ['name', 'email', 'topic', 'message']) {
      setError(field, problems.find((p) => p.name === field)?.message ?? '');
    }
    const first = problems[0];
    if (first) form.querySelector<HTMLElement>(`[name="${first.name}"]`)?.focus();
  };

  const done = () => {
    form.hidden = true;
    sent.hidden = false;
    sent.querySelector<HTMLElement>('h3')?.focus();
  };

  const fail = (message: string) => {
    button.disabled = false;
    status.textContent = message;
    status.classList.add('is-error');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('botcheck')) return done();

    const problems = check(data);
    show(problems);
    if (problems.length) return;

    button.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Sending…';

    const body = new URLSearchParams();
    for (const [key, value] of data) if (typeof value === 'string') body.append(key, value);
    body.set('elapsed', String(Math.round(performance.now())));

    let response: Response;
    let reply: { ok?: boolean; error?: string; fields?: string[] };
    try {
      response = await fetch(form.action, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
      reply = await response.json();
    } catch {
      return fail(MESSAGES.failed);
    }

    if (response.ok && reply.ok) return done();
    if (reply.error === 'rate_limited') return fail(MESSAGES.limited);
    if (reply.error === 'invalid' && reply.fields?.length) {
      button.disabled = false;
      status.textContent = '';
      return show(reply.fields.map((name) => ({ name, message: MESSAGES[name as keyof typeof MESSAGES] ?? MESSAGES.failed })));
    }
    fail(MESSAGES.failed);
  });
}
