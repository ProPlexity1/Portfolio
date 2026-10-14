// Storage for contact requests, admin sessions and rate limits.
// Production uses Upstash Redis over its REST API (no SDK needed). Local dev
// without credentials falls back to memory; production refuses to run without it.
import crypto from 'node:crypto'

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const PROD = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'

export class StoreUnavailable extends Error {}

async function pipeline(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new StoreUnavailable(`redis ${res.status}`)
  const out = await res.json()
  return out.map((r) => {
    if (r.error) throw new StoreUnavailable(r.error)
    return r.result
  })
}
const redis = async (...cmd) => (await pipeline([cmd]))[0]

// ---- memory fallback (local dev only) ----
const mem = globalThis.__descentMem || (globalThis.__descentMem = { kv: new Map(), exp: new Map(), z: new Map() })
const alive = (k) => {
  const e = mem.exp.get(k)
  if (e && e < Date.now()) {
    mem.kv.delete(k)
    mem.exp.delete(k)
  }
  return mem.kv.has(k)
}

function backend() {
  if (URL_ && TOKEN) return 'redis'
  if (PROD) throw new StoreUnavailable('storage is not configured')
  return 'memory'
}

const MAX_KEPT = 1000

export async function saveRequest(item) {
  if (backend() === 'redis') {
    await pipeline([
      ['SET', `req:${item.id}`, JSON.stringify(item)],
      ['ZADD', 'reqs', item.createdAt, item.id],
      ['ZREMRANGEBYRANK', 'reqs', 0, -(MAX_KEPT + 1)],
    ])
    return
  }
  mem.kv.set(`req:${item.id}`, JSON.stringify(item))
  mem.z.set(item.id, item.createdAt)
}

export async function listRequests(limit = 200) {
  if (backend() === 'redis') {
    const ids = await redis('ZREVRANGE', 'reqs', 0, limit - 1)
    if (!ids.length) return []
    const rows = await redis('MGET', ...ids.map((id) => `req:${id}`))
    return rows.filter(Boolean).map((r) => JSON.parse(r))
  }
  return [...mem.z.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => mem.kv.get(`req:${id}`))
    .filter(Boolean)
    .map((r) => JSON.parse(r))
}

export async function getRequest(id) {
  const raw = backend() === 'redis' ? await redis('GET', `req:${id}`) : mem.kv.get(`req:${id}`)
  return raw ? JSON.parse(raw) : null
}

export async function updateRequest(item) {
  if (backend() === 'redis') await redis('SET', `req:${item.id}`, JSON.stringify(item), 'XX')
  else if (mem.kv.has(`req:${item.id}`)) mem.kv.set(`req:${item.id}`, JSON.stringify(item))
}

export async function deleteRequest(id) {
  if (backend() === 'redis') {
    await pipeline([['DEL', `req:${id}`], ['ZREM', 'reqs', id]])
    return
  }
  mem.kv.delete(`req:${id}`)
  mem.z.delete(id)
}

// Fixed-window counter. Returns true while the caller is under the limit.
export async function underLimit(bucket, key, limit, windowSec) {
  const k = `rl:${bucket}:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`
  if (backend() === 'redis') {
    const count = await redis('INCR', k)
    if (count === 1) await redis('EXPIRE', k, windowSec)
    return count <= limit
  }
  const n = (alive(k) ? Number(mem.kv.get(k)) : 0) + 1
  mem.kv.set(k, String(n))
  if (n === 1) mem.exp.set(k, Date.now() + windowSec * 1000)
  return n <= limit
}

// Server-side sessions so logout really ends them.
export async function createSession(ttlSec) {
  const id = crypto.randomBytes(32).toString('base64url')
  if (backend() === 'redis') await redis('SET', `sess:${id}`, '1', 'EX', ttlSec)
  else {
    mem.kv.set(`sess:${id}`, '1')
    mem.exp.set(`sess:${id}`, Date.now() + ttlSec * 1000)
  }
  return id
}

export async function hasSession(id) {
  if (!id || !/^[A-Za-z0-9_-]{43}$/.test(id)) return false
  if (backend() === 'redis') return (await redis('EXISTS', `sess:${id}`)) === 1
  return alive(`sess:${id}`)
}

export async function endSession(id) {
  if (!id) return
  if (backend() === 'redis') await redis('DEL', `sess:${id}`)
  else mem.kv.delete(`sess:${id}`)
}
