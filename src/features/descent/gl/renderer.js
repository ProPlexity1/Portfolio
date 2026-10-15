// WebGL2 stage: the generated 3D mountain world (gl/world.js), the summit snow
// close-up, and every footprint / pole hole multiplied on with baked lighting.
import { BOUNDS, H_MIN, H_RANGE, heightShader, TIERS, worldShader } from './world'

const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`

// Composite: the world (rendered at reduced resolution) scaled up to the screen,
// with the close-up snow over it while the camera is down at boot level.
const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uWorld, uSnow, uDetail;
uniform vec2 uView;
uniform float uDpr;
uniform float uWorldA;
uniform float uBicubic;   // 0 in lite: plain bilinear is enough and cheaper
uniform vec3 uCam;        // close-up camera: scale, tx, ty (css px)
uniform vec4 uMacro;      // close-up rect in photo px
uniform float uMacroA;
uniform float uTime;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// bicubic (Catmull-Rom) upscale from bilinear taps: the world is drawn at
// reduced resolution and this keeps it crisp instead of soft or blocky
vec3 bicubic(sampler2D t, vec2 uv) {
  vec2 size = vec2(textureSize(t, 0));
  vec2 pos = uv * size, c = floor(pos - 0.5) + 0.5, f = pos - c;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (c - 1.0) / size, t3 = (c + 2.0) / size, t12 = (c + w2 / w12) / size;
  vec3 r = vec3(0.0);
  r += texture(t, vec2(t0.x, t0.y)).rgb * w0.x * w0.y;
  r += texture(t, vec2(t12.x, t0.y)).rgb * w12.x * w0.y;
  r += texture(t, vec2(t3.x, t0.y)).rgb * w3.x * w0.y;
  r += texture(t, vec2(t0.x, t12.y)).rgb * w0.x * w12.y;
  r += texture(t, vec2(t12.x, t12.y)).rgb * w12.x * w12.y;
  r += texture(t, vec2(t3.x, t12.y)).rgb * w3.x * w12.y;
  r += texture(t, vec2(t0.x, t3.y)).rgb * w0.x * w3.y;
  r += texture(t, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;
  r += texture(t, vec2(t3.x, t3.y)).rgb * w3.x * w3.y;
  return max(r, 0.0);
}
void main() {
  vec2 q = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
  vec3 col = vec3(0.64, 0.72, 0.76);
  if (uWorldA > 0.0) {
    vec2 wuv = gl_FragCoord.xy / (uView * uDpr);
    col = uBicubic > 0.5 ? bicubic(uWorld, wuv) : texture(uWorld, wuv).rgb;
  }
  if (uMacroA > 0.001) {
    vec2 p0 = (q - uCam.yz) / uCam.x;
    vec2 m = (p0 - uMacro.xy) / uMacro.zw;
    if (m.x > 0.0 && m.y > 0.0 && m.x < 1.0 && m.y < 1.0) {
      float e = 1.0 - smoothstep(0.62, 1.0, length((m - 0.5) * 2.0));
      vec3 snow = texture(uSnow, m).rgb;
      vec2 r1 = p0 / 4.6;
      vec2 r2 = mat2(0.8, -0.6, 0.6, 0.8) * p0 / 15.0;
      snow *= mix(vec3(1.0), texture(uDetail, r1).rgb * 2.0, 0.6) * 1.05;
      snow *= mix(vec3(1.0), texture(uDetail, r2).rgb * 2.0, 0.45);
      vec2 g = p0 * 18.0;
      vec2 id = floor(g);
      float n = hash(id);
      vec2 at = vec2(hash(id + 7.1), hash(id + 3.7));
      float d = length(fract(g) - at);
      float tw = 0.5 + 0.5 * sin(uTime * 1.3 + n * 80.0 + (uCam.y + uCam.z) * 0.02);
      snow += step(0.985, n) * smoothstep(0.09, 0.0, d) * tw * clamp(uCam.x / 40.0, 0.0, 1.0);
      col = mix(col, snow, uMacroA * e);
    }
  }
  o = vec4(col, 1.0);
}`

const PRINT_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aPos;
layout(location = 2) in float aRot;
layout(location = 3) in vec2 aScale;
layout(location = 4) in float aD;
layout(location = 5) in float aKind;
uniform vec2 uView;
uniform vec3 uCam;
uniform float uHead;
uniform float uPressLen;
out vec2 vUv;
out float vPress;
const float AW = 1792.0, AH = 1536.0;   // atlas: left print | right print | pole hole
void main() {
  float press = clamp((uHead - aD) / uPressLen, 0.0, 1.0);
  vec2 half_ = aKind < 0.5 ? vec2(6.0, 12.0) : vec2(1.6);
  vec2 lp = aCorner * half_ * abs(aScale) * (1.0 + (1.0 - press) * 0.06);
  float c = cos(aRot), s = sin(aRot);
  vec2 w = aPos + vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y);
  vec2 q = w * uCam.x + uCam.yz;
  gl_Position = vec4(q.x / uView.x * 2.0 - 1.0, 1.0 - q.y / uView.y * 2.0, 0.0, 1.0);
  vec2 uv = aCorner * 0.5 + 0.5;
  if (aKind > 0.5) vUv = vec2((1536.0 + uv.x * 256.0) / AW, uv.y * 256.0 / AH);
  else vUv = vec2(((aScale.x < 0.0 ? 768.0 : 0.0) + uv.x * 768.0) / AW, uv.y);
  vPress = press;
}`

const PRINT_FS = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform float uPrintA;
in vec2 vUv;
in float vPress;
out vec4 o;
void main() {
  vec3 ratio = texture(uAtlas, vUv).rgb * 2.0;
  float p = vPress * vPress * (3.0 - 2.0 * vPress) * uPrintA;
  o = vec4(mix(vec3(1.0), ratio, p) * 0.5, 1.0);   // blended as 2 * src * dst
}`

function compile(gl, vs, fs) {
  const prog = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
    gl.attachShader(prog, sh)
  }
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  const u = {}
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i).name
    u[name] = gl.getUniformLocation(prog, name)
  }
  return { prog, u }
}

export async function loadImage(src) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await img.decode()
  return img
}

export function createRenderer(canvas, trail, startTier = 'full') {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) throw new Error('webgl2 unavailable')
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')

  const composite = compile(gl, FULLSCREEN_VS, COMPOSITE_FS)
  const print = compile(gl, PRINT_VS, PRINT_FS)
  const empty = gl.createVertexArray()

  // ---- per tier: the world program and the baked height texture ----
  let tier = null
  let world = null
  const heightTex = gl.createTexture()
  const heightFb = gl.createFramebuffer()
  const buildTier = (next) => {
    if (next === tier) return
    tier = next
    if (world) gl.deleteProgram(world.prog)
    world = compile(gl, FULLSCREEN_VS, worldShader(tier))
    const { heightW, heightH } = TIERS[tier]
    gl.bindTexture(gl.TEXTURE_2D, heightTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, heightW, heightH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    // bake the terrain once into the height texture
    const bake = compile(gl, FULLSCREEN_VS, heightShader(tier))
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heightTex, 0)
    gl.viewport(0, 0, heightW, heightH)
    gl.useProgram(bake.prog)
    gl.uniform2f(bake.u.uSize, heightW, heightH)
    gl.bindVertexArray(empty)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.deleteProgram(bake.prog)
  }
  buildTier(startTier)

  // terrain height (m) at world x, z, read back from the baked texture
  const heightAt = (x, z) => {
    const { heightW, heightH } = TIERS[tier]
    const [bx, bz, bw, bh] = BOUNDS
    const px = Math.min(heightW - 1, Math.max(0, Math.floor(((x - bx) / bw) * heightW)))
    const pz = Math.min(heightH - 1, Math.max(0, Math.floor(((z - bz) / bh) * heightH)))
    const out = new Uint8Array(4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFb)
    gl.readPixels(px, pz, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return H_MIN + ((out[0] * 256 + out[1]) / 65535) * H_RANGE
  }

  // ---- the world is drawn into its own, smaller framebuffer ----
  const worldTex = gl.createTexture()
  const worldFb = gl.createFramebuffer()
  let worldW = 0
  let worldH = 0
  const sizeWorld = (wpx, hpx) => {
    if (wpx === worldW && hpx === worldH) return
    worldW = wpx
    worldH = hpx
    gl.bindTexture(gl.TEXTURE_2D, worldTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, wpx, hpx, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    gl.bindFramebuffer(gl.FRAMEBUFFER, worldFb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, worldTex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  // ---- footprint instances: one per print plus a pole hole every other step ----
  const rows = []
  trail.prints.forEach((p, i) => {
    const rot = (p.r * Math.PI) / 180
    rows.push(p.x, p.y, rot, p.k * p.side, p.k, p.d, 0)
    if (i % 2 === 0) {
      const ox = 7.2 * p.side
      const oy = -5.5
      const hx = p.x + (Math.cos(rot) * ox - Math.sin(rot) * oy) * p.k
      const hy = p.y + (Math.sin(rot) * ox + Math.cos(rot) * oy) * p.k
      rows.push(hx, hy, 0, p.k, p.k, p.d + 0.5, 1)
    }
  })
  const count = rows.length / 7
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rows), gl.STATIC_DRAW)
  for (const [loc, size, off] of [[1, 2, 0], [2, 1, 2], [3, 2, 3], [4, 1, 5], [5, 1, 6]]) {
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 28, off * 4)
    gl.vertexAttribDivisor(loc, 1)
  }
  gl.bindVertexArray(null)

  const tex = {}
  const upload = (name, img, { mip = true, raw = false, wrap = gl.CLAMP_TO_EDGE } = {}) => {
    const t = tex[name] || gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D)
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
    }
    tex[name] = t
  }

  let w = 0
  let h = 0
  let dpr = 1
  const resize = (cssW, cssH, ratio) => {
    dpr = ratio
    w = cssW
    h = cssH
    canvas.width = Math.round(cssW * ratio)
    canvas.height = Math.round(cssH * ratio)
  }

  const bindTex = (unit, t, loc) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.uniform1i(loc, unit)
  }

  // f: { s, tx, ty, macro, macroA, head, printA, time,
  //      world: { pos, fwd, right, up } | null, worldScale, quality }
  const render = (f) => {
    const showWorld = !!f.world && f.macroA < 0.999
    if (showWorld) {
      const wpx = Math.max(64, Math.round(canvas.width * f.worldScale))
      const hpx = Math.max(64, Math.round(canvas.height * f.worldScale))
      sizeWorld(wpx, hpx)
      gl.bindFramebuffer(gl.FRAMEBUFFER, worldFb)
      gl.viewport(0, 0, wpx, hpx)
      gl.disable(gl.BLEND)
      gl.useProgram(world.prog)
      const W = world.u
      gl.uniform2f(W.uRes, wpx, hpx)
      gl.uniform3f(W.uCamPos, ...f.world.pos)
      gl.uniform3f(W.uCamRight, ...f.world.right)
      gl.uniform3f(W.uCamUp, ...f.world.up)
      gl.uniform3f(W.uCamFwd, ...f.world.fwd)
      gl.uniform1f(W.uFov, f.world.fov)
      gl.uniform1f(W.uTime, f.time)
      gl.uniform1f(W.uQuality, f.quality)
      bindTex(0, heightTex, W.uHeight)
      gl.uniform1f(W.uDetailA, tex.detail ? 1 : 0)
      if (tex.detail) bindTex(5, tex.detail, W.uDetail)
      gl.bindVertexArray(empty)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.disable(gl.BLEND)
    gl.useProgram(composite.prog)
    const U = composite.u
    const macro = tex.snow && tex.detail ? f.macroA : 0
    gl.uniform2f(U.uView, w, h)
    gl.uniform1f(U.uDpr, dpr)
    gl.uniform1f(U.uWorldA, showWorld ? 1 : 0)
    gl.uniform1f(U.uBicubic, tier === 'lite' ? 0 : 1)
    gl.uniform3f(U.uCam, f.s, f.tx, f.ty)
    gl.uniform4f(U.uMacro, ...f.macro)
    gl.uniform1f(U.uMacroA, macro)
    gl.uniform1f(U.uTime, f.time)
    if (showWorld) bindTex(1, worldTex, U.uWorld)
    if (macro) {
      bindTex(2, tex.snow, U.uSnow)
      bindTex(3, tex.detail, U.uDetail)
    }
    gl.bindVertexArray(empty)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (!tex.atlas || f.printA <= 0.001) return
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR)
    gl.useProgram(print.prog)
    const P = print.u
    gl.uniform2f(P.uView, w, h)
    gl.uniform3f(P.uCam, f.s, f.tx, f.ty)
    gl.uniform1f(P.uHead, f.head)
    gl.uniform1f(P.uPressLen, 4.5)
    gl.uniform1f(P.uPrintA, f.printA)
    bindTex(4, tex.atlas, P.uAtlas)
    gl.bindVertexArray(vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
    gl.bindVertexArray(null)
  }

  return {
    resize,
    setTier: buildTier,
    tier: () => tier,
    heightAt,
    render,
    // block until the GPU has finished, for frame-time measurement
    finish: () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)),
    setSnow: (img) => upload('snow', img),
    setDetail: (img) => upload('detail', img, { raw: true, wrap: gl.REPEAT }),
    setAtlas: (img) => upload('atlas', img, { raw: true }),
  }
}

