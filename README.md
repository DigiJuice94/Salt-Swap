# Salt Swap V1.4.0 — No-Backend Scanner

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
