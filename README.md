# Draft Order Lottery

A verifiable fantasy-football draft-order randomizer. Static site, no server,
no dependencies, no build step — the entire result is computed in the browser
from a seed (any non-empty text, case-insensitive, trimmed).

## How the draw works

1. Before the draw, the seed is chosen and recorded on video (so nobody can
   claim seeds were cherry-picked).
2. The seed is entered on the site → the draft order appears, pick by pick.
3. Any league member can verify: open the same site, enter the same seed, get
   the same order — on any device. The result panel also gives a link that
   encodes the seed + team list for one-click verification.

Why it can't be gamed:

- **Deterministic**: randomness is derived from SHA-256 of the seed (blocks of
  `SHA-256("<SEED>:<i>")`), driving a Fisher–Yates shuffle with rejection
  sampling (every permutation exactly equally likely).
- **Entry-order-proof**: team names are alphabetized before shuffling, so the
  order they were typed in can never affect the result.
- **Auditable**: the whole algorithm is ~100 lines in [`draft.js`](draft.js),
  readable via View Source on the deployed site.

## Configuring teams

Use the **Settings** tab to set the number of teams (2–20) and their names.
Settings persist in the browser via localStorage. To change the defaults baked
into the deployed site, edit `DEFAULT_TEAMS` near the top of the `<script>` in
`index.html`.

## Run locally

```bash
npx serve .          # or any static server; then open http://localhost:3000
node test.mjs        # algorithm sanity tests (determinism, fairness, validation)
```

(Opening `index.html` directly via `file://` won't work — ES modules require http.)

## Deploy to Vercel

```bash
npx vercel --prod
```

or import the repo at vercel.com — no framework preset needed (static site,
no build command, output directory `.`).
