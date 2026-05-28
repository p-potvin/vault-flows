# vaultwares-old-design (retired)

Archive of the pre-`vaultwares-revisited` theme system, kept for reference.

## What was here

vault-flows originally used the `vault-themes` switchable-palette model —
a `THEMES` array exposing per-theme tokens (`golden-slate`,
`solarized-light-revisited`, `cyberpunk-cinder`, etc.), with a runtime
`applyTheme()` setting CSS custom properties and a `<ThemePicker>` dropdown
in the header letting the user swap palettes on the fly.

| File | Role |
|---|---|
| `theme.ts` | `initTheme()` + `applyTheme()` — wrote per-theme tokens to `:root` and persisted choice to `localStorage` |
| `ThemePicker.tsx` | `<select>` dropdown switching between `THEMES` from `vault-themes/theme-manager/exports/theme-manager.ts` |
| `index.css` | Original stylesheet using `var(--accent)` / `var(--surface)` / `var(--text)` tokens |

## Why it was retired

Replaced by the **vaultwares-revisited** design system (see
`vaultwares-themes/vaultwares-revisited/`), which has two fixed conceptual
spaces — *Console* (operational, dark, violet glow) and *Warm* (archival,
paper, gold accent) — coexisting in the same view rather than swapped via
a picker. Tokens namespaced under `--vault-console-*` / `--vault-warm-*`,
exposed through Tailwind's `@theme` block as `vw-console-*` / `vw-warm-*`.

The old `--accent` / `--surface` / `--text` vars no longer exist anywhere
in the active source tree.

Retired in: redesign commit, May 2026.
