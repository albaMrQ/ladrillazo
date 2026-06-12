# Ladrillazo — MrQ

A multiplayer social-casino "crash" game. You're a greedy property developer:
stack floors to grow your tower's multiplier, then **cash out before it collapses**.
8 players, one skyline, ~60-second matches. Play money; all rivals are house bots.
Runs on the validated **96% RTP** model (risk and reward move together — events &
sabotage change variance, never the house edge).

## Play it

- **Hosted (GitHub Pages):** open the repo's Pages URL — it serves `index.html`.
- **Locally:** open `index.html` in a browser (or `Ladrillazo-standalone.html`, a
  single self-contained file with all art/fonts embedded — handy for sharing).

## Deploy to GitHub Pages

1. Push this folder to a repo (root is fine).
2. **Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → Save.**
3. Wait ~1 min. Live at `https://<username>.github.io/<repo>/` (loads `index.html`).

> Free GitHub Pages requires a **public** repo (code is visible). For an unreleased
> product, use a private repo + Pages on a Pro/org plan to keep it internal.

## Files

| File | What it is |
|------|------------|
| `index.html` | Entry page for Pages (copy of `Ladrillazo.html`). |
| `Ladrillazo.html` | Multi-file build markup. |
| `ladrillazo.css` | All styling (the design). |
| `ladrillazo.js` | Game + UI engine (collapse maths, events, sabotage, bots). |
| `assets/` | Art: avatars, character bodies, city, logo, mascot. |
| `fonts/` | Embedded display font. |
| `Ladrillazo-standalone.html` | Everything inlined into one portable file. |

## Notes

- Edit gameplay in `ladrillazo.js`, look & feel in `ladrillazo.css`.
- If you change the multi-file source, regenerate `Ladrillazo-standalone.html`
  before sharing the single file.
- This is a prototype: rivals are cosmetic bots and the match fast-forwards at the
  end. A real-time authoritative multiplayer server is the next build step.
