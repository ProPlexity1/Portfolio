// Shared request plumbing: origin checks, client IP, cookies, JSON replies.
import crypto from 'node:crypto'

const PROD = process.env.VERCEL_ENV === 'production'
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://ukasha.is-a.dev')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(status).send(JSON.stringify(body))
}

// Only our own pages may call the API (blocks cross-site form posts / CSRF).
export function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return false
  if (ALLOWED.includes(origin)) return true
  // the deployment's own URL (preview builds) and local dev
  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true
  if (!PROD && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  return false
}

export function clientIp(req) {
  // Vercel sets x-real-ip / x-forwarded-for from the edge; take the first hop only
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return String(req.headers['x-real-ip'] || fwd || req.socket?.remoteAddress || 'unknown')
}

export function readCookie(req, name) {
  const raw = String(req.headers.cookie || '')
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

// __Host- cookies must be Secure, Path=/ and have no Domain, so they cannot be
// set or read by any other subdomain.
export const SESSION_COOKIE = '__Host-ubk_admin'

export function setSessionCookie(res, value, maxAge) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`,
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`)
}

export function newId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`
}

export function jsonBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return null
  const b = req.body
  if (b && typeof b === 'object' && !Array.isArray(b)) return b
  if (typeof b === 'string') {
    try {
      const parsed = JSON.parse(b)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}
