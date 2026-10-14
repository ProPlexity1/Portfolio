// Contact form validation. Everything is length-capped and stripped of control
// characters before it is stored or put in an email.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029]', 'g')
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

const clean = (v, max) =>
  typeof v === 'string' ? v.replace(CONTROL, '').replace(/\r\n?/g, '\n').trim().slice(0, max) : ''

export function validateContact(body) {
  const name = clean(body.name, 100).replace(/\n/g, ' ')
  const email = clean(body.email, 254).toLowerCase()
  const details = clean(body.details, 5000)
  const errors = {}
  if (name.length < 2) errors.name = 'Tell me who I am talking to.'
  if (!EMAIL.test(email)) errors.email = 'I need a valid email to reply.'
  if (details.length < 10) errors.details = 'A sentence or two about the project helps.'
  return { ok: Object.keys(errors).length === 0, errors, data: { name, email, details } }
}

// Bots fill the hidden field or submit faster than a person can type.
export function looksLikeBot(body) {
  const honeypot = typeof body.company === 'string' && body.company.length > 0
  const elapsed = Number(body.elapsed)
  return honeypot || !Number.isFinite(elapsed) || elapsed < 2500
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
