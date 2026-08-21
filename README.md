# Salt Swap V1.1 — Light Blue UI

Vercel-ready static Salt Swap prototype.

## What changed in V1.1
- New light-blue / icy fintech visual direction.
- Uses the Salt Swap salt-shaker logo supplied by the project owner.
- Homepage stays clean: token data is hidden until a contract address is scanned.
- Beginner-first result view with Salt Risk Score and plain-English explanation.
- Detailed risk data appears only after the scan.
- Responsive desktop/mobile layout.
- Preserves the Vercel serverless `/api/scan` Solana RPC check from V1.0.3.
- No React, Vite, npm install, or build step required.

## Deploy to Vercel
Upload the contents of this folder directly to the root of the Salt-Swap GitHub repository. Vercel should use:
- Framework preset: Other
- Root directory: `./`
- Build command: none
- Output directory: none

Vercel will redeploy automatically after the GitHub commit.

## Current scanner limits
V1.1 uses real Solana RPC data for mint/freeze authority and raw largest-account concentration. Bundle detection, creator-linked ownership, liquidity, duplicate detection, creator history, live swap routing, and project verification still need dedicated data sources. Missing signals are intentionally labeled unknown instead of being invented.
