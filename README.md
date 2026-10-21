# optics-theme

A Claude mod for building an Optics colour theme. It opens a pane next to the chat where you set each colour family's inputs. The pane draws every step of every ramp with its text and muted-text contrast checked live, in light and dark. Then you copy the CSS or the Figma variables.

## Use it

- `/optics-theme` opens the pane.
- `/optics-theme css` puts the theme's CSS in the chat, so you can ask Claude to write it into your theme file.

In the pane:

- **OKLCH / HSL**: OKLCH uses one lightness ladder for every family, so a step looks equally light in every hue and takes the same text colour. HSL is Optics' own ladder, shown for comparison; its failing pairs are listed.
- **Light / Dark**: which scheme the swatches show. The contrast summary always covers both.
- **Families**: pick one to edit its hue and chroma (OKLCH) or hue and saturation (HSL), with the field or the − / + buttons. *Tint* scales chroma on the light tints only (plus-four to plus-eight): lower it to calm a loud family (danger defaults to 0.35). *From hex* starts a family from a brand colour. *Add a family* creates a new scale (`--op-color-<name>-*`).
- **Output**: *inputs + formulas* is what a theme file should hold: per-family inputs plus `light-dark(oklch(...))` formulas over them. *Resolved hex* gives plain values, with dark mode in a media query.
- **Copy CSS** and **Copy Figma tokens** put the output on your clipboard. The Figma file is one per mode: save it as `Color Styles.Light.tokens.json` or `Color Styles.Dark.tokens.json` and import it as variables.

Your theme is remembered between sessions.

## How the OKLCH ramp works

- Inputs per family: `--op-color-<family>-ok-h` (hue), `-ok-c` (chroma at base) and `-ok-t` (light-tint factor).
- Every step has a fixed lightness, from plus-max (1.0) through base (0.535) to minus-max (0), and takes a share of the family's chroma.
- Text flips from dark to light at L 0.6. The main text pair passes AA on every step. Muted (alt) text starts at its muted lightness and moves toward the main text colour only as far as 4.5:1 needs.
- Load the CSS after Optics. `light-dark()` needs `color-scheme: light dark` on `:root`.

## Install

At the prompt of a terminal session:

```
/plugin install optics-theme --marketplace RoleModel/optics-theme-mod
```

From a shell:

```
claude plugin install optics-theme --marketplace RoleModel/optics-theme-mod
```

In the desktop app, where `/plugin` doesn't run: click + next to the prompt box, then Plugins, Add marketplace with `RoleModel/optics-theme-mod`, then Add plugin.

The repository is private: it installs only for people who can read it on GitHub and whose machine already has a git credential for github.com (an SSH key, or `gh auth login` then `gh auth setup-git`).
