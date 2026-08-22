# Salt Swap V1.6.3 — Root Backend Verified

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

V1.6.3: backend changed to api.mjs with a Vercel-compatible default ES module export. /api/health and /api/scan route explicitly through route query parameters so the function does not depend on rewritten request path behavior.

V1.6.3 Token Identity Resolution: Solana scans now request Helius getAsset metadata in the same backend batch and prefer Helius metadata for name/symbol/image, then Birdeye as fallback, then Unknown token. This improves identity for newly launched meme coins before third-party indexers catch up.


V1.6.3 — Holder Intelligence
- Adds Birdeye Token Holder Profile to Solana scans.
- Populates live current-supply share for bundler, sniper, insider, dev, and smart-trader cohorts when indexed.
- Uses include_zero_balance=false so the percentages focus on wallets still holding the token.
- Adds bundler/sniper/insider/dev exposure into Salt Score and Data Confidence only when Birdeye returns a real percentage.
- Keeps unavailable classifications explicitly unknown rather than guessing.
- Birdeye holder-profile costs provider compute credits per request; usage limits can temporarily make these fields unavailable.
