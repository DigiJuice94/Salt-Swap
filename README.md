# Salt Swap V1

**See the risk before you swap.**

A no-build, Solana-first prototype of Salt Swap. It is designed to feel like a simple DEX while translating token risk into normal language.

## What works in V1
- Responsive Salt Swap interface
- Paste/scan a real Solana mint address
- Real RPC checks: mint existence, mint authority, freeze authority, supply, raw top-10 token-account concentration
- Beginner labels: LOOKS HEALTHY / BE CAREFUL / HIGH RISK
- Plain-English explanation for each metric
- Salt Verified badge structure (verification logic is not auto-awarded yet)
- Wallet connect attempt for injected Solana browser wallets
- Swap UI and Jupiter Swap V2 `/order` proxy shell
- Demo token showing the intended full experience
- Missing bundle/owner/sniper/liquidity/creator-history data is explicitly shown as unavailable rather than fabricated

## Run
Requires Node 18+ (Node 22 recommended). No `npm install` is needed.

```bash
npm start
```
Open: http://localhost:8787

Optional environment variables:
```bash
PORT=8787
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=your_key_here
```

For a real deployment, use a dedicated Solana RPC endpoint.

## Important scoring limitation
Top-10 concentration in this V1 is a **raw largest-token-account percentage**. It does not yet classify/exclude LP, burn, treasury or exchange accounts. It should not be treated as a production fraud verdict yet.

Production Salt Score should separately track **Risk Score** and **Data Completeness**, so missing evidence can never create false confidence.

## Next data adapters
- Wallet-cluster / bundle detection
- Creator and linked-wallet ownership
- Launch sniper analysis
- Liquidity / sell-route / price impact
- Exact holder count
- Duplicate-name/image/metadata detection
- Official social/website contract matching
- Creator/deployer launch history

## Verification rule
**Salt Verified** should only mean Salt has strong evidence that this is the authentic/original project contract. It must never mean the coin is a safe investment. A verified token can still be HIGH RISK.
