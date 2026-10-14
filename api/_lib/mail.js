// New-request notification through Resend's HTTP API (no SDK needed).
import { escapeHtml } from './validate.js'

const TO = process.env.CONTACT_TO || 'ukashaworkmail@gmail.com'
// onboarding@resend.dev works without a domain, but only delivers to the
// address the Resend account was created with. Set MAIL_FROM after verifying a domain.
const FROM = process.env.MAIL_FROM || 'Portfolio <onboarding@resend.dev>'

export async function notify(item) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[contact] RESEND_API_KEY not set; request stored but no email sent')
    return false
  }
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0c1e24">
      <h2 style="margin:0 0 12px">New project request</h2>
      <p style="margin:0"><strong>${escapeHtml(item.name)}</strong> &lt;${escapeHtml(item.email)}&gt;</p>
      <p style="margin:4px 0 16px;color:#5b6f74">${new Date(item.createdAt).toUTCString()}</p>
      <div style="white-space:pre-wrap;border-left:3px solid #6fd1c9;padding-left:12px">${escapeHtml(item.details)}</div>
      <p style="margin-top:20px;color:#5b6f74">Reply to this email to answer them directly.</p>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: item.email,
      subject: `Project request from ${item.name}`.slice(0, 150),
      html,
      text: `${item.name} <${item.email}>\n\n${item.details}`,
    }),
  })
  if (!res.ok) console.error('[contact] resend failed', res.status, await res.text().catch(() => ''))
  return res.ok
}
