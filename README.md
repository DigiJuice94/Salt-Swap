# Salt Swap V1.0.3 — Vercel Ready

This version intentionally uses plain HTML, CSS and browser JavaScript so there is **no npm install and no frontend build step** to fail on Vercel.

## Correct GitHub root
Upload these exact files/folders directly to the root of the `Salt-Swap` repository:

- `api/`
  - `scan.js`
- `.env.example`
- `.gitignore`
- `app.js`
- `index.html`
- `README.md`
- `styles.css`
- `vercel.json`

There should be **no `src/` folder, no `package.json`, no duplicate index files, and no Vite config** in this version.

## Deploy to Vercel
- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: leave blank/default
- Output Directory: leave blank/default
- Environment Variables: optional; `SOLANA_RPC_URL` can be added later

Commit the files to GitHub and Vercel should auto-redeploy.

## V1 capabilities
- Beginner-friendly Salt Risk Score UI
- Real Solana contract-address scan through `/api/scan?mint=...`
- Mint authority status
- Freeze authority status
- Raw Top-10 token-account concentration
- Clear `Coming next` labels rather than fabricated bundle/owner/liquidity numbers
- Demo token to preview the future full data experience

Wallet connection and actual swap execution are deliberately labeled as not active in this prototype yet.
