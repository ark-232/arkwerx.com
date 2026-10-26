// The contact form's rules, shared by the browser script, the Worker and the markup.
export const TOPICS = {
  work: 'Working together',
  question: 'A question about my work',
  other: 'Something else',
} as const;

export type Topic = keyof typeof TOPICS;

export const LIMITS = { name: 100, email: 254, message: 4000 } as const;

export const EMAIL = /^[^\p{C}\p{Z}@<>()[\]\\,;:"]+@[^\p{C}\p{Z}@<>()[\]\\,;:"]+\.[\p{L}\d-]{2,}$/u;

// Control characters and line or paragraph separators could split a mail header, so they become spaces.
export const cleanName = (name: string) => name.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
