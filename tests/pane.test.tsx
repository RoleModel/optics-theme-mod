import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'optics-theme',
  component: 'Pane',
  requestId: 'optics-theme',
  props: {
    title: 'Optics theme',
    isFocused: false,
    bodyColumns: 120,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

async function start($: any, on: any) {
  on('command.register', () => ({ value: { command: 'optics-theme' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.toast', () => ({ value: undefined }))
  const store: Record<string, unknown> = {}
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store[e.key] }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { store[e.key] = e.value; return { value: undefined } })
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
}

test('the OKLCH default passes AA everywhere and draws the swatches', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  expect((await ui.find({ type: 'Text', text: /passes AA/ }))?.text).toContain('Every text pair passes AA')
  expect((await ui.findAll({ type: 'Svg' })).map((s: any) => s.props.alt).join('|')).toContain('Primary ramp')
  await ui.unmount()
})

test('switching to HSL shows the failing pairs, and families can be selected', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'model-hsl' })
  expect((await ui.find({ type: 'Text', text: /below 4\.5:1/ }))?.text).toMatch(/text pairs? below 4\.5:1/)

  await ui.press({ key: 'tab-danger' })
  expect((await ui.findAll({ type: 'Svg' })).map((s: any) => s.props.alt).join('|')).toContain('Danger ramp')
  await ui.unmount()
})

test('a brand hex sets the family inputs', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.input({ key: 'hex-primary', text: '#1e40af', submit: true })
  const hue = await ui.find({ key: 'oh-primary' })
  expect(hue).toBeDefined()
  await ui.unmount()
})

test('the command hands the CSS to the chat', async ($, on) => {
  await start($, on)
  const out = await $.command.run({ command: 'optics-theme', args: 'css' })

  expect(JSON.stringify(out)).toContain('--op-color-primary-ok-h')
})

test('every surface draws something', async ($, on) => {
  await start($, on)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /pass|below/ })).toBeDefined()
    await ui.unmount()
  }
})
