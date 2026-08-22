# Salt Swap V1.3.2 — Functional Scanner

V1.3.2 keeps the approved Salt Swap design and turns the scanner into a real multi-chain meme-coin risk checker.

## Live checks

### Solana
- Mint account existence, supply, mint authority and freeze authority from Solana RPC
- Raw top-account concentration fallback from Solana RPC
- GoPlus Solana Token Security enrichment when available
- Token metadata/name/symbol when returned
- Indexed top holders and tagged creator/deployer holdings when available
- SPL/SPL-2022 risks: mintable, freezable, non-transferable, default frozen state, transfer hook, closable, mutable balances and transfer fee data
- DEX TVL/liquidity and market presence when returned by GoPlus
- Malicious-creator flag when returned

### Ethereum + BNB Chain
- On-chain contract existence, ERC-20 name/symbol/supply and standard owner() fallback
- EIP-1967 proxy-slot fallback
- GoPlus Token Security: honeypot, cannot-sell, taxes, open source, minting, ownership/admin risks, pause/blacklist/balance controls, top holders, creator/owner percentage, holder count, DEX liquidity and counterfeit-token signals when available

## Salt Score + Data Confidence
The score is calculated only from checks that returned real data. Data Confidence is separate and shows how much of the core checklist was actually completed. Low-confidence scans are labeled PRELIMINARY instead of being presented as fully trustworthy.

## Still intentionally not guessed
- True bundled supply / linked-wallet percentage
- Accurate launch-sniper share
- Full deployer launch history
- Full official-project/duplicate-CA identity graph

Those need dedicated transaction indexing and wallet-graph analysis and should be built as the next intelligence layer.

## Vercel
This remains a no-build static frontend + Vercel serverless API. Deploy as Framework: Other. Root: `./`. No npm install/build is needed.

You can optionally add the variables from `.env.example` in Vercel Project Settings → Environment Variables.

## Important
Security APIs and RPC providers can fail, rate-limit, or return incomplete results. Salt shows unknown/preliminary states instead of inventing missing values. This is risk information, not financial advice.

V1.3.2: fixed Salt Check initialization and silent-failure behavior; added scanning state, cache busting, request timeout, and visible API errors.

V1.3.2 hardens Salt Check by embedding the application JavaScript directly in index.html and adding a direct button fallback, eliminating external app.js loading/cache as a silent failure point.
