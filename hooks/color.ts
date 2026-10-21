/* Optics colour math: the two ramps (OKLCH and Optics' own HSL), contrast, and the outputs.
   Pure functions, no engine calls, so the pane and the tests share them. */

import type { Family, Model, Scheme, Theme } from '../types'

export const STEPS = [
  'plus-max', 'plus-eight', 'plus-seven', 'plus-six', 'plus-five', 'plus-four', 'plus-three', 'plus-two', 'plus-one',
  'base',
  'minus-one', 'minus-two', 'minus-three', 'minus-four', 'minus-five', 'minus-six', 'minus-seven', 'minus-eight', 'minus-max',
] as const
export type Step = (typeof STEPS)[number]
export type Band = 'bg' | 'on' | 'alt'

/* ---------- the families a new theme starts with (Optics defaults) ---------- */

/** Optics' own default inputs (optics.css :root), with the OKLCH equivalents of each family's base colour. */
export const DEFAULT_FAMILIES: Family[] = [
  { key: 'primary', name: 'Primary', prefix: 'primary', h: 216, s: 58, oh: 258.4, oc: 0.146, ot: 1, isCore: true },
  { key: 'neutral', name: 'Neutral', prefix: 'neutral', h: 216, s: 4, oh: 264.5, oc: 0.01, ot: 1, isCore: true },
  { key: 'warning', name: 'Warning', prefix: 'alerts-warning', h: 47, s: 100, oh: 92.4, oc: 0.166, ot: 1, isCore: true },
  { key: 'danger', name: 'Danger', prefix: 'alerts-danger', h: 0, s: 99, oh: 21.2, oc: 0.147, ot: 0.35, isCore: true },
  { key: 'info', name: 'Info', prefix: 'alerts-info', h: 216, s: 58, oh: 258.4, oc: 0.146, ot: 1, isCore: true },
  { key: 'notice', name: 'Notice', prefix: 'alerts-notice', h: 130, s: 61, oh: 147.5, oc: 0.166, ot: 1, isCore: true },
]

export const DEFAULT_THEME: Theme = { model: 'oklch', scheme: 'light', format: 'tokens', selected: 'primary', families: DEFAULT_FAMILIES }

/* ---------- OKLCH ladder: one lightness per step, shared by every family ---------- */

type OkStep = { L: number; k: number; tint?: true }

/** Light: lightness and the share of the family's chroma each step takes. `tint` steps also take the family's tint factor. */
const OK_LIGHT: Record<Step, OkStep> = {
  'plus-max': { L: 1, k: 0, tint: true }, 'plus-eight': { L: 0.985, k: 0.08, tint: true }, 'plus-seven': { L: 0.97, k: 0.15, tint: true },
  'plus-six': { L: 0.945, k: 0.25, tint: true }, 'plus-five': { L: 0.91, k: 0.38, tint: true }, 'plus-four': { L: 0.86, k: 0.55, tint: true },
  'plus-three': { L: 0.8, k: 0.72 }, 'plus-two': { L: 0.74, k: 0.86 }, 'plus-one': { L: 0.66, k: 0.96 },
  base: { L: 0.535, k: 1 },
  'minus-one': { L: 0.5, k: 0.95 }, 'minus-two': { L: 0.45, k: 0.9 }, 'minus-three': { L: 0.4, k: 0.82 }, 'minus-four': { L: 0.35, k: 0.74 },
  'minus-five': { L: 0.3, k: 0.64 }, 'minus-six': { L: 0.25, k: 0.54 }, 'minus-seven': { L: 0.19, k: 0.42 }, 'minus-eight': { L: 0.13, k: 0.3 },
  'minus-max': { L: 0, k: 0 },
}

/** Dark: the plus steps become the dark surfaces, the minus steps climb toward white; base keeps the brand colour. */
const OK_DARK: Record<Step, OkStep> = {
  'plus-max': { L: 0.17, k: 0, tint: true }, 'plus-eight': { L: 0.2, k: 0.1, tint: true }, 'plus-seven': { L: 0.23, k: 0.15, tint: true },
  'plus-six': { L: 0.26, k: 0.2, tint: true }, 'plus-five': { L: 0.29, k: 0.26, tint: true }, 'plus-four': { L: 0.33, k: 0.32, tint: true },
  'plus-three': { L: 0.37, k: 0.45 }, 'plus-two': { L: 0.41, k: 0.6 }, 'plus-one': { L: 0.46, k: 0.8 },
  base: { L: 0.535, k: 1 },
  'minus-one': { L: 0.61, k: 0.95 }, 'minus-two': { L: 0.66, k: 0.88 }, 'minus-three': { L: 0.72, k: 0.76 }, 'minus-four': { L: 0.78, k: 0.62 },
  'minus-five': { L: 0.84, k: 0.48 }, 'minus-six': { L: 0.89, k: 0.34 }, 'minus-seven': { L: 0.935, k: 0.2 }, 'minus-eight': { L: 0.97, k: 0.1 },
  'minus-max': { L: 1, k: 0 },
}

/** Text on a step flips at a set lightness: dark text from L .6 up, light text below. */
const okOn = (L: number, band: 'on' | 'alt'): { L: number; k: number } =>
  L >= 0.6 ? (band === 'on' ? { L: 0.18, k: 0.35 } : { L: 0.4, k: 0.7 }) : band === 'on' ? { L: 0.99, k: 0.05 } : { L: 0.88, k: 0.3 }

/* ---------- Optics' own HSL ladder (from the Optics colour token tool) ---------- */

type HslTable = Record<'bg' | 'on' | 'alt', Record<Step, number>>
const HSL: Record<Scheme, HslTable> = {
  light: {
    bg: { 'plus-max': 100, 'plus-eight': 98, 'plus-seven': 96, 'plus-six': 94, 'plus-five': 90, 'plus-four': 84, 'plus-three': 70, 'plus-two': 64, 'plus-one': 45, base: 40, 'minus-one': 36, 'minus-two': 32, 'minus-three': 28, 'minus-four': 24, 'minus-five': 20, 'minus-six': 16, 'minus-seven': 8, 'minus-eight': 4, 'minus-max': 0 },
    on: { 'plus-max': 0, 'plus-eight': 4, 'plus-seven': 8, 'plus-six': 16, 'plus-five': 20, 'plus-four': 24, 'plus-three': 20, 'plus-two': 16, 'plus-one': 100, base: 100, 'minus-one': 94, 'minus-two': 90, 'minus-three': 86, 'minus-four': 84, 'minus-five': 88, 'minus-six': 94, 'minus-seven': 96, 'minus-eight': 98, 'minus-max': 100 },
    alt: { 'plus-max': 20, 'plus-eight': 24, 'plus-seven': 28, 'plus-six': 26, 'plus-five': 40, 'plus-four': 4, 'plus-three': 10, 'plus-two': 6, 'plus-one': 95, base: 88, 'minus-one': 82, 'minus-two': 78, 'minus-three': 74, 'minus-four': 72, 'minus-five': 78, 'minus-six': 82, 'minus-seven': 84, 'minus-eight': 86, 'minus-max': 88 },
  },
  dark: {
    bg: { 'plus-max': 12, 'plus-eight': 14, 'plus-seven': 16, 'plus-six': 20, 'plus-five': 24, 'plus-four': 26, 'plus-three': 29, 'plus-two': 32, 'plus-one': 35, base: 38, 'minus-one': 40, 'minus-two': 45, 'minus-three': 48, 'minus-four': 52, 'minus-five': 64, 'minus-six': 72, 'minus-seven': 80, 'minus-eight': 88, 'minus-max': 100 },
    on: { 'plus-max': 100, 'plus-eight': 88, 'plus-seven': 80, 'plus-six': 72, 'plus-five': 72, 'plus-four': 80, 'plus-three': 78, 'plus-two': 80, 'plus-one': 80, base: 100, 'minus-one': 98, 'minus-two': 98, 'minus-three': 98, 'minus-four': 2, 'minus-five': 2, 'minus-six': 8, 'minus-seven': 8, 'minus-eight': 4, 'minus-max': 0 },
    alt: { 'plus-max': 78, 'plus-eight': 70, 'plus-seven': 64, 'plus-six': 96, 'plus-five': 86, 'plus-four': 92, 'plus-three': 98, 'plus-two': 92, 'plus-one': 98, base: 84, 'minus-one': 90, 'minus-two': 92, 'minus-three': 96, 'minus-four': 2, 'minus-five': 20, 'minus-six': 26, 'minus-seven': 34, 'minus-eight': 38, 'minus-max': 38 },
  },
}

/* ---------- conversions ---------- */

export type Rgb = { r: number; g: number; b: number } // 0..255
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const toHex = ({ r, g, b }: Rgb) => '#' + [r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('')

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = lN - c / 2
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

const linToSrgb = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)
const srgbToLin = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))

/** OKLCH → sRGB, chroma reduced until the colour is in gamut (keeps lightness and hue). */
export function oklchToRgb(L: number, C: number, H: number): Rgb {
  const raw = (c: number) => {
    const hr = (H * Math.PI) / 180
    const a = c * Math.cos(hr), b = c * Math.sin(hr)
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.291485548 * b
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
  }
  let c = C, lin = raw(c)
  for (let i = 0; i < 24 && lin.some(v => v < -0.0005 || v > 1.0005); i++) { c *= 0.92; lin = raw(c) }
  const [r, g, b] = lin.map(v => clamp01(linToSrgb(clamp01(v))) * 255) as [number, number, number]
  return { r, g, b }
}

/** sRGB hex → OKLCH, for "start from a brand colour". */
export function hexToOklch(hex: string): { L: number; C: number; H: number } | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => srgbToLin(v / 255)) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(A * A + B * B)
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return { L, C, H }
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)
  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function parseHex(hex: string): Rgb | null {
  let x = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(x)) x = x.split('').map(ch => ch + ch).join('')
  if (!/^[0-9a-f]{6}$/i.test(x)) return null
  return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) }
}

const luminance = ({ r, g, b }: Rgb) => {
  const [R, G, B] = [r, g, b].map(v => srgbToLin(v / 255)) as [number, number, number]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
export const contrast = (a: Rgb, b: Rgb) => {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export const level = (ratio: number) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fail')

/* ---------- one cell of the ramp ---------- */

export type Cell = { step: Step; bg: string; on: string; alt: string; onRatio: number; altRatio: number }

/** Muted (alt) text starts at its muted lightness and moves toward the main text colour only as far as it
    takes to clear 4.5:1 on that step, so secondary text stays secondary but readable. */
function okAltL(f: Family, scheme: Scheme, step: Step): number {
  const s = (scheme === 'dark' ? OK_DARK : OK_LIGHT)[step]
  const bg = oklchToRgb(s.L, f.oc * s.k * (s.tint ? f.ot : 1), f.oh)
  const on = okOn(s.L, 'on'), alt = okOn(s.L, 'alt')
  const dir = on.L > alt.L ? 1 : -1
  for (let L = alt.L; dir > 0 ? L <= on.L : L >= on.L; L = +(L + dir * 0.01).toFixed(3))
    if (contrast(oklchToRgb(L, f.oc * alt.k, f.oh), bg) >= 4.5) return L
  return on.L
}

function okColor(f: Family, scheme: Scheme, step: Step, band: Band): { L: number; C: number; H: number } {
  const s = (scheme === 'dark' ? OK_DARK : OK_LIGHT)[step]
  if (band === 'bg') return { L: s.L, C: f.oc * s.k * (s.tint ? f.ot : 1), H: f.oh }
  const o = okOn(s.L, band)
  return { L: band === 'alt' ? okAltL(f, scheme, step) : o.L, C: f.oc * o.k, H: f.oh }
}

function rgbFor(f: Family, model: Model, scheme: Scheme, step: Step, band: Band): Rgb {
  if (model === 'hsl') return hslToRgb(f.h, f.s, HSL[scheme][band][step])
  const c = okColor(f, scheme, step, band)
  return oklchToRgb(c.L, c.C, c.H)
}

export function ramp(f: Family, model: Model, scheme: Scheme): Cell[] {
  return STEPS.map(step => {
    const bg = rgbFor(f, model, scheme, step, 'bg'), on = rgbFor(f, model, scheme, step, 'on'), alt = rgbFor(f, model, scheme, step, 'alt')
    return { step, bg: toHex(bg), on: toHex(on), alt: toHex(alt), onRatio: contrast(on, bg), altRatio: contrast(alt, bg) }
  })
}

/** Failing pairs (below 4.5:1) across the theme, both schemes, for the summary line. */
export function failures(t: Theme): { family: string; scheme: Scheme; step: Step; band: 'on' | 'alt'; ratio: number }[] {
  const out: { family: string; scheme: Scheme; step: Step; band: 'on' | 'alt'; ratio: number }[] = []
  for (const f of t.families) for (const scheme of ['light', 'dark'] as const)
    for (const c of ramp(f, t.model, scheme)) {
      if (c.onRatio < 4.5) out.push({ family: f.name, scheme, step: c.step, band: 'on', ratio: c.onRatio })
      if (c.altRatio < 4.5) out.push({ family: f.name, scheme, step: c.step, band: 'alt', ratio: c.altRatio })
    }
  return out
}

/* ---------- outputs ---------- */

const n = (x: number, d = 3) => String(+x.toFixed(d))
const v = (f: Family, s: string) => `--op-color-${f.prefix}-${s}`

/** One token's value in the source form: the family's inputs and the ladder, light-dark() for the two schemes. */
function tokenValue(f: Family, model: Model, step: Step, band: Band): string {
  if (model === 'hsl') {
    const at = (scheme: Scheme) => `hsl(var(${v(f, 'h')}) var(${v(f, 's')}) ${HSL[scheme][band][step]}%)`
    return `light-dark(${at('light')}, ${at('dark')})`
  }
  const at = (scheme: Scheme) => {
    const s = (scheme === 'dark' ? OK_DARK : OK_LIGHT)[step]
    if (band === 'bg') {
      const k = s.k === 0 ? '0' : `calc(var(${v(f, 'ok-c')}) * ${n(s.k)}${s.tint ? ` * var(${v(f, 'ok-t')})` : ''})`
      return `oklch(${n(s.L)} ${k} var(${v(f, 'ok-h')}))`
    }
    const o = okOn(s.L, band)
    const L = band === 'alt' ? okAltL(f, scheme, step) : o.L // alt lightness is solved per family for 4.5:1
    return `oklch(${n(L)} calc(var(${v(f, 'ok-c')}) * ${n(o.k)}) var(${v(f, 'ok-h')}))`
  }
  return `light-dark(${at('light')}, ${at('dark')})`
}

const bandsOf = (step: Step): [string, Band][] => [[step, 'bg'], [`on-${step}`, 'on'], [`on-${step}-alt`, 'alt']]

/** The theme as CSS. `tokens`: inputs + formulas (what a theme file should hold). `resolved`: plain hex, light in :root, dark in a media query. */
export function css(t: Theme): string {
  const head = t.model === 'oklch'
    ? `/* Optics colour theme · OKLCH. Generated by the optics-theme mod.\n   Each family is three inputs: hue (ok-h), chroma (ok-c) and a light-tint factor (ok-t, plus-four…plus-eight only).\n   Every family shares one lightness ladder, so a step is equally light in every hue and takes the same text colour.\n   Load after Optics. Needs color-scheme: light dark on :root for light-dark(). */\n`
    : `/* Optics colour theme · HSL (Optics' own ladder). Generated by the optics-theme mod.\n   Each family is two inputs: hue (-h) and saturation (-s). Load after Optics. */\n`
  if (t.format === 'resolved') {
    const body = (scheme: Scheme, pad: string) => t.families.map(f => `${pad}/* ${f.name} */\n` + ramp(f, t.model, scheme)
      .map(c => `${pad}${v(f, c.step)}: ${c.bg};\n${pad}${v(f, `on-${c.step}`)}: ${c.on};\n${pad}${v(f, `on-${c.step}-alt`)}: ${c.alt};`).join('\n')).join('\n\n')
    return `${head}:root {\n${body('light', '  ')}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${body('dark', '    ')}\n  }\n}\n`
  }
  const inputs = t.families.map(f => t.model === 'oklch'
    ? `  ${v(f, 'ok-h')}: ${n(f.oh, 1)}; ${v(f, 'ok-c')}: ${n(f.oc)}; ${v(f, 'ok-t')}: ${n(f.ot, 2)};`
    : `  ${v(f, 'h')}: ${Math.round(f.h)}; ${v(f, 's')}: ${Math.round(f.s)}%;`).join('\n')
  const tokens = t.families.map(f => `  /* ${f.name} */\n` + STEPS.flatMap(step => bandsOf(step).map(([suffix, band]) => `  ${v(f, suffix)}: ${tokenValue(f, t.model, step, band)};`)).join('\n')).join('\n\n')
  return `${head}:root {\n  /* Inputs: the only values a theme sets */\n${inputs}\n\n${tokens}\n}\n`
}

/** One Figma variables import file (one collection mode), the same shape as the Optics colour token tool's. */
export function figma(t: Theme, scheme: Scheme): string {
  const token = (hex: string) => {
    const c = parseHex(hex) ?? { r: 0, g: 0, b: 0 }
    return { $type: 'color', $value: { colorSpace: 'srgb', components: [c.r / 255, c.g / 255, c.b / 255], alpha: 1, hex: hex.toUpperCase() }, $extensions: { 'com.figma.scopes': ['ALL_SCOPES'] } }
  }
  const out: Record<string, unknown> = { 'op-color': { white: token('#ffffff'), black: token('#000000') } }
  const alerts: Record<string, unknown> = {}
  for (const f of t.families) {
    const cells = ramp(f, t.model, scheme)
    const scale: { base?: unknown; plus: Record<string, unknown>; minus: Record<string, unknown>; on: { plus: Record<string, unknown>; minus: Record<string, unknown>; base?: unknown; 'base-alt'?: unknown } } = { plus: {}, minus: {}, on: { plus: {}, minus: {} } }
    for (const c of cells) {
      const m = /^(plus|minus)-(.+)$/.exec(c.step)
      if (!m) { scale.base = token(c.bg); scale.on.base = token(c.on); scale.on['base-alt'] = token(c.alt); continue }
      const group = m[1] as 'plus' | 'minus', name = m[2] as string
      scale[group][name] = token(c.bg)
      scale.on[group][name] = token(c.on)
      scale.on[group][`${name}-alt`] = token(c.alt)
    }
    if (f.prefix.startsWith('alerts-')) alerts[f.prefix.slice(7)] = scale
    else out[f.key] = scale
  }
  if (Object.keys(alerts).length) out.alerts = alerts
  out.$extensions = { 'com.figma.modeName': scheme === 'dark' ? 'Dark' : 'Light' }
  return JSON.stringify(out, null, 2)
}

/* ---------- the swatch grid, one SVG per family ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const label = (step: string) => step.replace(/\b\w/g, ch => ch.toUpperCase())

export function swatchSvg(f: Family, model: Model, scheme: Scheme): string {
  const cells = ramp(f, model, scheme)
  const cols = 7, w = 132, h = 78, gap = 4
  const rows = Math.ceil(cells.length / cols)
  const W = cols * w + (cols - 1) * gap, H = rows * h + (rows - 1) * gap
  const badge = (r: number) => `${level(r)} ${r.toFixed(1)}`
  const parts = cells.map((c, i) => {
    const x = (i % cols) * (w + gap), y = Math.floor(i / cols) * (h + gap)
    const fail = (r: number) => (r < 4.5 ? ' ✕' : '')
    return `<g transform="translate(${x},${y})"><title>${esc(v(f, c.step))} ${c.bg}\non: ${c.on} (${c.onRatio.toFixed(2)}:1)\nalt: ${c.alt} (${c.altRatio.toFixed(2)}:1)</title>` +
      `<rect width="${w}" height="${h}" rx="6" fill="${c.bg}" stroke="${c.step === 'base' ? '#000' : 'rgba(0,0,0,.12)'}" stroke-width="${c.step === 'base' ? 2 : 1}"/>` +
      `<text x="10" y="22" font-size="13" font-weight="600" fill="${c.on}">${esc(label(c.step))}</text>` +
      `<text x="10" y="40" font-size="11" fill="${c.alt}">Alt text</text>` +
      `<text x="10" y="58" font-size="10" fill="${c.on}">on ${badge(c.onRatio)}${fail(c.onRatio)}</text>` +
      `<text x="10" y="71" font-size="10" fill="${c.alt}">alt ${badge(c.altRatio)}${fail(c.altRatio)}</text>` +
      `<text x="${w - 8}" y="40" font-size="10" text-anchor="end" fill="${c.alt}">${c.bg}</text></g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, system-ui, sans-serif">${parts.join('')}</svg>`
}

/** A strip of every family's base and two tints, for the overview at the top of the pane. */
export function overviewSvg(t: Theme, scheme: Scheme): string {
  const picks: Step[] = ['plus-eight', 'plus-five', 'plus-two', 'base', 'minus-three', 'minus-six']
  const rowH = 26, labelW = 90, cw = 56
  const rows = t.families.map((f, r) => {
    const cells = ramp(f, t.model, scheme)
    const sw = picks.map((p, i) => {
      const c = cells.find(x => x.step === p)!
      return `<rect x="${labelW + i * (cw + 3)}" y="${r * (rowH + 4)}" width="${cw}" height="${rowH}" rx="4" fill="${c.bg}"><title>${esc(v(f, p))} ${c.bg}</title></rect>`
    }).join('')
    return `<text x="0" y="${r * (rowH + 4) + 17}" font-size="12" fill="${scheme === 'dark' ? '#ddd' : '#333'}">${esc(f.name)}</text>${sw}`
  }).join('')
  const W = labelW + picks.length * (cw + 3), H = t.families.length * (rowH + 4)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, system-ui, sans-serif">${rows}</svg>`
}
