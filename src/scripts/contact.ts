import { EMAIL, LIMITS, cleanName } from '../contact-rules';

const FIELD_ERRORS: Record<string, string> = {
  name: 'Enter your name.',
  email: 'Enter an email address I can reply to.',
  topic: 'Pick a topic.',
  message: 'Write a message.',
};
const TOO_LONG = 'Keep it under 4,000 characters.';
const FAILED = 'That didn’t send. Try again.';
const LIMITED = 'Too many messages from your connection just now. Wait a minute and send it again.';

type Problem = { name: string; message: string };

const form = document.querySelector<HTMLFormElement>('form.contact-form')!;
const status = form.querySelector<HTMLElement>('.form-status')!;
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const sent = document.getElementById('contact-sent')!;

// The form ships hidden, so a visitor whose script never runs sees the note instead of a form that cannot send.
form.hidden = false;
document.querySelector<HTMLElement>('.js-off')!.hidden = true;

function setError(name: string, message: string) {
  document.getElementById(`c-${name}-error`)!.textContent = message;
  for (const input of form.querySelectorAll<HTMLElement>(`[name="${name}"]`)) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function check(data: FormData): Problem[] {
  const name = cleanName(String(data.get('name') ?? ''));
  const email = String(data.get('email') ?? '').trim();
  const message = String(data.get('message') ?? '').trim();
  const problems: Problem[] = [];
  if (!name || name.length > LIMITS.name) problems.push({ name: 'name', message: FIELD_ERRORS.name });
  if (email.length > LIMITS.email || !EMAIL.test(email)) problems.push({ name: 'email', message: FIELD_ERRORS.email });
  if (!data.get('topic')) problems.push({ name: 'topic', message: FIELD_ERRORS.topic });
  if (!message) problems.push({ name: 'message', message: FIELD_ERRORS.message });
  else if (message.length > LIMITS.message) problems.push({ name: 'message', message: TOO_LONG });
  return problems;
}

function show(problems: Problem[]) {
  for (const field of Object.keys(FIELD_ERRORS)) {
    setError(field, problems.find((p) => p.name === field)?.message ?? '');
  }
  if (problems[0]) form.querySelector<HTMLElement>(`[name="${problems[0].name}"]`)?.focus();
}

function done() {
  form.hidden = true;
  sent.hidden = false;
  sent.querySelector<HTMLElement>('h3')!.focus();
}

function fail(message: string) {
  button.disabled = false;
  status.textContent = message;
  status.classList.add('is-error');
}

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
    return fail(FAILED);
  }

  if (response.ok && reply.ok) return done();
  if (reply.error === 'rate_limited') return fail(LIMITED);
  const fields = (reply.fields ?? []).filter((name) => name in FIELD_ERRORS);
  if (reply.error === 'invalid' && fields.length) {
    button.disabled = false;
    status.textContent = '';
    return show(fields.map((name) => ({ name, message: FIELD_ERRORS[name] })));
  }
  fail(FAILED);
});
