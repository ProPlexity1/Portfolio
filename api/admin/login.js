// POST /api/admin/login: password in, session cookie out.
import { SESSION_TTL, verifyPassword } from '../_lib/auth.js'
import { clientIp, jsonBody, sameOrigin, send, setSessionCookie } from '../_lib/http.js'
import { createSession, underLimit } from '../_lib/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'method' })
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' })
  const body = jsonBody(req)
  if (!body || typeof body.password !== 'string' || body.password.length > 200) return send(res, 400, { error: 'body' })

  try {
    // 5 attempts per 15 minutes per visitor, 30 per 15 minutes overall
    const ip = clientIp(req)
    if (!(await underLimit('login', ip, 5, 900)) || !(await underLimit('login-all', 'all', 30, 900))) {
      return send(res, 429, { error: 'rate' })
    }
    if (!(await verifyPassword(body.password))) return send(res, 401, { error: 'credentials' })
    const id = await createSession(SESSION_TTL)
    setSessionCookie(res, id, SESSION_TTL)
    return send(res, 200, { ok: true })
  } catch (e) {
    console.error('[admin/login]', e)
    return send(res, 500, { error: 'server' })
  }
}
