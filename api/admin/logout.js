// POST /api/admin/logout: end the server-side session and clear the cookie.
import { clearSessionCookie, readCookie, sameOrigin, send, SESSION_COOKIE } from '../_lib/http.js'
import { endSession } from '../_lib/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'method' })
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' })
  try {
    await endSession(readCookie(req, SESSION_COOKIE))
  } catch (e) {
    console.error('[admin/logout]', e)
  }
  clearSessionCookie(res)
  return send(res, 200, { ok: true })
}
