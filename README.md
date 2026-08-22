# Salt Swap V1.5.1 — Helius + Birdeye

This release moves data-provider secrets behind a Vercel serverless backend.

## Required structure

```
api/
  health.js
  scan.js
app.js
index.html
styles.css
.env.example
README.md
```

## Vercel environment variables

Required for reliable Solana scans:
- `HELIUS_API_KEY`

Recommended for deeper market/security data on Solana, Ethereum and BNB Chain:
- `BIRDEYE_API_KEY`

Add them in Vercel Project Settings -> Environment Variables, select Production (and Preview if you use preview deploys), save, then redeploy. Never place real keys in app.js, index.html, GitHub, README, or .env.example.

## Provider roles
- Helius: dedicated Solana RPC for mint existence, supply, mint/freeze authority and largest token accounts.
- Birdeye: token overview + token security for liquidity, holder count, token identity and indexed risk fields when available.

## Health check
After deployment open `/api/health`. It returns only booleans showing whether each environment variable is configured; it never returns the keys themselves.

## Important
Birdeye is optional in this build. Solana scans require Helius. If Birdeye is missing, Salt still performs Helius on-chain checks and marks market/indexer fields Unknown instead of guessing.

V1.5.1 fixes the frontend initialization issue by embedding the Salt scanner JavaScript directly in index.html. The page no longer depends on /app.js loading separately. Helius and Birdeye remain server-side through /api/scan and Vercel Environment Variables.
