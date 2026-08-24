# Salt Swap V1.10.44 — Crypto News Feed

Adds a live crypto-only news front page to Social → Feed, directly below the market ticker. One lead story is centered with four smaller supporting stories, sourced server-side from crypto RSS feeds. Headlines link to the original publisher. News is cached and deduplicated so failures do not break the social feed.

# Salt Swap V1.10.44

- Removed duplicate Followers and Following rows from Profile Stats.
- Banner images now persist to the Salt profile backend (Redis/KV), rather than only browser storage.
- Banner restores automatically when the same wallet profile is loaded again.
- Banner selection remains a simple image picker with no wallet-signature popup.
- Preserves V1.10.44 Social profile layout and functionality.

# Salt Swap V1.10.44 — Social Reconnect Profile Fix

Fixes existing-profile wallet reconnect so Social always restores the full Profile layout instead of falling back to the legacy token-review screen. Also fixes the Social tab renderer scope bug and defaults reconnects to Profile. Preserves V1.10.44 banner persistence and all prior features.

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

## V1.10.44 — Salt Social account-first onboarding
- Social opens to a clean Connect Solana Wallet landing screen for users without a Salt profile.
- After wallet connection, existing profiles load automatically; new wallets are prompted to claim a username and choose a profile picture.
- Usernames are globally unique (case-insensitive) and reserved server-side in Redis to prevent duplicates.
- Username availability is checked while typing and re-validated atomically when the profile is created.

V1.10.44 fixes: real full-width white Social canvas; hides floating background art on Social; removes global main width cap while Social is active; adds missing Vercel routes for social NFTs, holdings, and profile feed.


## V1.10.44
- Featured NFTs now display collection name and current SOL listing price when available.
- Current price is fetched server-side from Magic Eden when the NFT is selected; unlisted NFTs show `Not listed`.
- Existing V1.10.44 layout and profile behavior are preserved.


## V1.10.44
- Fixed Change banner UX: the button now opens the native image picker directly, immediately previews the selected image, crops it to the banner ratio, and saves it to the verified Salt profile.
- No banner modal or secondary image-selection screen.
- Existing profile, NFT, SOL send/receive, holdings, thesis, and social layout behavior preserved.


## V1.10.44 banner hotfix
- Change Banner opens only the native image picker.
- Banner selection no longer requests a wallet signature or opens Phantom/Solflare.
- Selected banner is immediately cached for the verified wallet in this browser and restored on reload.
- Closing a wallet extension window can no longer roll back the banner because banner editing does not invoke the wallet.


## V1.10.44 — Social navigation
- Adds Profile / Feed / Following directly below the main navigation when Social is open for a verified profile.
- Profile preserves the existing NFT, wallet, banner, SOL actions, calls, stats, and thesis layout.
- Feed and Following have dedicated clean timeline views.
- Salt remembers the last Social tab selected on that browser.


## V1.10.44
- Fixed banner persistence after reconnect/login.
- Banner appearance now uses IndexedDB with localStorage fallback and is merged into the loaded Salt profile instead of being overwritten.
- Banner changes still do not trigger a wallet signature popup.

## V1.10.44 — Profile cleanup
- Removed the legacy Community / Latest reviews / No token selected panel from the Social Profile tab.
- Added both JS visibility enforcement and a CSS fallback so reconnects/rerenders cannot make the old panel appear under the profile.
- Preserves the V1.10.44 profile reconnect behavior and all prior Social profile features.

## V1.10.44 — Auto-Scrolling Checker Ticker
- Market ticker now scrolls automatically in a seamless loop.
- Hover/focus pauses movement for easy interaction.
- Ticker cards expand to fit symbol, full current price, and 24h change without clipping.
- Clicking any ticker resolves its supported contract and opens it directly in Salt Checker.
- Custom + Add Ticker coins use the same click-to-check behavior.

## V1.10.44
- Add Ticker now accepts coin name, ticker symbol, or a pasted contract address (CA).
- Contract-address entries resolve the exact token and retain the CA for Salt Checker routing.
- A failed custom-token lookup can no longer wipe the entire market ticker.
- Existing market rows remain visible if the live market refresh temporarily fails.
- Adding/removing custom tickers updates the ticker locally without depending on a successful full-market reload.

## V1.10.44 — Ticker Logo Handoff
- Clicking a Social market ticker now carries the ticker's resolved token metadata and logo into Salt Checker.
- The checker receive-token selector immediately uses the same token image when available instead of reverting to initials.
- Existing checker-side logo enrichment remains as a fallback if the ticker logo is missing or fails to load.
- Preserves V1.10.44 feed routing, CA-only custom tickers, auto-scroll, and all prior Social/profile behavior.


## V1.10.44 — Parachute meme coin background
- Replaces the static floating-coin feel with parachuting meme coins that drift down separately from the trench background.
- Parachutes live in the background layer, so the battlefield art stays independent and the UI remains on top.
- Keeps the trench hero theme, original coins, and all existing swap/social functionality intact.


## V1.10.44 — Social sheep branding
- Replaces the legacy salt icon on Social onboarding with The Trenches sheep.
- Replaces the default profile-picture salt placeholder with the sheep as well.


## V1.10.44 — exact uploaded sheep icon
- Replaces the Social onboarding sheep with the newly uploaded sheep artwork.
- Uses the same artwork for the default profile-picture placeholder.


## V1.10.44 — Off-white Social bar + feed box
- Changes the Social Profile/Feed/Following bar to the Trenches off-white palette.
- Changes the empty thesis/feed box from white to matching off-white.


## V1.10.49 — Trenches Verified Badge
- Adds the official green/gold Trenches verified badge asset.
- Verification is assigned server-side by Solana wallet address, not username.
- Founder wallet `ETNz...RALN` is verified automatically.
- The badge appears directly beside the verified profile display name.
- Renaming the profile cannot transfer verification to another wallet.


## V1.10.50 — Verified badge asset route fix
- Moves the official Trenches verified badge into `/assets/verified-badge.png` so Vercel serves it through the existing static assets route.
- Updates the profile badge image source to `/assets/verified-badge.png`.
- Preserves wallet-based verification and all V1.10.49 behavior.


## V1.10.51 — Verified badge inline display fix
- Embeds the official Trenches verified badge directly into the profile UI so it cannot break because of static asset routing or deployment paths.
- Keeps verification tied to the creator Solana wallet server-side.
- No other profile or Social behavior changed.


## V1.10.52 — Profile Watch List
- Replaces the Profile stats card with a personal Watch List.
- Users can add up to 8 watched tokens by verified contract address (Solana or supported EVM chains).
- Shows token symbol, live price, and 24h change.
- Watch List persists with the existing profile ticker storage and syncs with the market ticker.
- Tokens can be removed directly from the profile Watch List.


## V1.10.53 — Watch List Robinhood Chain fix
- Watch List CA lookup now checks Robinhood Chain in addition to Ethereum, BNB Chain, Base, and Solana.
- Fixes valid Robinhood Chain contracts incorrectly showing ‘Could not verify live market data for that CA.’
- Existing Watch List behavior and all V1.10.52 features are preserved.


## V1.10.54 — Community Score confidence gate
- Adds a Community Score card directly to the token scan result.
- Community Score is shown only after at least 20 verified Trenches ratings.
- Below 20 ratings, the card says NOT ENOUGH RATINGS and shows progress (for example 7/20).
- Community Score remains separate from the Salt Risk Score and never changes the safety score.

## V1.10.55 — Scan-page thesis composer
- Adds a thesis composer directly below the main scan score/quick-check area.
- Requires the Solana wallet tied to a Trenches Social profile and signs the thesis with that wallet.
- Supports every scanned chain while keeping social identity anchored to the user's Solana profile wallet.
- Posts use the existing 0–10 community rating + thesis + optional supporting link.
- The same post is stored in the user's profile feed and the global community feed through the existing Social reviews endpoint.
- Existing thesis for the same profile/token is loaded for editing; one current thesis per profile/token remains enforced.


## V1.10.56 — Scan thesis profile bubble
- Gives the scan-page thesis composer its own clearly separated card/bubble treatment.
- The signed-in Trenches identity pill now shows the user profile picture, username, and shortened social wallet.
- Existing wallet-signing, profile posting, community-feed posting, and Community Score behavior are preserved.

## V1.10.57 — Cleaner scan layout + thesis bubble
- Removes the large translucent outer background from the left scan-analysis column.
- Keeps the Salt Risk Score, Community Score, Salt's Take, and quick checks as their own independent cards.
- Gives the scan-page thesis composer its own solid white rounded bubble matching the Salt Risk Score card styling.
- Preserves wallet/profile identity, profile photo, thesis signing, profile posting, feed posting, and Community Score behavior.


## V1.10.58 — Scan thesis social-wallet sync
- The scan-page thesis identity now refreshes immediately after the Trenches Social Solana wallet connects.
- Social profile cache lookups are keyed by the profile's Solana wallet instead of the currently selected trading chain wallet.
- Robinhood/Ethereum/Base/BNB scans can keep the connected Trenches Social identity visible while trading-wallet state changes.
- Profile picture, @username, and wallet pill update without requiring a rescan or page reload.


## V1.10.59 — Scan analysis one-bubble layout
- Restores the left scan analysis area as one unified rounded card/bubble.
- Keeps Salt Risk Score, Community Score, Salt's Take, and quick checks inside that single bubble.
- Leaves the separate thesis composer card unchanged.


## V1.10.60 — Thesis wallet-signature fix
- Fixed the thesis POST verification mismatch: the browser signs `The Trenches review`, while the API had still been requiring the legacy `Salt Swap review` prefix.
- The API now verifies the current Trenches-branded message and temporarily accepts the legacy prefix for backward compatibility.
- Scan thesis, Social review, and Feed thesis posts now use the same verified-wallet signature contract.


## V1.10.61 — One-signature Trenches Social sessions
- Connecting an existing Trenches Social profile now requests one Solana sign-in signature only when a valid session is missing.
- The sign-in creates a secure HttpOnly, SameSite=Lax session cookie lasting 7 days.
- Posting a thesis from the scan page, Social review area, or community Feed no longer opens Phantom/Solflare for a per-post signature.
- The server derives the posting wallet from the verified session and rejects attempts to post as another wallet.
- New profile creation still uses its ownership-proof signature; that same proof now starts the 7-day session automatically, so there is no second login signature.
- When the session expires or the user switches wallets, the next social post/connect asks for one fresh login signature.
- Old clients that still send signed reviews remain temporarily compatible and are upgraded into a session after a valid signature.
- `SOCIAL_SESSION_SECRET` is optional but recommended. If omitted, the configured Upstash REST token is used as the HMAC secret so this update works without adding another environment variable.


## V1.10.62 — Social thesis cards + interactions
- Profile and community feed theses now use a boxed Trenches post card with profile image and @username.
- Every new thesis stores a server-resolved token snapshot: coin name, ticker, chain, token image, and USD price at posting time.
- Added session-authenticated Like, Reply, and Quote interactions without per-action wallet signatures.
- Replies and quote comments expand inline under the thesis.
- Existing older theses remain readable; if they predate price snapshots they show that the posting-price snapshot is unavailable rather than inventing a historical price.

## V1.10.63 — Joined The Trenches
- Adds `Joined The Trenches` to the Social profile header.
- Uses the profile's original server-side `createdAt` date, so the join date is tied to when that Trenches profile was created.
- Existing profile, Social, thesis, session-auth, verified-badge, scan, and swap behavior is preserved.


## V1.10.64 — Cleaner Community Score
- Simplifies the Community Score card into a compact aligned layout.
- Removes the cluttered all-caps insufficient-score treatment.
- Shows a clean `0 / 20` ratings progress pill until the score unlocks.
- Keeps the 20-rating requirement and Community Score logic unchanged.


## V1.10.65 — Feed cleanup
- Removes the old `Your Token Review` composer and `Latest reviews` panel from the Social Feed page.
- The Feed now stays focused on the market ticker, crypto news, Feed thesis composer, filters, and community posts.
- Token-specific thesis posting remains available directly on scanned token pages and still posts to the user's profile and community Feed.
- The legacy review DOM remains hidden for compatibility with existing Community Score data/loading logic.

## V1.10.66 — Feed legacy reviews cleanup
- Removes the remaining legacy “Community / Latest reviews” card from Social.
- Keeps its internal DOM hooks hidden so existing Community Score and profile code continue working without errors.
- Feed, profile thesis cards, scan thesis composer, ratings, and Community Score remain intact.

## V1.10.67 — Legacy Latest Reviews hard removal
- Fixes the previous cleanup selector, which targeted a parent id that does not exist in the current Social DOM.
- The remaining legacy `Latest reviews` card is now hard-hidden directly by its unique `.socialFeedCard` class.
- Modern Feed thesis posts are unaffected because they use `.saltFeedPost`, not `.socialFeedCard`.
- The hidden legacy DOM hooks remain available so Community Score/review data code does not break.


## V1.10.68 — Portfolio
- Portfolio is now a real primary navigation tab instead of a roadmap placeholder.
- Adds an Uniswap-inspired portfolio structure while retaining The Trenches cream/olive visual system.
- Live Solana wallet value and fungible holdings come from Helius DAS; unknown token prices remain unknown instead of being guessed.
- Adds wallet-owned NFT view and recent Solana activity.
- Adds real browser-local portfolio value snapshots so the chart builds from actual observed wallet values over time rather than fabricated historical data.
- Send / Receive reuse the existing Solana transfer flow, Swap returns to the scanner/swap tab, and Refresh updates on-chain data.
- Viewing the portfolio only needs a wallet connection/address; no Social message signature is required.

## V1.10.69 — Portfolio chart cleanup
- Makes the Overview chart much closer to the clean Uniswap portfolio structure while retaining The Trenches colors.
- Adds 1H / 1D / 1W / 1M / 1Y / All range controls.
- Adds real time/date labels along the bottom of the chart.
- An empty wallet now shows `$0.00`, a flat `$0` chart line, and `0.00%` change instead of a blank chart.
- Wallets with assets but unavailable USD pricing still show pricing as unavailable rather than falsely displaying zero.
- The chart continues to use real wallet snapshots stored by The Trenches; no fake historical portfolio data is generated.

## V1.10.70 — Futuristic Portfolio visual pass
- Restyles the Portfolio tab to feel like a premium live crypto tracker while preserving The Trenches palette and existing functionality.
- Adds a subtle technical grid/radial background, frosted dashboard shell, command-style tabs, stronger live-status treatment, and tabular numeric typography.
- Turns the wallet chart into a dark high-contrast tracker monitor with luminous green data line, technical grid, and compact timeframe controls.
- Upgrades Send / Receive / Swap / More into premium command tiles and refines holdings/activity cards with glass-like depth.
- No portfolio data logic, wallet behavior, balances, or time-range calculations were changed in this visual pass.


## V1.10.71 — Multichain wallet transfer popover
- Replaces the broken bottom-left SOL transfer panel with a centered, high-quality wallet popup.
- Send / Receive now open the same polished wallet panel from Profile and Portfolio.
- Receive supports Solana, Ethereum, Base, BNB Chain, and Robinhood Chain.
- Shows the full wallet address and a scannable QR code for the selected network.
- Solana uses the connected Solana wallet; Ethereum/Base/BNB/Robinhood use the connected EVM wallet address.
- Receive is designed for any token on the selected network; the UI warns users to match the sending network exactly.
- Native-asset sending is supported from the popup: SOL on Solana, ETH on Ethereum/Base/Robinhood, and BNB on BNB Chain.
- No seed phrase or private key is ever requested.


## V1.10.72 — Wallet account switcher
- The top-right connected-wallet pill now opens a wallet account popover.
- Adds **Connect a different wallet** for switching Solana accounts or choosing a detected Phantom / Solflare provider.
- Adds **Disconnect**.
- Switching safely ends the old server auth session before connecting the new wallet, then loads the profile tied to the new wallet.
- Portfolio and thesis identity refresh to the newly connected wallet.


## V1.10.73 — Wallet/Profile isolation fix
- A Trenches Social profile can now render only when its stored wallet exactly matches the currently connected Solana wallet.
- Switching to a wallet with no Trenches profile now shows the new-profile onboarding instead of reusing the previous account.
- Server profile lookup is authoritative: a successful `null` response clears any stale browser cache for that wallet.
- Portfolio connects, wallet account changes, Social connects, and the header wallet switcher all clear stale identity state before loading the new wallet.
- Opening Social re-checks the active wallet/profile pairing before showing a profile.


## V1.10.74 — Trust Wallet / Social connection fix
- Social no longer blindly opens the first injected Solana wallet (which could be Solflare).
- Adds explicit Trust Wallet Solana detection through `window.trustwallet.solana` and supports other injected Solana providers.
- If Trust Wallet is the active wallet and exposes a Solana provider, Social prefers Trust Wallet.
- If multiple Solana wallets are installed and no preference exists, Social shows a wallet chooser instead of auto-opening one.
- The selected Solana wallet provider is remembered for later Social, Portfolio, transfer, and signing flows.
- Existing wallet/profile isolation remains intact.


## V1.10.75 — Professional wallet chooser
- Replaces the basic connect dropdown with a centered, high-quality wallet chooser.
- Shows Trust Wallet, Solflare, WalletConnect, MetaMask, Coinbase Wallet, Binance Wallet, plus Other wallets.
- Adds recognizable wallet logos and detected/not-detected state.
- Social opens the same professional chooser in Solana-only mode so the chosen wallet is the one tied to the Social profile.
- Header wallet switching uses the same chooser.
- Installed injected wallets are detected and additional browser wallets appear under Other wallets.
- WalletConnect is surfaced in the UI but requires a configured WalletConnect/Reown project ID before QR sessions can be enabled.

## V1.10.76 — The Trenches themed wallet chooser
- Restyles the professional wallet chooser to match The Trenches instead of using the dark generic wallet theme.
- Uses the site's warm off-white/cream surfaces, olive military accents, navy text, soft gold-beige borders, and muted green detected states.
- Keeps all wallet logos, wallet detection, Social wallet restrictions, provider selection, and connection logic unchanged.

## V1.10.77 — Wallet menu layer fix
- Fixes the connected-wallet dropdown appearing behind Swap, Social, Portfolio, Trending, and other page layers.
- The header is elevated only while the wallet account menu is open, so normal page stacking stays unchanged.
- Full-screen wallet, transfer, token, and profile dialogs remain above the header.


## V1.10.78 — Swap MAX button
- Adds a MAX control to the pay side of every swap.
- Reads the connected wallet's real balance for SOL, SPL tokens, native EVM assets, and ERC-20/BEP-20 tokens.
- Native-asset MAX automatically reserves a small network-fee buffer so the swap is less likely to fail from spending every last gas token.
- SPL/ERC-20 token MAX uses the full token balance because gas is paid separately in SOL/ETH/BNB.
- If the correct wallet/network is not connected, The Trenches opens the wallet chooser instead of guessing which wallet to use.


## V1.10.79 — Swap MAX balance fix
- Fixes the Solana MAX button failing with `403 Access forbidden` from the public Solana RPC.
- MAX now reads SOL and SPL-token balances server-side through the existing Helius connection instead of calling `api.mainnet-beta.solana.com` directly from the browser.
- Native SOL still keeps a small gas reserve; SPL tokens still use the full token balance.
- EVM MAX behavior is unchanged.


## V1.10.80 — Holdings token icon reliability
- Fixes broken-image placeholders in Profile wallet holdings.
- Uses market artwork as a fallback when Helius metadata artwork is stale or unavailable.
- Cycles through available icon sources in the browser before falling back to a clean Trenches token-initial badge.
- Applies the same resilient icon behavior to Portfolio token rows.


## V1.10.81 — Aggressive real token artwork
- Profile Holdings and Portfolio now try real Solana token artwork from on-chain/off-chain Helius metadata, Jupiter token metadata, DEX Screener, Pump.fun, IPFS gateway variants, and Trust Wallet assets before using a letter fallback.
- Broken image URLs automatically advance through the source list.
- No fake token art is generated; initials are used only when every real artwork source fails.

## V1.10.82 — Quick Swap
- Adds a Quick Swap shortcut directly under the scanner.
- Supports native-asset cross-chain routes between Solana (SOL), Ethereum (ETH), Base (ETH), and BNB Chain (BNB).
- Uses live LI.FI route quotes and wallet-signed source-chain transactions; no custodial deposits or fake quotes.
- Auto-fills the destination address from the wallet already known to The Trenches when possible, while still allowing an explicit destination address.
- Tracks cross-chain settlement after the source transaction is sent.
- Robinhood Chain remains visible in the selector, but cross-chain routing is disabled until the bridge provider supports that chain. The existing Robinhood same-chain 0x swap remains unchanged.
- Public LI.FI rate limits work without a key; `LIFI_API_KEY` is optional for higher throughput.

## V1.10.83 — Quick Swap MAX
- Adds a MAX button to the Quick Swap pay amount.
- MAX reads the real connected source-network wallet balance.
- Solana MAX uses the existing server-side Helius balance endpoint instead of the browser-blocked public RPC.
- ETH / Base / BNB MAX reads the connected EVM wallet after switching to the selected source chain when necessary.
- Native-asset MAX keeps a conservative network/route-fee reserve so the cross-chain transaction is less likely to fail from using every last unit of gas.
- If the correct source wallet is not connected, MAX opens the wallet chooser instead of guessing.

## V1.10.84 — Quick Swap live receive estimate
- Quick Swap now automatically calculates the estimated destination amount as soon as a valid source amount is entered.
- Tapping MAX immediately requests a live SOL→ETH / ETH→SOL / Base / BNB route preview, so the YOU RECEIVE box no longer stays blank.
- Manual amount edits refresh the estimate after a short debounce.
- The preview uses LI.FI advanced routes and does not require a destination address just to show the expected output.
- The exact executable quote is still refreshed after a real destination wallet is supplied, immediately before wallet approval.
