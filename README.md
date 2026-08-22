# Salt Swap V1.3.7 — Root API Fix

This version is intentionally flat for GitHub web uploads. `scan.js` stays in the project root. `vercel.json` explicitly builds it as a Node function and routes `/api/scan` to it.

Upload/replace these files at the ROOT of the GitHub repository:
- index.html
- styles.css
- app.js
- scan.js
- vercel.json

No `/api` folder is required for this version.

V1.3.7 backend fix: restored Vercel's standard /api/scan.js function layout, removed the legacy root-function routing workaround, added /api/health for deployment testing, and added Solana RPC fallback across the configured RPC, Solana public mainnet RPC, and PublicNode.

IMPORTANT: GitHub must visibly contain an `api` folder with both `scan.js` and `health.js`. Vercel automatically exposes them as `/api/scan` and `/api/health`.

V1.3.7 removes the custom functions glob from vercel.json. Vercel automatically discovers JavaScript functions placed in the top-level /api directory.

## V1.3.7 Clean Repo Fix
This package intentionally contains only the files needed for the current Salt Swap deployment:
- index.html
- styles.css
- app.js
- vercel.json
- README.md
- api/scan.js
- api/health.js

Delete old repo files before uploading this version. In GitHub, `scan.js` and `health.js` must remain inside the `api` folder.
