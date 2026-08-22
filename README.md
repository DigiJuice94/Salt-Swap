# Salt Swap V1.3.6 — Root API Fix

This version is intentionally flat for GitHub web uploads. `scan.js` stays in the project root. `vercel.json` explicitly builds it as a Node function and routes `/api/scan` to it.

Upload/replace these files at the ROOT of the GitHub repository:
- index.html
- styles.css
- app.js
- scan.js
- vercel.json

No `/api` folder is required for this version.

V1.3.6 backend fix: restored Vercel's standard /api/scan.js function layout, removed the legacy root-function routing workaround, added /api/health for deployment testing, and added Solana RPC fallback across the configured RPC, Solana public mainnet RPC, and PublicNode.

IMPORTANT: GitHub must visibly contain an `api` folder with both `scan.js` and `health.js`. Vercel automatically exposes them as `/api/scan` and `/api/health`.

V1.3.6 removes the custom functions glob from vercel.json. Vercel automatically discovers JavaScript functions placed in the top-level /api directory.
