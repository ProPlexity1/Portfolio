// Admin password check (scrypt, constant time) and session guard.
import crypto from 'node:crypto'
import { readCookie, SESSION_COOKIE } from './http.js'
import { hasSession } from './store.js'

export const SESSION_TTL = 60 * 60 * 8 // 8 hours

// ADMIN_PASSWORD_HASH format: scrypt$N$r$p$saltB64$hashB64 (see scripts/admin-hash.mjs)
export async function verifyPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH || ''
  const parts = stored.split('$')
  // still burn the same work when unconfigured, so timing reveals nothing
  const [scheme, N, r, p, saltB64, hashB64] = parts.length === 6 ? parts : ['scrypt', '16384', '8', '1', 'AAAA', 'AAAA']
  if (scheme !== 'scrypt') return false
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(hashB64, 'base64')
  const derived = await new Promise((resolve, reject) =>
    crypto.scrypt(String(password), salt, expected.length || 64, { N: +N, r: +r, p: +p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  )
  return parts.length === 6 && expected.length > 0 && crypto.timingSafeEqual(derived, expected)
}

export async function isAdmin(req) {
  return hasSession(readCookie(req, SESSION_COOKIE))
}
