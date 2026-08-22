# Salt Swap V1.6.1 — Root Backend Verified

This build is designed for simple GitHub web uploads without folders being flattened.

Root files only:
- index.html
- styles.css
- api.js
- vercel.json
- .env.example

Vercel routes:
- /api/health -> api.js
- /api/scan -> api.js

Environment variables in Vercel:
- HELIUS_API_KEY (required for Solana)
- BIRDEYE_API_KEY (recommended for market/security enrichment)

The scanner frontend is embedded directly in index.html, so there is no external app.js dependency.

V1.6.1: backend changed to api.mjs with a Vercel-compatible default ES module export. /api/health and /api/scan route explicitly through route query parameters so the function does not depend on rewritten request path behavior.
