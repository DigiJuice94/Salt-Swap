# Salt Swap V1.2.2 — Multi-Chain Meme Coin Check

Salt Swap now supports meme-coin contract scanning on:

- Solana
- Ethereum
- BNB Chain

## V1.2.2 changes

- Homepage branding changed to **Meme Coin Intelligence**.
- Added **Auto-detect**, Solana, Ethereum and BNB Chain selection.
- Solana keeps live mint-authority, freeze-authority and raw top-10 token-account concentration checks.
- Ethereum / BNB Chain now detect deployed contracts and read basic ERC-20 metadata when available.
- Ethereum / BNB Chain check the common `owner()` signal and the standard EIP-1967 implementation slot for an upgradeable-proxy signal.
- Honeypot, buy/sell tax, liquidity, holder concentration, bundle, sniper, duplicate and creator-history metrics are clearly marked **Needs deeper scan** until a trustworthy indexed/simulation data source is connected.
- Results display the detected chain and the swap preview changes the pay asset to SOL, ETH or BNB.

## Optional Vercel environment variables

You can leave these unset for the public-RPC defaults, or provide your own endpoints:

```
SOLANA_RPC_URL=
ETH_RPC_URL=
BNB_RPC_URL=
```

No seed phrase or private key is required for scanning.

Updated in V1.2.2: top-left header logo now uses the transparent salt shaker look with no border, no white background tile, and a cleaner inline brand presentation.

Updated in V1.2.2: removed the small "Token Intelligence" / subtitle text from the top-left brand so the header only shows the transparent salt shaker logo and SaltSwap wordmark.
