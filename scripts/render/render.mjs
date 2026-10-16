// Render stills with render.html in headless Chromium (software WebGL).
// Usage: node scripts/render/render.mjs <assets_dir> <shots.json> <out_dir>
// (needs playwright-core: npm i --no-save playwright-core)
//   assets_dir: tier "o" layers from scripts/plates/layers.py, served over http
//   shots.json: [{ name, w, h, pos, yaw, pitch, vfov, shift, alpha? }]
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const [assets, shotsFile, out] = process.argv.slice(2).map((p) => resolve(p))
const here = process.env.RENDER_DIR || resolve(new URL('.', import.meta.url).pathname)
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const file = url.startsWith('/assets/') ? join(assets, url.slice(8)) : join(here, url)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(0)
const port = server.address().port

const shots = JSON.parse(await readFile(shotsFile, 'utf8'))
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
page.on('console', (m) => console.log('[page]', m.text()))
page.on('pageerror', (e) => console.log('[error]', e.message))
await page.goto(`http://localhost:${port}/render.html`)
await page.waitForFunction(() => window.ready)
const mode = process.env.MODE || 'planes'
await page.evaluate(([b, m]) => (m === 'planes' ? window.initPlanes(b) : window.init(b)), ['/assets/', mode])
for (const s of shots) {
  const t = Date.now()
  const url = await page.evaluate(([s, m]) => (m === 'planes' ? window.shotPlanes(s) : window.shot(s)), [s, mode])
  await writeFile(join(out, s.name + '.png'), Buffer.from(url.split(',')[1], 'base64'))
  console.log(s.name, Date.now() - t, 'ms')
}
await browser.close()
server.close()
