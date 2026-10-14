// POST /api/contact: store a project request and email a notification.
import { clientIp, jsonBody, newId, sameOrigin, send } from './_lib/http.js'
import { notify } from './_lib/mail.js'
import { saveRequest, StoreUnavailable, underLimit } from './_lib/store.js'
import { looksLikeBot, validateContact } from './_lib/validate.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'method' })
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' })
  const body = jsonBody(req)
  if (!body) return send(res, 400, { error: 'body' })

  try {
    // 5 requests per hour per visitor, 60 per hour site-wide as a backstop
    const ip = clientIp(req)
    if (!(await underLimit('contact', ip, 5, 3600)) || !(await underLimit('contact-all', 'all', 60, 3600))) {
      return send(res, 429, { error: 'rate' })
    }

    // bots get a normal-looking success so they do not adapt
    if (looksLikeBot(body)) return send(res, 200, { ok: true })

    const { ok, errors, data } = validateContact(body)
    if (!ok) return send(res, 422, { error: 'invalid', fields: errors })

    const item = { id: newId(), ...data, createdAt: Date.now(), status: 'new' }
    await saveRequest(item)
    await notify(item).catch((e) => console.error('[contact] notify', e))
    return send(res, 200, { ok: true })
  } catch (e) {
    console.error('[contact]', e)
    return send(res, e instanceof StoreUnavailable ? 503 : 500, { error: 'server' })
  }
}
