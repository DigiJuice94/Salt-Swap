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

## V1.10.85 — One-click Quick Swap flow
- Removes the unnecessary two-button-step behavior after a live Quick Swap estimate.
- Once the amount and receiving wallet are known, the main button reads `Swap SOL → ETH` (or the selected pair).
- Clicking that button refreshes the executable route and immediately opens the source wallet for transaction approval in the same flow.
- If a user connected a multichain wallet such as Trust Wallet, The Trenches now checks its paired EVM/Solana provider non-interactively and automatically fills the destination address when that site permission already exists.
- If the destination side has not been authorized yet, the same primary button asks that wallet for the destination address first and then continues into the swap.
- `Use my wallet` now actively connects/uses the correct destination-network side rather than only copying an address if one was already cached.
- The source-wallet secondary button is reduced to a switch/connect control instead of being part of the normal happy path.

## V1.10.86 — Connected-wallet Quick Swap
- Removes the manual `RECEIVE AT` destination-address box from Quick Swap.
- Quick Swap is now wallet-first: a connected source wallet plus an amount produces one large `Swap` button.
- The destination-network address is resolved internally from the same connected multichain wallet. If that network side has not yet been authorized by the browser wallet, the wallet's normal account-permission prompt can appear during the Swap click.
- Adds a compact connected-wallet card under the Swap button showing the Trenches username when the connected Solana wallet owns a Social profile, the detected wallet brand, shortened wallet address, and source network.
- Moves wallet switching into a small `Change` button on the connected-wallet card.
- Keeps the live receive estimate, route, minimum received, MAX button, and settlement tracking from prior Quick Swap versions.

## V1.10.87 — Feed token metadata fix
- Fixes thesis cards that showed only `Token` / `Price snapshot unavailable` when viewed from another wallet.
- Feed metadata is now resolved server-side and is independent of which Social wallet is viewing the feed.
- Token lookup now tries chain-specific DexScreener, chain-agnostic DexScreener, Jupiter metadata, and Helius metadata where applicable.
- Placeholder names such as `Token` / `TOKEN` are treated as missing metadata and are replaced when a real name/ticker is found.
- Older posts that never stored a historical posting price now show a clearly-labelled **Current price** when live market data is available. They are never falsely given a made-up historical price.
- New theses continue storing the real price snapshot at posting time.
- If every metadata source is temporarily unavailable, the card shows the shortened contract instead of a meaningless generic `Token` label.

## V1.10.88 — Wallet chooser auto-close
- The Connect a Wallet chooser now closes immediately after the selected provider actually returns a connected wallet address.
- It no longer stays on screen while profile loading, Social session checks, or Portfolio refreshes continue in the background.
- Applies to Trust Wallet, Solflare, Phantom, MetaMask, Coinbase Wallet, Binance Wallet, and detected browser wallets.
- Social onboarding also closes the wallet chooser first, then continues profile lookup/onboarding.
- Header/account-change refreshes include a safety close so asynchronous provider events cannot leave the chooser stuck open.

## V1.10.89 — Faster wallet connection
- Removes the blocking logout/disconnect work that happened before opening the selected wallet.
- The wallet extension request now fires immediately after the user clicks Trust Wallet, Solflare, Phantom, MetaMask, Coinbase, or Binance.
- Old Trenches Social auth cleanup runs in parallel and is awaited only after the new wallet has already returned an address, so profile isolation remains intact without making the wallet popup feel slow.
- The previous provider is only disconnected in the background when switching to a different provider. The selected provider is never disconnected right before reconnecting.
- Clicking the wallet that is already active now closes the chooser immediately instead of reconnecting it unnecessarily.

## V1.10.90 — Sheep site / wallet icon
- Removes the old embedded salt-shaker favicon.
- Browser tab favicon is now the Trenches helmeted sheep head.
- Adds a real `/favicon.ico` and `/favicon.png` so wallet extensions that read the origin favicon also receive the sheep head.
- Adds Apple touch icon, 192px/512px app icons, and a site webmanifest.
- Adds The Trenches application/site metadata so wallet connection surfaces have consistent branding.
- Uses the existing `trenches-sheep-social.png` artwork; no new mascot artwork was generated.

## V1.10.91 — Live portfolio micro-movement tracker
- Fixes the chart flattening tiny wallet-value changes.
- Removes the old minimum 1-cent / 0.8% visual chart range and dynamically scales to the wallet's actual min/max movement.
- Real value changes are no longer overwritten inside a five-minute snapshot window; each detected movement gets its own chart point.
- While the Portfolio page is open, The Trenches refreshes the live Solana portfolio every 30 seconds and records real value movements automatically.
- Adds a subtle pulsing live marker to the newest chart point.
- The right-edge chart value uses extra decimal precision when small movements would otherwise round away.
- No artificial/random movement is generated: a truly unchanged wallet remains flat.

## V1.10.92 — CoinStats-style Portfolio behavior
This update rebuilds the Portfolio information architecture around the current CoinStats model while retaining The Trenches branding and data-integrity rule.

### Dashboard
- Dashboard / Analytics / Assets / DeFi / Transactions navigation.
- Total Worth plus selected-range change.
- Portfolio Value chart with CoinStats-style 24H / 1W / 1M / 3M / 1Y / All ranges.
- Hover crosshair + exact value/time tooltip.
- Force Sync and Time Machine controls.
- Assets preview with Name, Amount, 24h Change, Price, Total, Avg Buy and P/L columns.
- Charts preview for allocation and 24h movers.
- NFT and transaction previews.

### Analytics
- Coin allocation bar + donut.
- Portfolio value, tracked P/L, pricing coverage, and a transparent concentration/diversification health metric.
- Top and bottom 24h assets.
- Cumulative tracked P/L chart.

### Persistent history / Time Machine
- Portfolio total-value snapshots persist in Upstash Redis every five minutes when Social storage is configured.
- History is downsampled by timeframe to keep charts responsive.
- A daily asset snapshot is saved for Time Machine.
- Historical data starts accumulating after this version is deployed; no fake backfill is generated.

### Data integrity
- DexScreener market data enriches holdings with 24h change, market cap, liquidity, and fallback pricing.
- Avg Buy / realized / unrealized P&L are intentionally left blank until verifiable cost basis can be reconstructed. The Trenches does not fabricate purchase prices.
- DeFi positions are not inferred from normal token balances.

## V1.10.93 — Trending Terminal
- Turns the former placeholder Trending navigation item into a full live market page.
- Uses a dark-green Trenches market-terminal design while keeping the main site header unchanged.
- Supports Solana, Ethereum, Base, BNB Chain, and Robinhood Chain filters.
- Combines Jupiter's organic Solana trending feed with DEX Screener cross-chain attention/boost signals.
- Enriches tokens with live price, 1h / 24h movement, 24h volume, liquidity, market cap, transaction counts, pair age and a transparent Trenches heat score.
- Adds Hot / Gainers / Volume / New sorting.
- Adds a local Watchlist with star controls.
- Clicking a token routes directly into Salt Check using the contract and detected chain.
- Auto-refreshes every 60 seconds while Trending is open.
- Trending is explicitly treated as attention/momentum, not a safety endorsement.

## V1.10.94 — Trending spotlight layout fix
- Fixes the giant Trending spotlight cards shown in the screenshot.
- Root cause: the #1 Trending card used the generic CSS class `hero`, which inherited the landing page's 650px minimum height and vertical centering.
- Renames the Trending card state to `lead` so it no longer collides with the homepage hero.
- Locks spotlight cards to a compact ~188–245px dashboard-card layout.
- Keeps all existing live Trending data, filters, watchlist, heat score, and Salt Check routing unchanged.

## V1.10.95 — Trending readability pass
- Increases typography throughout the Trending page.
- Makes filter buttons, chain buttons, search text, summary cards, spotlight cards, prices, token names, statistics and the live table significantly easier to read.
- Enlarges token artwork and Heat / Watchlist controls.
- Slightly increases spotlight-card height so the larger type never gets cramped.
- Keeps the same Trending layout, data, filters and functionality from V1.10.94.

## V1.10.96 — Multi-chain Runner Discovery
- Fixes sparse Ethereum, Base and BNB Trending results.
- Root cause: prior versions discovered most non-Solana tokens only from DEX Screener's **boost** feeds. Boosts are paid attention signals, not a complete network-wide runners list.
- Adds GeckoTerminal's network-specific organic Trending Pools feed for Solana, Ethereum, Base and BNB Chain.
- Keeps Jupiter as an additional Solana organic signal.
- Keeps DEX Screener boosts as an extra attention signal instead of using boosts as the entire EVM discovery engine.
- Merges and deduplicates organic + boosted tokens, preserving live price, 1h / 24h movement, volume, liquidity, market cap / FDV fallback, transaction counts, age and artwork.
- Raises the backend candidate ceiling from 80 to 160 so each supported chain can carry a meaningful runner set.
- Lowers the discovery liquidity cutoff for genuinely active newer runners while still requiring either liquidity or meaningful 24h volume.
- Robinhood Chain remains sourced from available DEX Screener data because GeckoTerminal does not provide a mapped Robinhood network in this integration.

## V1.10.97 — Trenches Scanner Rebrand
- Removes the old Salt-branded language from the Swap / risk-analysis interface.
- `SALT RISK SCORE` → `TRENCHES RISK SCORE`.
- `Salt's take` → `TRENCHES INTEL`.
- `Salt check` → `Trenches scan`.
- `Salt Verified` → `Trenches Verified`.
- Main scan action uses `Scan Token`.
- Scanner-generated `Source: Salt` labels now display as `Source: Trenches Engine`, with the launch-bundle source shown as `Trenches Bundle Analysis`.
- Rewrites score hints, analysis summaries, swap-route notes, DEX-paid checks, holder intelligence and identity-analysis copy to speak as The Trenches.
- Keeps legacy `Salt Swap ...` wallet-signature payloads, Redis keys and internal compatibility identifiers unchanged so existing Social profiles/sessions are not broken.

## V1.10.98 — Live Token Chart After Scan
- Every successful Trenches scan now automatically opens a full-width live token chart directly below the risk score / swap area and above the thesis section.
- Adds native Trenches candlesticks and volume bars with 5M / 1H / 6H / 24H / 7D timeframes.
- Shows current price, selected-range change, high, low, volume, liquidity, DEX and shortened pool address.
- Refreshes the active chart every 30 seconds while the scanned result is visible.
- Uses DEX Screener to resolve the token's highest-liquidity pool and GeckoTerminal OHLCV for candle history on Solana, Ethereum, Base and BNB Chain.
- Robinhood Chain keeps live DEX market information and an external market link when OHLCV is unavailable.
- New / extremely fresh pools gracefully show a market-history-building state rather than inventing candle data.
- Also removes the remaining visible scanner phrases that still said `Salt could verify`.

## V1.10.99 — Reliable Line Chart History
- Changes the post-scan chart from candlesticks to a simple historical price line, because this scanner chart is meant to show the coin's history at a glance rather than function as a full trading terminal.
- Chart ranges are now 1D / 1W / 1M / 3M / 1Y.
- Fixes the `Not enough candle history yet` problem from V1.10.98.
- Root cause: V1.10.98 selected a pool from DEX Screener and then sent that pool address directly to GeckoTerminal. A valid DEX Screener pool is not guaranteed to be the same pool GeckoTerminal indexes, so mature tokens could incorrectly appear to have no history.
- Birdeye token-level OHLCV is now the primary history source when `BIRDEYE_API_KEY` is configured.
- GeckoTerminal remains the fallback, but it now first resolves GeckoTerminal's own top pool for the token before requesting OHLCV.
- The line graph includes a light history fill, volume bars, live endpoint pulse, and hover price/time tooltip.
- High / Low / Volume / Liquidity / DEX Pool stats remain below the chart.

## V1.11.00 — Fomo-style Market Cap Chart
- Changes the post-scan history chart to behave more like the supplied Fomo reference.
- The main line now plots **estimated historical market cap** when the current market cap and current price are both available.
- Historical market cap is derived using `current market cap / current price` as the token-supply conversion factor applied to historical closes.
- Falls back to normal historical price if market cap cannot be verified.
- Adds a clear **Market Cap** value at the top of the chart.
- Adds **24H Volume** in the chart header.
- Keeps the volume histogram under the line, with green/red volume bars.
- Adds a bright blue right-side current-value tag, similar to Fomo's blue `$7.6K` marker, so users can immediately see exactly where the chart is trading.
- Adds a dotted current-value guide across the chart.
- Changes the history line to a purple → blue gradient while keeping the dark Trenches terminal background.
- Hovering the line shows market cap (or price fallback), chart mode, and exact timestamp.

## V1.11.01 — Off-white Swap Chart
- Changes only the post-scan chart on the Swap page to the site's warm off-white / cream theme.
- Keeps the Fomo-style blue/purple market-cap line, green/red volume bars, blue current-value marker and live pulse.
- Chart shell, canvas, controls, stat boxes, tooltip, grid and labels now use off-white / beige / dark-green Trenches colors.
- Trending and Portfolio dark layouts are untouched.

## V1.11.02 — Army-green Swap Chart Line
- Replaces the blue / purple post-scan line with the Trenches army-green palette.
- Updates the chart fill, current-value guide, endpoint pulse, right-side current-value tag, hover dot and chart metric accent to matching army green.
- Keeps the off-white Swap chart background and green/red volume bars unchanged.

## V1.11.03 — Force Army-green Chart
- Fixes the Swap chart still appearing purple/blue after V1.11.02.
- Adds the army-green stroke directly to the generated SVG path instead of relying only on CSS.
- Adds explicit army-green SVG colors for the current-value guide, endpoint pulse and right-side value tag.
- Adds a version query to `styles.css` so browsers/Vercel clients do not keep using the older cached chart stylesheet.
- Adds a final high-specificity CSS override as a second safeguard.

## V1.11.04 — Hard-lock Army Green Chart
- Fixes the line still rendering blue/purple in deployment.
- Removes the `fomo` class from the actual history line and endpoint.
- Writes the army-green stroke directly into the SVG `style` attribute with `!important`, so older Fomo CSS cannot override it.
- Cache-busts `styles.css` again and adds `Cache-Control: no-store` for the homepage and stylesheet in Vercel.
- Keeps the off-white chart, green/red volume bars, and army-green current-value marker.

## V1.11.05 — Army-green History Line Only
- Clarifies the intended chart styling.
- The **main wavy historical market-cap line** is now hard-locked to Trenches army green.
- The soft fill underneath the history line is also army green.
- The **blue current-value box on the right stays blue**, matching the Fomo reference the user liked.
- The horizontal dotted current-value guide and endpoint pulse also stay blue so they visually belong to the current-value marker.
- No purple / blue gradient remains on the actual historical line.

## V1.11.06 — All-Green Swap Chart
- Removes the remaining blue accents from the Swap-page chart.
- Main history line: army green.
- Current-value dotted guide: army green.
- Current-value box on the right: army green.
- Endpoint pulse: army green.
- Hover dot / hover guide: army green.
- Market-cap accent text: army green.
- Chart tooltip accent: army green.
- No blue Fomo-era chart accents remain.

## V1.11.07 — Deployment-proof Green Chart
- Fixes the recurring issue where the deployed Swap chart could still render the old blue/purple Fomo line.
- Army green is now applied in THREE independent layers:
  1. directly in the generated SVG,
  2. directly to the real rendered DOM through JavaScript using `style.setProperty(..., 'important')`,
  3. final high-specificity CSS.
- A MutationObserver automatically reapplies the Trenches colors whenever the chart SVG is redrawn.
- The main history line, horizontal current-value guide, endpoint pulse, hover accents and right-side current-value tag are all army green.
- Adds HTML meta no-cache controls, a new stylesheet version, and Vercel `no-store` headers for `/`, `/index.html` and `/styles.css`.
- The chart DOM carries `data-build="1.11.07"` for deployment verification without adding visible UI clutter.

## V1.11.18 — Restore Last Good Build
- Restored directly from V1.11.07, before the later cleanup/deployment experiments.
- Preserves the complete visual and asset structure from that last-good build.
- Adds only the missing Social Feed helpers.
- Adds only the chart cursor-to-dot alignment fix.
- Leaves the original V1.11.07 `vercel.json` untouched.

## V1.11.19 — Clickable Feed Profiles
- Makes the username on Social Feed posts clickable.
- Clicking a username such as `@TrenchReady` opens that wallet/user's Social Profile.
- Keeps the V1.11.18 restored visual build, Feed fix, chart cursor fix, and original deployment configuration unchanged.

## V1.11.20 — Profile Discovery
- Feed usernames and avatars are now real clickable profile targets.
- Clicking a trader opens a public Trenches profile viewer with avatar, banner, bio, wallet, joined date, post count, and recent posts.
- Reply/quote thread usernames and community review usernames are also clickable.
- Public profile data is loaded by wallet from the existing Social Profile API.
- Recent posts load from the existing Social Profile Feed API.
- Keeps the V1.11.18/19 known-good Vercel configuration unchanged.
