# Salt Swap V1.7.9 — Root Backend Verified

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

V1.7.9: backend changed to api.mjs with a Vercel-compatible default ES module export. /api/health and /api/scan route explicitly through route query parameters so the function does not depend on rewritten request path behavior.

V1.7.9 Token Identity Resolution: Solana scans now request Helius getAsset metadata in the same backend batch and prefer Helius metadata for name/symbol/image, then Birdeye as fallback, then Unknown token. This improves identity for newly launched meme coins before third-party indexers catch up.


V1.7.9 — Holder Intelligence
- Adds Birdeye Token Holder Profile to Solana scans.
- Populates live current-supply share for bundler, sniper, insider, dev, and smart-trader cohorts when indexed.
- Uses include_zero_balance=false so the percentages focus on wallets still holding the token.
- Adds bundler/sniper/insider/dev exposure into Salt Score and Data Confidence only when Birdeye returns a real percentage.
- Keeps unavailable classifications explicitly unknown rather than guessing.
- Birdeye holder-profile costs provider compute credits per request; usage limits can temporarily make these fields unavailable.


V1.7.9 coverage update: holder-profile fallbacks through Birdeye Top Traders, Helius creator-wallet tracing and creator supply share, Helius creator activity context, and DexScreener duplicate-name/symbol identity screening. Unknown now means Could not verify rather than implying 0%.

V1.7.9 adds deeper new-token image resolution and Salt launch-bundle fallback analysis.


V1.7.9 Hard Risk Override Engine
- Keeps the normal weighted Salt Score visible.
- Forces the final verdict to HIGH RISK if a verified core safety check fails: authenticity, sellability, or active freeze capability.
- Active mint capability is now a major warning, not an automatic HIGH RISK override by itself.
- Active mint can still force HIGH RISK when combined with severe ownership/control risk: Top 10 >70%, bundled supply >15%, or creator/dev share >=10%.
- Forces HIGH RISK when Top 10 concentration is >80%, bundled supply is >25%, or Top 10 is >70% AND bundled supply is >15%.
- Positive liquidity/holder/contract checks cannot cancel these severe structural risks.
- Returns hardRiskOverride and hardRiskReasons so the UI explains exactly why the verdict was forced.


## V1.7.9 — Live Solana Swap
- Live SOL -> scanned-token quotes from Jupiter Swap API V2 `/order`.
- Quote-only mode works before wallet connection; quotes refresh every 10 seconds while an amount is entered.
- Connects injected Solana wallets such as Phantom/Solflare.
- Requests a brand-new executable Jupiter order immediately before wallet signing.
- User signs a versioned transaction locally in the wallet; Salt never receives a seed phrase or private key.
- Signed transaction is sent to Salt's `/api/execute`, which forwards it to Jupiter `/execute` for managed landing.
- Displays expected output, effective live rate, router, price impact when supplied, and Jupiter RTSE slippage protection.
- HIGH RISK tokens require an additional confirmation before the wallet signature prompt.
- Live execution is Solana-only in this version; Ethereum and BNB scans remain available but their swap execution is intentionally disabled.

### Required Vercel variable
`JUPITER_API_KEY` — create a free API key in the Jupiter developer portal and add it to Production and Preview environments.


V1.7.9 token selector:
- Jupiter Tokens V2-backed search by name, ticker, or mint.
- Popular Solana tokens, recent selections, and live 1h trending tokens.
- Arbitrary Solana input assets are supported, with exact token-decimal conversion before Jupiter quotes.
- ETH/BNB popular asset sets are pinned in the UI but intentionally non-executable until the EVM router ships.
- Popular sets include stablecoins and common base assets such as SOL, USDC, USDT, BTC/ETH wrappers, and JitoSOL where Jupiter returns them.


V1.7.9 adds live Ethereum and BNB Chain quoting/execution through 0x Swap API V2 (AllowanceHolder), compact swap-token buttons, clickable EVM popular assets, EVM token search for receive assets, and DexScreener image fallback for Solana trending/popular tokens. Add ZEROX_API_KEY in Vercel for ETH/BNB swaps.


## V1.7.9 token image + picker reliability
- Native SOL now always has an embedded Solana logo in the swap bar.
- Solana token artwork resolver now tries Jupiter, Helius DAS metadata, DexScreener, then Pump.fun metadata before falling back to initials.
- IPFS/Arweave metadata image URIs are normalized for browser display.
- Token picker is moved to the document body so animated results containers cannot alter fixed positioning.
- Picker scroll position resets every time it opens and search focus uses preventScroll.
- Page scrolling is locked while the token picker is open.

V1.7.9 fixes selected-token artwork persistence: the resolved image from the token picker is preserved through the risk rescan and reused by the swap selector if the scanner response lacks an image.

V1.7.9 fixes selected-token artwork priority: a working picker/trending image is preserved ahead of scan-returned artwork, and the compact swap token icon now cycles through fallback image URLs before falling back to initials.

V1.7.9: CA-scan auto-selection now performs an exact-address token lookup and applies resolved artwork to both the token header and swap receive button.


## V1.7.9 — Mint risk calibration
- Active mint authority is shown as a warning instead of a standalone hard-fail.
- Mint risk still lowers the weighted Salt Score.
- Mint + severe concentration/bundles/dev control can still trigger HIGH RISK.
- Cannot sell, authenticity failure, active freeze authority, and severe ownership overrides remain unchanged.

V1.7.9 adds live current price and market cap directly beneath the token contract in the scan identity header. Values come from Birdeye token overview data; Solana market cap can fall back to current price × on-chain supply when the indexed market-cap field is absent. Missing values remain unknown and are never guessed.
