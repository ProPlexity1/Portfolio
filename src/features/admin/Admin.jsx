import { Archive, ArchiveRestore, Inbox, LogOut, Mail, MailOpen, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogoMark } from '../descent/art'

// Admin portal for incoming project requests. Auth lives entirely on the
// server (HttpOnly session cookie); this page only ever sees request data.

const api = (path, opts = {}) =>
  fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } })

// null when signed out (or the server cannot be reached)
const fetchItems = async () => {
  const res = await api('/api/admin/requests').catch(() => null)
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.items) ? data.items : null
}

const when = (ts) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts))

function Login({ onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const res = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }).catch(() => null)
    setBusy(false)
    setPassword('')
    if (res?.ok) return onDone()
    setError(
      res?.status === 429
        ? 'Too many attempts. Try again in 15 minutes.'
        : res?.status === 401
          ? 'That password is not right.'
          : 'Could not reach the server.',
    )
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit} className="panel panel-solid w-full max-w-sm p-8">
        <LogoMark className="h-7 w-8 text-glacier" />
        <h1 className="mt-5 font-display text-3xl">Requests</h1>
        <p className="mt-1 text-sm text-snow/60">Sign in to see incoming project requests.</p>
        <div className="mt-6 grid gap-2">
          <label htmlFor="pw" className="text-sm text-snow/85">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          {error && (
            <p role="alert" className="text-sm text-[#ffb4a8]">
              {error}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy || !password} className="btn btn-primary mt-6 w-full justify-center disabled:opacity-60">
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

const TABS = [
  { id: 'new', label: 'New', test: (r) => r.status === 'new' },
  { id: 'open', label: 'All open', test: (r) => r.status !== 'archived' },
  { id: 'archived', label: 'Archived', test: (r) => r.status === 'archived' },
]

function Requests({ items, setItems, onLogout, reload, loading }) {
  const [tab, setTab] = useState('new')
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)
    const needle = q.trim().toLowerCase()
    return items.filter((r) => t.test(r) && (!needle || `${r.name} ${r.email} ${r.details}`.toLowerCase().includes(needle)))
  }, [items, tab, q])

  const act = async (item, action) => {
    if (action === 'delete' && !window.confirm(`Delete the request from ${item.name}? This cannot be undone.`)) return
    const before = items
    setItems((list) =>
      action === 'delete'
        ? list.filter((r) => r.id !== item.id)
        : list.map((r) => (r.id === item.id ? { ...r, status: { read: 'read', unread: 'new', archive: 'archived', restore: 'read' }[action] } : r)),
    )
    const res = await api('/api/admin/requests', { method: 'POST', body: JSON.stringify({ id: item.id, action }) }).catch(() => null)
    if (!res?.ok) {
      setItems(before)
      if (res?.status === 401) onLogout(true)
    }
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div className="flex items-center gap-3">
          <LogoMark className="h-6 w-7 text-glacier" />
          <h1 className="font-display text-2xl">Requests</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="icon-btn" onClick={reload} aria-label="Refresh">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLogout(false)}>
            <LogOut className="size-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </header>

      <div className="admin-tools">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="admin-tab" onClick={() => setTab(t.id)}>
              {t.label}
              <span>{items.filter(t.test).length}</span>
            </button>
          ))}
        </div>
        <label className="admin-search">
          <Search className="size-4 text-mist" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or text" aria-label="Search requests" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="admin-empty">
          <Inbox className="size-8 text-mist" strokeWidth={1.5} />
          <p className="mt-3 font-display text-xl">{q ? 'Nothing matches that search' : tab === 'new' ? 'You are all caught up' : 'Nothing here yet'}</p>
          <p className="mt-1 text-sm text-snow/60">New requests from the contact form land here and in your inbox.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {shown.map((r) => (
            <li key={r.id} className={`admin-card ${r.status === 'new' ? 'is-new' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl">{r.name}</p>
                  <a className="link break-all text-sm" href={`mailto:${r.email}?subject=${encodeURIComponent('Re: your project request')}`}>
                    {r.email}
                  </a>
                </div>
                <p className="font-mono text-xs text-mist">{when(r.createdAt)}</p>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-snow/85">{r.details}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {r.status === 'new' ? (
                  <button type="button" className="admin-act" onClick={() => act(r, 'read')}>
                    <MailOpen className="size-4" strokeWidth={1.75} /> Mark read
                  </button>
                ) : (
                  r.status !== 'archived' && (
                    <button type="button" className="admin-act" onClick={() => act(r, 'unread')}>
                      <Mail className="size-4" strokeWidth={1.75} /> Mark unread
                    </button>
                  )
                )}
                {r.status === 'archived' ? (
                  <button type="button" className="admin-act" onClick={() => act(r, 'restore')}>
                    <ArchiveRestore className="size-4" strokeWidth={1.75} /> Restore
                  </button>
                ) : (
                  <button type="button" className="admin-act" onClick={() => act(r, 'archive')}>
                    <Archive className="size-4" strokeWidth={1.75} /> Archive
                  </button>
                )}
                <button type="button" className="admin-act is-danger" onClick={() => act(r, 'delete')}>
                  <Trash2 className="size-4" strokeWidth={1.75} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default function Admin() {
  const [phase, setPhase] = useState('checking') // checking | login | ready
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Requests | Ukasha'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.documentElement.classList.remove('is-loading')
    return () => meta.remove()
  }, [])

  const show = (list) => {
    if (list) setItems(list)
    setPhase(list ? 'ready' : 'login')
  }

  const load = useCallback(async () => {
    setLoading(true)
    const list = await fetchItems()
    setLoading(false)
    show(list)
  }, [])

  useEffect(() => {
    let live = true
    fetchItems().then((list) => live && show(list))
    return () => {
      live = false
    }
  }, [])

  const logout = async (expired) => {
    if (!expired) await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    setItems([])
    setPhase('login')
  }

  if (phase === 'checking') return <main className="admin-login" aria-busy="true" />
  if (phase === 'login') return <Login onDone={load} />
  return <Requests items={items} setItems={setItems} onLogout={logout} reload={load} loading={loading} />
}
