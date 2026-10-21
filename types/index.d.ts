export type Model = 'oklch' | 'hsl'
export type Scheme = 'light' | 'dark'
export type Format = 'tokens' | 'resolved'

/** One colour family (an Optics scale): its inputs in both models. */
export type Family = {
  key: string
  name: string
  /** CSS namespace: --op-color-<prefix>-* */
  prefix: string
  /** HSL inputs (Optics' own model) */
  h: number
  s: number
  /** OKLCH inputs: hue, chroma at base, tint factor for plus-four…plus-eight */
  oh: number
  oc: number
  ot: number
  /** The six Optics families can't be removed */
  isCore?: boolean
}

export type Theme = {
  model: Model
  scheme: Scheme
  format: Format
  selected: string
  families: Family[]
}

declare module 'claude-code' {
  interface PluginState {
    'optics-theme': { theme: Theme }
  }
}
