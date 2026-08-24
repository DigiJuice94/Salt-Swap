# Salt Swap V1.10.33 — Crypto News Feed

Adds a live crypto-only news front page to Social → Feed, directly below the market ticker. One lead story is centered with four smaller supporting stories, sourced server-side from crypto RSS feeds. Headlines link to the original publisher. News is cached and deduplicated so failures do not break the social feed.

# Salt Swap V1.10.33

- Removed duplicate Followers and Following rows from Profile Stats.
- Banner images now persist to the Salt profile backend (Redis/KV), rather than only browser storage.
- Banner restores automatically when the same wallet profile is loaded again.
- Banner selection remains a simple image picker with no wallet-signature popup.
- Preserves V1.10.33 Social profile layout and functionality.

# Salt Swap V1.10.33 — Social Reconnect Profile Fix

Fixes existing-profile wallet reconnect so Social always restores the full Profile layout instead of falling back to the legacy token-review screen. Also fixes the Social tab renderer scope bug and defaults reconnects to Profile. Preserves V1.10.33 banner persistence and all prior features.

# Salt Swap V1.9.7 — Salt Social UI

Clean, beginner-friendly standalone Social page. Keeps V1.9.1 functionality and social backend intact.

# Salt Swap V1.8.6 — Root Backend Verified

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

V1.8.6: backend changed to api.mjs with a Vercel-compatible default ES module export. /api/health and /api/scan route explicitly through route query parameters so the function does not depend on rewritten request path behavior.

V1.8.6 Token Identity Resolution: Solana scans now request Helius getAsset metadata in the same backend batch and prefer Helius metadata for name/symbol/image, then Birdeye as fallback, then Unknown token. This improves identity for newly launched meme coins before third-party indexers catch up.


V1.8.6 — Holder Intelligence
- Adds Birdeye Token Holder Profile to Solana scans.
- Populates live current-supply share for bundler, sniper, insider, dev, and smart-trader cohorts when indexed.
- Uses include_zero_balance=false so the percentages focus on wallets still holding the token.
- Adds bundler/sniper/insider/dev exposure into Salt Score and Data Confidence only when Birdeye returns a real percentage.
- Keeps unavailable classifications explicitly unknown rather than guessing.
- Birdeye holder-profile costs provider compute credits per request; usage limits can temporarily make these fields unavailable.


V1.8.6 coverage update: holder-profile fallbacks through Birdeye Top Traders, Helius creator-wallet tracing and creator supply share, Helius creator activity context, and DexScreener duplicate-name/symbol identity screening. Unknown now means Could not verify rather than implying 0%.

V1.8.6 adds deeper new-token image resolution and Salt launch-bundle fallback analysis.


V1.8.6 Hard Risk Override Engine
- Keeps the normal weighted Salt Score visible.
- Forces the final verdict to HIGH RISK if a verified core safety check fails: authenticity, sellability, or active freeze capability.
- Active mint capability is now a major warning, not an automatic HIGH RISK override by itself.
- Active mint can still force HIGH RISK when combined with severe ownership/control risk: Top 10 >70%, bundled supply >15%, or creator/dev share >=10%.
- Forces HIGH RISK when Top 10 concentration is >80%, bundled supply is >25%, or Top 10 is >70% AND bundled supply is >15%.
- Positive liquidity/holder/contract checks cannot cancel these severe structural risks.
- Returns hardRiskOverride and hardRiskReasons so the UI explains exactly why the verdict was forced.


## V1.8.6 — Live Solana Swap
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


V1.8.6 token selector:
- Jupiter Tokens V2-backed search by name, ticker, or mint.
- Popular Solana tokens, recent selections, and live 1h trending tokens.
- Arbitrary Solana input assets are supported, with exact token-decimal conversion before Jupiter quotes.
- ETH/BNB popular asset sets are pinned in the UI but intentionally non-executable until the EVM router ships.
- Popular sets include stablecoins and common base assets such as SOL, USDC, USDT, BTC/ETH wrappers, and JitoSOL where Jupiter returns them.


V1.8.6 adds live Ethereum and BNB Chain quoting/execution through 0x Swap API V2 (AllowanceHolder), compact swap-token buttons, clickable EVM popular assets, EVM token search for receive assets, and DexScreener image fallback for Solana trending/popular tokens. Add ZEROX_API_KEY in Vercel for ETH/BNB swaps.


## V1.8.6 token image + picker reliability
- Native SOL now always has an embedded Solana logo in the swap bar.
- Solana token artwork resolver now tries Jupiter, Helius DAS metadata, DexScreener, then Pump.fun metadata before falling back to initials.
- IPFS/Arweave metadata image URIs are normalized for browser display.
- Token picker is moved to the document body so animated results containers cannot alter fixed positioning.
- Picker scroll position resets every time it opens and search focus uses preventScroll.
- Page scrolling is locked while the token picker is open.

V1.8.6 fixes selected-token artwork persistence: the resolved image from the token picker is preserved through the risk rescan and reused by the swap selector if the scanner response lacks an image.

V1.8.6 fixes selected-token artwork priority: a working picker/trending image is preserved ahead of scan-returned artwork, and the compact swap token icon now cycles through fallback image URLs before falling back to initials.

V1.8.6: CA-scan auto-selection now performs an exact-address token lookup and applies resolved artwork to both the token header and swap receive button.


## V1.8.6 — Mint risk calibration
- Active mint authority is shown as a warning instead of a standalone hard-fail.
- Mint risk still lowers the weighted Salt Score.
- Mint + severe concentration/bundles/dev control can still trigger HIGH RISK.
- Cannot sell, authenticity failure, active freeze authority, and severe ownership overrides remain unchanged.

V1.8.6 adds live current price and market cap directly beneath the token contract in the scan identity header. Values come from Birdeye token overview data; Solana market cap can fall back to current price × on-chain supply when the indexed market-cap field is absent. Missing values remain unknown and are never guessed.

V1.8.6 adds a DEX paid check using DEX Screener paid orders. It reports token profile, ads, trending-bar ads, and community takeover orders when available. This signal is informational and does not increase the Salt Score or override safety risks.

V1.8.6 improves DEX paid detection by combining official paid orders with active token boosts, latest paid profiles, ads, and community takeovers. A negative result is now phrased as no paid evidence found rather than claiming the token was never paid.


V1.8.6 EVM reliability fix: Ethereum and BNB scans now use multiple RPC fallbacks, DEX Screener market-data fallback, GoPlus token-security fallback, and Birdeye when available. A Birdeye failure no longer blanks the whole EVM scan.


## V1.8.6 — Base Chain Support
- Auto-detect now checks Ethereum, Base, and BNB Chain for 0x contracts.
- Added Base RPC fallback pool, GoPlus Base security (chain 8453), Birdeye/Base market attempts, DEX Screener Base data, and DEX-paid checks.
- Added Base token picker/search and live 0x swap routing (chain 8453).
- Added Base wallet network switching (0x2105).


## V1.8.6 — Robinhood Chain
- Added Robinhood Chain mainnet (chain ID 4663) to automatic 0x-address detection.
- Added official Robinhood mainnet RPC scanning.
- Added Birdeye Robinhood and GoPlus chain-4663 security support.
- Added Robinhood to the scan selector and token picker.
- Added live 0x swap routing for Robinhood Chain using the existing ZEROX_API_KEY.
- Added wallet switching/network-add support with ETH as gas.
- Added popular Robinhood assets: ETH, WETH, USDG and USDe.


V1.8.6 Robinhood Stock Token market-cap fix:
- Detects canonical Robinhood Stock Tokens from Robinhood's official /rhj/assets registry (chain 4663).
- Uses Robinhood /rhj/prices/{symbol} for underlying equity/token price context and applies currentMultiplier for token-equivalent price.
- Stops presenting the small on-chain stock-token supply value as the underlying company's market cap.
- Uses the public Robinhood underlying stock page for Company Market Cap when available (or Underlying AUM for ETFs).
- Shows On-chain Token Value separately when indexed market data is available.
- Official registry matches are marked verified for identity; this does not bypass Salt's risk checks.


V1.8.6 Robinhood Stock Token market identity update:
- Official Robinhood Stock Tokens now show three prominent header stats: Price, Market Cap (on-chain token value), and Company Market Cap (or Underlying AUM when applicable).
- Normal crypto tokens retain the standard Price + Market Cap layout.

## V1.9.7 — Salt Social Beta
- Adds wallet-connected Salt profiles with Solana message-signature verification.
- Adds 0–10 Community Score per token, written reviews/theses, and optional supporting links (including X posts).
- One current review per verified profile/token; posting again updates that profile's review.
- Community Score is visually and logically separate from the machine-generated Salt Risk Score and can never override safety checks.
- Reviews persist across users/devices through Upstash Redis REST.
- Adds a Social navigation shortcut and community section directly on every scanned token page.
- First release uses Solana wallets for social identity verification even when reviewing tokens on other supported chains.

### Required Vercel variables for Salt Social
Create a free Upstash Redis database and add:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If these are not configured, scanning/swapping still works; Salt Social will show a storage configuration message.


## V1.9.7 session persistence
- Remembers the last connected Solana wallet locally.
- Silently reconnects trusted Phantom/Solflare sessions on return without forcing a wallet popup.
- Reloads the Salt profile from Redis by wallet address, so an existing user is not asked to recreate a profile.
- Falls back to the wallet-scoped local profile cache if the social API is temporarily unavailable.
- Handles wallet account changes and disconnects.

## V1.10.33 — Salt Social account-first onboarding
- Social opens to a clean Connect Solana Wallet landing screen for users without a Salt profile.
- After wallet connection, existing profiles load automatically; new wallets are prompted to claim a username and choose a profile picture.
- Usernames are globally unique (case-insensitive) and reserved server-side in Redis to prevent duplicates.
- Username availability is checked while typing and re-validated atomically when the profile is created.

V1.10.33 fixes: real full-width white Social canvas; hides floating background art on Social; removes global main width cap while Social is active; adds missing Vercel routes for social NFTs, holdings, and profile feed.


## V1.10.33
- Featured NFTs now display collection name and current SOL listing price when available.
- Current price is fetched server-side from Magic Eden when the NFT is selected; unlisted NFTs show `Not listed`.
- Existing V1.10.33 layout and profile behavior are preserved.


## V1.10.33
- Fixed Change banner UX: the button now opens the native image picker directly, immediately previews the selected image, crops it to the banner ratio, and saves it to the verified Salt profile.
- No banner modal or secondary image-selection screen.
- Existing profile, NFT, SOL send/receive, holdings, thesis, and social layout behavior preserved.


## V1.10.33 banner hotfix
- Change Banner opens only the native image picker.
- Banner selection no longer requests a wallet signature or opens Phantom/Solflare.
- Selected banner is immediately cached for the verified wallet in this browser and restored on reload.
- Closing a wallet extension window can no longer roll back the banner because banner editing does not invoke the wallet.


## V1.10.33 — Social navigation
- Adds Profile / Feed / Following directly below the main navigation when Social is open for a verified profile.
- Profile preserves the existing NFT, wallet, banner, SOL actions, calls, stats, and thesis layout.
- Feed and Following have dedicated clean timeline views.
- Salt remembers the last Social tab selected on that browser.


## V1.10.33
- Fixed banner persistence after reconnect/login.
- Banner appearance now uses IndexedDB with localStorage fallback and is merged into the loaded Salt profile instead of being overwritten.
- Banner changes still do not trigger a wallet signature popup.

## V1.10.33 — Profile cleanup
- Removed the legacy Community / Latest reviews / No token selected panel from the Social Profile tab.
- Added both JS visibility enforcement and a CSS fallback so reconnects/rerenders cannot make the old panel appear under the profile.
- Preserves the V1.10.33 profile reconnect behavior and all prior Social profile features.

## V1.10.33 — Auto-Scrolling Checker Ticker
- Market ticker now scrolls automatically in a seamless loop.
- Hover/focus pauses movement for easy interaction.
- Ticker cards expand to fit symbol, full current price, and 24h change without clipping.
- Clicking any ticker resolves its supported contract and opens it directly in Salt Checker.
- Custom + Add Ticker coins use the same click-to-check behavior.

## V1.10.33
- Add Ticker now accepts coin name, ticker symbol, or a pasted contract address (CA).
- Contract-address entries resolve the exact token and retain the CA for Salt Checker routing.
- A failed custom-token lookup can no longer wipe the entire market ticker.
- Existing market rows remain visible if the live market refresh temporarily fails.
- Adding/removing custom tickers updates the ticker locally without depending on a successful full-market reload.

## V1.10.33 — Ticker Logo Handoff
- Clicking a Social market ticker now carries the ticker's resolved token metadata and logo into Salt Checker.
- The checker receive-token selector immediately uses the same token image when available instead of reverting to initials.
- Existing checker-side logo enrichment remains as a fallback if the ticker logo is missing or fails to load.
- Preserves V1.10.33 feed routing, CA-only custom tickers, auto-scroll, and all prior Social/profile behavior.
