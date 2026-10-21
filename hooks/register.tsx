import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Family, Theme } from '../types'
import { DEFAULT_THEME, css, failures, figma, hexToHsl, hexToOklch, overviewSvg, ramp, swatchSvg, level } from './color'

/* Optics theme: a pane for building an Optics colour theme in OKLCH (or Optics' own HSL),
   with every step's text contrast checked live, and the CSS / Figma tokens a copy away.
   /optics-theme opens it; /optics-theme css puts the CSS in the chat for Claude to write into a file. */

const PANE = 'optics-theme'
const STORE_KEY = 'theme.v1'
const theme = atom({ plugin: 'optics-theme', key: 'theme' } as const, DEFAULT_THEME)

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round = (n: number, d: number) => +n.toFixed(d)

/** Every edit goes through here: the session value redraws the pane, the store keeps it for next time. */
async function save($: EngineInterface, fn: (t: Theme) => Theme) {
  await update($, theme, t => fn(t ?? DEFAULT_THEME))
  await $.store.set(STORE_KEY, await read($, theme))
}

async function editFamily($: EngineInterface, key: string, fn: (f: Family) => Family) {
  await save($, t => ({ ...t, families: t.families.map(f => (f.key === key ? fn(f) : f)) }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'optics-theme',
      description: 'Build an Optics colour theme (OKLCH or HSL) with live contrast checks. Add "css" to get the CSS in the chat.',
      argumentHint: '[css]',
    })
    const saved = (await $.store.get(STORE_KEY)) as Theme | undefined
    if (saved && Array.isArray(saved.families) && saved.families.length) await update($, theme, () => ({ ...DEFAULT_THEME, ...saved }))
    // the first session after install opens the pane once, so people see what they installed; after that, /optics-theme
    if (!(await $.store.get('opened.v1'))) {
      await $.store.set('opened.v1', true)
      void $.ui.open({ id: PANE, title: 'Optics theme' })
    }

    return next(e)
  })

  on('command.run', { command: 'optics-theme' }, async ($, e) => {
    const t = await read($, theme)
    if (/\bcss\b/i.test(e.args)) {
      return {
        text: `Optics colour theme (${t.model.toUpperCase()}, ${t.format === 'tokens' ? 'inputs + formulas' : 'resolved hex'}):\n\n\`\`\`css\n${css(t)}\`\`\``,
        context: ['This is the theme the person built in the Optics theme pane. If they ask, write it to their theme file (load it after Optics).'],
      }
    }
    await $.ui.open({ id: PANE, title: 'Optics theme' })

    return { text: 'Optics theme pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const t = await read($, theme)
    const f = t.families.find(x => x.key === t.selected) ?? t.families[0]!
    const fails = failures(t)
    const cols = e.props.bodyColumns ?? 100
    const px = Math.max(320, cols * 8)
    const isOk = t.model === 'oklch'

    const summary = fails.length
      ? `${fails.length} text pair${fails.length === 1 ? '' : 's'} below 4.5:1 (light + dark). Worst: ${fails.sort((a, b) => a.ratio - b.ratio).slice(0, 3).map(x => `${x.family} ${x.step} ${x.band} ${x.scheme} ${x.ratio.toFixed(2)}`).join(' · ')}`
      : 'Every text pair passes AA (4.5:1) in light and dark.'

    /* terminal: no Svg, so a compact text table of the selected family */
    if (e.surface === 'terminal') {
      const { Box, Text, Button } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Text bold>Optics theme · {t.model.toUpperCase()} · {t.scheme}</Text>
          <Text dimColor>{summary}</Text>
          <Box flexDirection="row" gap={1}>
            {t.families.map(x => <Button key={`tab-${x.key}`} label={x.name} variant={x.key === f.key ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, selected: x.key }))} />)}
          </Box>
          {ramp(f, t.model, t.scheme).map(c => (
            <Text>{c.step.padEnd(12)} {c.bg}  on {c.onRatio.toFixed(1)} {level(c.onRatio)}  alt {c.altRatio.toFixed(1)} {level(c.altRatio)}</Text>
          ))}
          <Button key="copy-css" label="Copy CSS" onPress={p => void $.ui.copy({ text: css(t), surface: p.surface })} />
        </Box>
      )
    }

    const els = $.ui.resolve(e)
    const { Box, Text, Button, Svg } = els
    const Input = 'Input' in els ? els.Input : undefined // mobile has no text field: the − / + buttons still work there
    const nudge = (label: string, field: 'h' | 's' | 'oh' | 'oc' | 'ot', step: number, lo: number, hi: number, d: number) => {
      const val = f[field]
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Button key={`${field}-down`} label="−" onPress={() => editFamily($, f.key, x => ({ ...x, [field]: round(clamp(x[field] - step, lo, hi), d) }))} />
          {Input ? (
            <Input
              key={`${field}-${f.key}`}
              label={label}
              value={String(round(val, d))}
              submitLabel="set"
              onSubmit={(value: string) => {
                const num = Number(value.replace(',', '.'))
                if (Number.isFinite(num)) void editFamily($, f.key, x => ({ ...x, [field]: round(clamp(num, lo, hi), d) }))
              }}
            />
          ) : (
            <Text>{label} {String(round(val, d))}</Text>
          )}
          <Button key={`${field}-up`} label="+" onPress={() => editFamily($, f.key, x => ({ ...x, [field]: round(clamp(x[field] + step, lo, hi), d) }))} />
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1} paddingX={1}>
        <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
          <Button key="model-oklch" label="OKLCH" variant={isOk ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, model: 'oklch' }))} />
          <Button key="model-hsl" label="HSL" variant={!isOk ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, model: 'hsl' }))} />
          <Text dimColor>·</Text>
          <Button key="scheme-light" label="Light" variant={t.scheme === 'light' ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, scheme: 'light' }))} />
          <Button key="scheme-dark" label="Dark" variant={t.scheme === 'dark' ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, scheme: 'dark' }))} />
          <Text dimColor>·</Text>
          <Button key="format" label={t.format === 'tokens' ? 'Output: inputs + formulas' : 'Output: resolved hex'} onPress={() => save($, s => ({ ...s, format: s.format === 'tokens' ? 'resolved' : 'tokens' }))} />
          <Button key="copy-css" label="Copy CSS" onPress={async p => {
            const r = await $.ui.copy({ text: css(t), surface: p.surface })
            void $.ui.toast(r.isCopied ? 'Theme CSS copied' : 'Couldn’t reach the clipboard. Run /optics-theme css instead.')
          }} />
          <Button key="copy-figma" label={`Copy Figma tokens (${t.scheme})`} onPress={async p => {
            const r = await $.ui.copy({ text: figma(t, t.scheme), surface: p.surface })
            void $.ui.toast(r.isCopied ? `Figma ${t.scheme} tokens copied: save as "Color Styles.${t.scheme === 'dark' ? 'Dark' : 'Light'}.tokens.json"` : 'Couldn’t reach the clipboard.')
          }} />
          <Button key="reset" label="Reset" onPress={() => save($, () => DEFAULT_THEME)} />
        </Box>

        <Text dimColor={!fails.length} color={fails.length ? 'red' : undefined}>{summary}</Text>
        <Svg source={overviewSvg(t, t.scheme)} alt="Every family's ramp at a glance" isInteractive />

        <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
          {t.families.map(x => (
            <Button key={`tab-${x.key}`} label={x.name} variant={x.key === f.key ? 'primary' : undefined} onPress={() => save($, s => ({ ...s, selected: x.key }))} />
          ))}
          {Input && <Input key="add-family" placeholder="Add a family (e.g. Secondary)" submitLabel="add" onSubmit={(value: string) => {
            const name = value.trim()
            const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            if (!key) return
            void save($, s => s.families.some(x => x.key === key) ? { ...s, selected: key } : {
              ...s, selected: key, families: [...s.families, { key, name, prefix: key, h: 260, s: 40, oh: 270, oc: 0.12, ot: 1 }],
            })
          }} />}
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" flexWrap="wrap" gap={2} alignItems="center">
            <Text bold>{f.name}</Text>
            <Text dimColor mono>--op-color-{f.prefix}-*</Text>
            {isOk ? nudge('Hue', 'oh', 5, 0, 360, 1) : nudge('Hue', 'h', 5, 0, 360, 0)}
            {isOk ? nudge('Chroma', 'oc', 0.01, 0, 0.37, 3) : nudge('Saturation', 's', 5, 0, 100, 0)}
            {isOk && nudge('Tint', 'ot', 0.05, 0, 1, 2)}
            {Input && <Input key={`hex-${f.key}`} label="From hex" placeholder="#1e8a5a" submitLabel="use" onSubmit={(value: string) => {
              const ok = hexToOklch(value), hsl = hexToHsl(value)
              if (!ok || !hsl) return void $.ui.toast('That isn’t a hex colour (#rrggbb).')
              void editFamily($, f.key, x => ({ ...x, oh: round(ok.H, 1), oc: round(ok.C, 3), h: hsl.h, s: hsl.s }))
            }} />}
            {!f.isCore && <Button key={`remove-${f.key}`} label="Remove family" onPress={() => save($, s => ({ ...s, selected: 'primary', families: s.families.filter(x => x.key !== f.key) }))} />}
          </Box>
          <Text dimColor>
            {isOk
              ? 'One lightness ladder for every family: base sits at L .535 so white text clears AA in any hue. Tint scales chroma on the light tints only (plus-four…eight); lower it to calm a loud family.'
              : 'Optics’ own HSL ladder. Equal L looks different across hues, so check the ratios on each family.'}
          </Text>
          <Svg source={swatchSvg(f, t.model, t.scheme)} alt={`${f.name} ramp with contrast for on and alt text`} width={Math.min(px, 940)} isInteractive />
        </Box>
      </Box>
    )
  })
}
