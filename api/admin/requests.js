// GET  /api/admin/requests            list requests (admin only)
// POST /api/admin/requests {id, action} mark read / unread / archive / restore / delete
import { isAdmin } from '../_lib/auth.js'
import { jsonBody, sameOrigin, send } from '../_lib/http.js'
import { deleteRequest, getRequest, listRequests, updateRequest } from '../_lib/store.js'

const ACTIONS = { read: 'read', unread: 'new', archive: 'archived', restore: 'read' }
const ID = /^[a-z0-9]{6,12}-[a-f0-9]{12}$/

export default async function handler(req, res) {
  try {
    if (!(await isAdmin(req))) return send(res, 401, { error: 'auth' })

    if (req.method === 'GET') {
      return send(res, 200, { items: await listRequests(500) })
    }

    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'origin' })
      const body = jsonBody(req)
      if (!body || typeof body.id !== 'string' || !ID.test(body.id)) return send(res, 400, { error: 'body' })
      const item = await getRequest(body.id)
      if (!item) return send(res, 404, { error: 'missing' })
      if (body.action === 'delete') {
        await deleteRequest(item.id)
        return send(res, 200, { ok: true })
      }
      const status = ACTIONS[body.action]
      if (!status) return send(res, 400, { error: 'action' })
      await updateRequest({ ...item, status })
      return send(res, 200, { ok: true, status })
    }

    res.setHeader('Allow', 'GET, POST')
    return send(res, 405, { error: 'method' })
  } catch (e) {
    console.error('[admin/requests]', e)
    return send(res, 500, { error: 'server' })
  }
}
