const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!r.ok) throw new Error(`RPC ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

const metric = (value, status, detail) => ({ value, status, detail });

function scoring(x) {
  let score = 50;
  if (x.mintAuthority === null) score += 13; else score -= 14;
  if (x.freezeAuthority === null) score += 12; else score -= 12;
  if (x.top10Pct != null) {
    if (x.top10Pct < 20) score += 13;
    else if (x.top10Pct < 35) score += 5;
    else if (x.top10Pct > 60) score -= 20;
    else score -= 8;
  }
  if (x.supply > 0) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    label: score >= 80 ? 'LOOKS HEALTHY' : score >= 55 ? 'BE CAREFUL' : 'HIGH RISK',
    tone: score >= 80 ? 'good' : score >= 55 ? 'warn' : 'bad'
  };
}

export default async function handler(req, res) {
  const mint = String(req.query.mint || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return res.status(400).json({ error: 'That does not look like a valid Solana mint address.' });
  }

  try {
    const [info, supply, largest] = await Promise.all([
      rpc('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
      rpc('getTokenSupply', [mint, { commitment: 'confirmed' }]),
      rpc('getTokenLargestAccounts', [mint, { commitment: 'confirmed' }])
    ]);

    const parsed = info?.value?.data?.parsed?.info;
    if (!parsed) return res.status(404).json({ error: 'Mint account was not found or is not a standard SPL token mint.' });

    const rawSupply = Number(supply?.value?.uiAmountString || supply?.value?.uiAmount || 0);
    const vals = (largest?.value || []).map(x => Number(x.uiAmountString || x.uiAmount || 0));
    const top10Amt = vals.slice(0, 10).reduce((a, b) => a + b, 0);
    const top10Pct = rawSupply > 0 ? top10Amt / rawSupply * 100 : null;
    const s = scoring({ mintAuthority: parsed.mintAuthority ?? null, freezeAuthority: parsed.freezeAuthority ?? null, top10Pct, supply: rawSupply });
    const topStatus = top10Pct == null ? 'unknown' : top10Pct < 20 ? 'good' : top10Pct < 35 ? 'warn' : 'bad';

    return res.status(200).json({
      mint,
      name: 'On-chain token',
      symbol: 'TOKEN',
      verified: false,
      ...s,
      summary: `Salt found ${s.label === 'LOOKS HEALTHY' ? 'no major issues in the checks available in V1' : s.label === 'BE CAREFUL' ? 'some risk factors worth reviewing before you trade' : 'serious warning signs in the checks available in V1'}. Missing data is shown as unknown instead of guessed.`,
      authenticity: metric('Unverified', 'unknown', 'The mint exists on Solana, but official-project identity verification still needs project/social evidence.'),
      sellable: metric('Coming next', 'unknown', 'Live sell-route checks will be connected through the swap provider.'),
      mintAuthority: metric(parsed.mintAuthority ? 'Active' : 'Disabled', parsed.mintAuthority ? 'bad' : 'good', parsed.mintAuthority ? 'A mint authority can still create additional supply.' : 'No mint authority is currently set.'),
      freezeAuthority: metric(parsed.freezeAuthority ? 'Active' : 'Disabled', parsed.freezeAuthority ? 'bad' : 'good', parsed.freezeAuthority ? 'A freeze authority is still present.' : 'No freeze authority is currently set.'),
      top10: metric(top10Pct == null ? 'Unknown' : `${top10Pct.toFixed(1)}%`, topStatus, top10Pct == null ? 'Could not calculate concentration.' : `The 10 largest token accounts hold about ${top10Pct.toFixed(1)}% of current supply. V1 has not yet classified LP/exchange/burn accounts, so this is a raw signal.`),
      owner: metric('Coming next', 'unknown', 'Creator-linked holdings require wallet graph analysis; Salt refuses to invent this value.'),
      bundled: metric('Coming next', 'unknown', 'Bundle detection requires transaction and wallet-cluster data.'),
      snipers: metric('Coming next', 'unknown', 'Launch-time transaction history is needed for accurate sniper detection.'),
      liquidity: metric('Coming next', 'unknown', 'Liquidity and price impact will come from the routing integration.'),
      holders: metric('Coming next', 'unknown', 'Exact holder count requires indexed token-account data.'),
      duplicates: metric('Coming next', 'unknown', 'Duplicate detection will compare metadata, socials, launch source and competing mint addresses.'),
      creatorHistory: metric('Coming next', 'unknown', 'Deployer history requires indexed transaction history and wallet attribution.')
    });
  } catch (e) {
    return res.status(500).json({ error: `Scan failed: ${e.message}` });
  }
}
