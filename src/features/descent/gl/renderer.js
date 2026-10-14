// WebGL2 stage: the photo with depth parallax, the summit snow close-up, and every
// footprint / pole hole multiplied onto the snow with its lighting baked in.
import { IMG_H, IMG_W } from '../engine'

const PHOTO_VS = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`

const PHOTO_FS = `#version 300 es
precision highp float;
uniform sampler2D uPhoto, uDepth, uSnow, uDetail;
uniform vec2 uView;
uniform float uDpr;
uniform vec3 uCam;        // scale, tx, ty (css px)
uniform vec2 uPar;        // parallax offset, world px
uniform float uDolly;
uniform vec2 uCenter;     // camera centre, world px
uniform float uFocus;     // depth that stays still
uniform vec4 uMacro;      // close-up rect in world px
uniform float uMacroA;
uniform float uTime;
out vec4 o;
const vec2 IMG = vec2(${IMG_W}.0, ${IMG_H}.0);
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 q = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p0 = (q - uCam.yz) / uCam.x;
  float k = texture(uDepth, p0 / IMG).r - uFocus;
  vec2 p = p0 - k * uPar;
  p = uCenter + (p - uCenter) * (1.0 - k * uDolly);
  vec3 col = texture(uPhoto, p / IMG).rgb;
  if (uMacroA > 0.001) {
    vec2 m = (p0 - uMacro.xy) / uMacro.zw;
    if (m.x > 0.0 && m.y > 0.0 && m.x < 1.0 && m.y < 1.0) {
      float e = 1.0 - smoothstep(0.62, 1.0, length((m - 0.5) * 2.0));
      vec3 snow = texture(uSnow, m).rgb;
      // two octaves of tiling grain keep the surface crisp at any zoom
      vec2 r1 = p0 / 4.6;
      vec2 r2 = mat2(0.8, -0.6, 0.6, 0.8) * p0 / 15.0;
      snow *= mix(vec3(1.0), texture(uDetail, r1).rgb * 2.0, 0.6) * 1.05;
      snow *= mix(vec3(1.0), texture(uDetail, r2).rgb * 2.0, 0.45);
      // glints: rare grains catch the light, twinkling as the camera moves
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
uniform sampler2D uDepth;
uniform vec2 uView;
uniform vec3 uCam;
uniform vec2 uPar;
uniform float uDolly;
uniform vec2 uCenter;
uniform float uFocus;
uniform float uHead;
uniform float uPressLen;
out vec2 vUv;
out float vPress;
const vec2 IMG = vec2(${IMG_W}.0, ${IMG_H}.0);
const float AW = 1792.0, AH = 1536.0;   // atlas: left print | right print | pole hole
void main() {
  float press = clamp((uHead - aD) / uPressLen, 0.0, 1.0);
  vec2 half_ = aKind < 0.5 ? vec2(6.0, 12.0) : vec2(1.6);
  vec2 lp = aCorner * half_ * abs(aScale) * (1.0 + (1.0 - press) * 0.06);
  float c = cos(aRot), s = sin(aRot);
  vec2 w = aPos + vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y);
  float k = textureLod(uDepth, aPos / IMG, 0.0).r - uFocus;
  w = uCenter + (w - uCenter) / (1.0 - k * uDolly);
  w += k * uPar;
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
in vec2 vUv;
in float vPress;
out vec4 o;
void main() {
  vec3 ratio = texture(uAtlas, vUv).rgb * 2.0;
  float p = vPress * vPress * (3.0 - 2.0 * vPress);
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

export function createRenderer(canvas, trail) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) throw new Error('webgl2 unavailable')
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')

  const photo = compile(gl, PHOTO_VS, PHOTO_FS)
  const print = compile(gl, PRINT_VS, PRINT_FS)

  // instances: one per footprint plus a pole hole beside every other step
  const rows = []
  trail.prints.forEach((p, i) => {
    const rot = (p.r * Math.PI) / 180
    rows.push(p.x, p.y, rot, p.k * p.side, p.k, p.d, 0)
    if (i % 2 === 0) {
      // the basket lands ahead and to the outside of the step
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
  const empty = gl.createVertexArray()

  const tex = {}
  const upload = (name, img, { format = gl.RGBA, internal = gl.RGBA8, mip = true, raw = false, wrap = gl.CLAMP_TO_EDGE } = {}) => {
    const t = tex[name] || gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, gl.UNSIGNED_BYTE, img)
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

  const bindTex = (unit, name, loc) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex[name])
    gl.uniform1i(loc, unit)
  }

  // f: { s, tx, ty, par:[x,y], dolly, center:[x,y], focus, macro:[x,y,w,h], macroA, head, time }
  const render = (f) => {
    if (!tex.photo || !tex.depth) return
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.disable(gl.BLEND)
    gl.useProgram(photo.prog)
    const U = photo.u
    const macro = tex.snow && tex.detail ? f.macroA : 0
    gl.uniform2f(U.uView, w, h)
    gl.uniform1f(U.uDpr, dpr)
    gl.uniform3f(U.uCam, f.s, f.tx, f.ty)
    gl.uniform2f(U.uPar, f.par[0], f.par[1])
    gl.uniform1f(U.uDolly, f.dolly)
    gl.uniform2f(U.uCenter, f.center[0], f.center[1])
    gl.uniform1f(U.uFocus, f.focus)
    gl.uniform4f(U.uMacro, ...f.macro)
    gl.uniform1f(U.uMacroA, macro)
    gl.uniform1f(U.uTime, f.time)
    bindTex(0, 'photo', U.uPhoto)
    bindTex(1, 'depth', U.uDepth)
    if (macro) {
      bindTex(2, 'snow', U.uSnow)
      bindTex(4, 'detail', U.uDetail)
    }
    gl.bindVertexArray(empty)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (!tex.atlas) return
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR)
    gl.useProgram(print.prog)
    const P = print.u
    gl.uniform2f(P.uView, w, h)
    gl.uniform3f(P.uCam, f.s, f.tx, f.ty)
    gl.uniform2f(P.uPar, f.par[0], f.par[1])
    gl.uniform1f(P.uDolly, f.dolly)
    gl.uniform2f(P.uCenter, f.center[0], f.center[1])
    gl.uniform1f(P.uFocus, f.focus)
    gl.uniform1f(P.uHead, f.head)
    gl.uniform1f(P.uPressLen, 4.5)
    bindTex(1, 'depth', P.uDepth)
    bindTex(3, 'atlas', P.uAtlas)
    gl.bindVertexArray(vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
    gl.bindVertexArray(null)
  }

  return {
    resize,
    render,
    setPhoto: (img) => upload('photo', img),
    setDepth: (img) => upload('depth', img, { format: gl.RED, internal: gl.R8, mip: false, raw: true }),
    setSnow: (img) => upload('snow', img),
    setDetail: (img) => upload('detail', img, { raw: true, wrap: gl.REPEAT }),
    setAtlas: (img) => upload('atlas', img, { raw: true }),
  }
}
