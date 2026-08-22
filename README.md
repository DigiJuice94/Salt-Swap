# Salt Swap V1.4.1 — No-Backend Scanner

This release removes the Vercel serverless API requirement for the first working scanner. Salt Check runs directly in the browser using public/no-key data sources.

Upload only these files to the repository root:
- index.html
- styles.css
- app.js
- README.md

No /api folder, package.json, Vite files, or vercel.json are needed for this release.

Current live data paths:
- Solana: public Solana JSON-RPC for mint existence, supply, mint/freeze authorities, and largest token accounts; GoPlus public token-security data when available.
- Ethereum and BNB Chain: public JSON-RPC for contract detection; GoPlus public token-security data when available.

No API key is required for this release. Missing provider data remains Unknown rather than being guessed.

V1.4.1 Solana RPC reliability update:
- Tries PublicNode before the official Solana public RPC.
- Falls back across multiple no-key RPC endpoints.
- Batches the three core Solana reads into one JSON-RPC request per provider.
- Retries once with a short backoff on HTTP 429.
- Shows a clean temporary-provider-busy message instead of exposing raw 429 errors.
