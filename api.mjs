const HELIUS_BASE='https://mainnet.helius-rpc.com/';
const BIRDEYE_BASE='https://public-api.birdeye.so';
const ETH_RPC='https://ethereum-rpc.publicnode.com';
const BNB_RPC='https://bsc-dataseed.binance.org';

const metric=(value,status,detail,source='Salt')=>({value,status,detail,source});
const number=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const bool=v=>v===true||v===1||v==='1'||v==='true'?true:v===false||v===0||v==='0'||v==='false'?false:null;
const money=n=>{n=Number(n);if(!Number.isFinite(n))return null;if(n>=1e9)return `$${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(n<10?2:0)}`};
const count=n=>{n=Number(n);if(!Number.isFinite(n))return null;return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US')};
const statusPct=v=>v==null?'unknown':v<20?'good':v<40?'warn':'bad';
function errorText(v){if(v==null)return 'Request failed.';if(typeof v==='string')return v;if(v instanceof Error)return errorText(v.message);if(typeof v==='object'){const p=v.message??v.error?.message??v.error?.detail??v.error??v.details?.message??v.details??v.reason??v.statusText;if(p!=null&&p!==v)return errorText(p);try{const s=JSON.stringify(v);return s&&s!=='{}'?s:'Request failed.'}catch{return 'Request failed.'}}return String(v)}
function finalize(checks,critical=false){const known=checks.filter(x=>x.known),tw=checks.reduce((s,x)=>s+x.weight,0)||1,kw=known.reduce((s,x)=>s+x.weight,0),risk=known.reduce((s,x)=>s+x.weight*Math.max(0,Math.min(100,x.risk))/100,0);let score=kw?Math.round(100-(risk/kw)*100):null;if(critical&&score!=null)score=Math.min(score,20);const confidence=Math.round(kw/tw*100);let tone='unknown',label='PRELIMINARY';if(score!=null&&confidence>=45){tone=score>=80?'good':score>=55?'warn':'bad';label=score>=80?'LOOKS HEALTHY':score>=55?'BE CAREFUL':'HIGH RISK'}return{score,confidence,checksCompleted:known.length,checksTotal:checks.length,label,tone}}
async function fetchJson(url,options={},timeout=12000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{...options,signal:c.signal});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={message:text}}if(!r.ok){const err=new Error(errorText(data?.message??data?.error??data) || `HTTP ${r.status}`);err.status=r.status;throw err}return data}finally{clearTimeout(t)}}
async function rpc(url,method,params){const j=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(j.error)throw new Error(j.error.message||'RPC error');return j.result}
async function rpcBatch(url,calls){const arr=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(calls)});if(!Array.isArray(arr))throw new Error('RPC did not return a batch response.');const by=Object.fromEntries(arr.map(x=>[x.id,x]));for(const x of arr)if(x.error&&x.id!==4)throw new Error(x.error.message||'RPC error');return by}
async function birdeye(path,chain){const key=process.env.BIRDEYE_API_KEY;if(!key)return null;try{const j=await fetchJson(`${BIRDEYE_BASE}${path}`,{headers:{accept:'application/json','X-API-KEY':key,'x-chain':chain}});return j?.data??j}catch(e){console.warn('Birdeye:',e.message);return null}}
function field(o,...keys){for(const k of keys)if(o&&o[k]!=null)return o[k];return null}
function securityBool(sec,...keys){return bool(field(sec,...keys))}
function top10FromRpc(largest,supply){const total=Number(supply?.value?.uiAmountString??supply?.value?.uiAmount??0);if(!total)return null;const vals=(largest?.value||[]).map(x=>Number(x.uiAmountString??x.uiAmount??0)).filter(Number.isFinite);return vals.slice(0,10).reduce((a,b)=>a+b,0)/total*100}

async function scanSolana(mint){
  const key=process.env.HELIUS_API_KEY;
  if(!key){const e=new Error('HELIUS_API_KEY is not configured yet. Add it in Vercel → Project Settings → Environment Variables, then redeploy.');e.status=503;throw e;}
  const url=`${HELIUS_BASE}?api-key=${encodeURIComponent(key)}`;
  const calls=[
    {jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[mint,{encoding:'jsonParsed',commitment:'confirmed'}]},
    {jsonrpc:'2.0',id:2,method:'getTokenSupply',params:[mint,{commitment:'confirmed'}]},
    {jsonrpc:'2.0',id:3,method:'getTokenLargestAccounts',params:[mint,{commitment:'confirmed'}]},
    {jsonrpc:'2.0',id:4,method:'getAsset',params:{id:mint,displayOptions:{showFungible:true}}}
  ];
  const [batch,overview,security]=await Promise.all([
    rpcBatch(url,calls),
    birdeye(`/defi/token_overview?address=${encodeURIComponent(mint)}&frames=5m,1h,24h`,'solana'),
    birdeye(`/defi/token_security?address=${encodeURIComponent(mint)}`,'solana')
  ]);
  const info=batch[1]?.result, supply=batch[2]?.result, largest=batch[3]?.result, asset=batch[4]?.result;
  const parsed=info?.value?.data?.parsed?.info;if(!parsed)throw Object.assign(new Error('No standard Solana token mint was found at that address.'),{status:404});
  const top10=top10FromRpc(largest,supply);
  const mintActive=parsed.mintAuthority!=null;
  const freezeActive=parsed.freezeAuthority!=null;
  const liq=number(field(overview,'liquidity','liquidityUsd','liquidity_usd'));
  const holders=number(field(overview,'holder','holderCount','holder_count','holders'));
  const assetMeta=asset?.content?.metadata||{};
  const assetLinks=asset?.content?.links||{};
  const assetFile=Array.isArray(asset?.content?.files)?asset.content.files.find(f=>f?.uri)||asset.content.files[0]:null;
  const name=field(assetMeta,'name')||field(asset?.token_info,'name')||field(overview,'name')||field(security,'name')||'Unknown token';
  const symbol=field(assetMeta,'symbol')||field(asset?.token_info,'symbol')||field(overview,'symbol')||field(security,'symbol')||'TOKEN';
  const logoUri=field(assetLinks,'image')||field(assetFile,'uri')||field(overview,'logoURI','logo_uri')||null;
  const identitySource=field(assetMeta,'name')||field(asset?.token_info,'symbol')?'Helius metadata':(field(overview,'name')||field(overview,'symbol')?'Birdeye':'On-chain mint');
  const verified=Boolean(field(overview,'logoURI','logo_uri'));
  const securityMint=securityBool(security,'is_mintable','mintable');
  const securityFreeze=securityBool(security,'freezeable','freezable','is_freezable');
  const mintable=securityMint==null?mintActive:securityMint;
  const freezable=securityFreeze==null?freezeActive:securityFreeze;
  const risks=[];if(mintable)risks.push('mint authority/capability is active');if(freezable)risks.push('freeze authority/capability is active');if(top10!=null&&top10>=40)risks.push('supply is concentrated');if(liq!=null&&liq<20000)risks.push('liquidity is thin');
  const checks=[
    {known:true,weight:10,risk:0},{known:true,weight:15,risk:mintable?80:0},{known:true,weight:15,risk:freezable?75:0},
    {known:top10!=null,weight:20,risk:top10>=70?100:top10>=50?80:top10>=35?55:top10>=20?25:5},
    {known:liq!=null,weight:15,risk:liq<5000?100:liq<20000?75:liq<50000?45:liq<150000?20:5},
    {known:holders!=null,weight:10,risk:0},{known:security!=null,weight:15,risk:0}
  ];
  const s=finalize(checks);
  return {mint,chain:'solana',name,symbol,logoUri,identitySource,verified,...s,
    summary:risks.length?`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks and found ${risks.join(', ')}.`:`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks. No major warning was found in the data currently available.`,
    authenticity:metric('Mint confirmed','good','Helius confirmed a valid Solana token mint on-chain.','Helius'),
    sellable:metric(liq!=null?'Market found':'Not simulated',liq!=null?'good':'unknown',liq!=null?'Birdeye returned live market/liquidity data.':'A real swap-route simulation is a later Salt layer.',liq!=null?'Birdeye':'Salt'),
    mintAuthority:metric(mintable?'Active':'Revoked',mintable?'bad':'good',mintable?'More supply may be mintable.':'No active mint capability was detected.',security?'Helius + Birdeye':'Helius'),
    freezeAuthority:metric(freezable?'Active':'Revoked',freezable?'bad':'good',freezable?'Token accounts may be freezeable.':'No active freeze capability was detected.',security?'Helius + Birdeye':'Helius'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,statusPct(top10),top10==null?'Holder concentration was unavailable.':`Top 10 token accounts hold about ${top10.toFixed(1)}% of current supply.`,'Helius'),
    owner:metric('Needs wallet graph','unknown','Creator-linked holdings require wallet attribution.','Salt'),
    bundled:metric('Needs wallet graph','unknown','Bundle analysis requires linked-wallet and funding analysis.','Salt'),
    snipers:metric('Needs launch history','unknown','Sniper analysis requires launch transaction history.','Salt'),
    liquidity:metric(liq==null?'Unknown':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return liquidity for this token.':'Add BIRDEYE_API_KEY for market/liquidity intelligence.'):`Current indexed liquidity is about ${money(liq)}.`,liq==null?'Salt':'Birdeye'),
    holders:metric(holders==null?'Unknown':count(holders),holders==null?'unknown':'good',holders==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return a holder count.':'Add BIRDEYE_API_KEY for indexed holder data.'):'Current indexed holder count.','Birdeye'),
    duplicates:metric('Needs identity graph','unknown','Official social/website contract matching is still a deeper Salt layer.','Salt'),
    creatorHistory:metric('Needs history','unknown','Deployer-history attribution is still a deeper Salt layer.','Salt')
  };
}

async function detectEvm(address,pref){
  if(pref==='ethereum'||pref==='bnb')return pref;
  const [eth,bnb]=await Promise.allSettled([rpc(ETH_RPC,'eth_getCode',[address,'latest']),rpc(BNB_RPC,'eth_getCode',[address,'latest'])]);
  if(eth.status==='fulfilled'&&eth.value&&eth.value!=='0x')return 'ethereum';
  if(bnb.status==='fulfilled'&&bnb.value&&bnb.value!=='0x')return 'bnb';
  throw Object.assign(new Error('No contract was found at that 0x address on Ethereum or BNB Chain.'),{status:404});
}
async function scanEvm(address,pref){
  const chain=await detectEvm(address,pref), beChain=chain==='bnb'?'bsc':'ethereum', chainLabel=chain==='bnb'?'BNB Chain':'Ethereum';
  const rpcUrl=chain==='bnb'?BNB_RPC:ETH_RPC;
  const [code,overview,security]=await Promise.all([rpc(rpcUrl,'eth_getCode',[address,'latest']),birdeye(`/defi/token_overview?address=${encodeURIComponent(address)}&frames=5m,1h,24h`,beChain),birdeye(`/defi/token_security?address=${encodeURIComponent(address)}`,beChain)]);
  if(!code||code==='0x')throw Object.assign(new Error(`No contract found on ${chainLabel}.`),{status:404});
  const liq=number(field(overview,'liquidity','liquidityUsd','liquidity_usd'));const holders=number(field(overview,'holder','holderCount','holder_count','holders'));
  const honeypot=securityBool(security,'is_honeypot','honeypot');const mintable=securityBool(security,'is_mintable','mintable');const proxy=securityBool(security,'is_proxy','proxy');const blacklist=securityBool(security,'is_blacklisted','blacklist');
  const buyTax=number(field(security,'buy_tax','buyTax')),sellTax=number(field(security,'sell_tax','sellTax'));const maxTax=Math.max(buyTax??0,sellTax??0);
  const checks=[{known:true,weight:15,risk:0},{known:honeypot!=null,weight:20,risk:honeypot?100:0},{known:buyTax!=null||sellTax!=null,weight:15,risk:maxTax>=20?80:maxTax>=10?50:maxTax>=5?20:0},{known:mintable!=null,weight:10,risk:mintable?70:0},{known:proxy!=null,weight:10,risk:proxy?35:0},{known:blacklist!=null,weight:10,risk:blacklist?70:0},{known:liq!=null,weight:10,risk:liq<5000?100:liq<20000?75:liq<50000?45:10},{known:holders!=null,weight:10,risk:0}];
  const s=finalize(checks,honeypot===true);const name=field(overview,'name')||`${chainLabel} token`,symbol=field(overview,'symbol')||'TOKEN';
  return {mint:address,chain,name,symbol,verified:false,...s,summary:`Salt confirmed the contract on ${chainLabel} and completed ${s.checksCompleted}/${s.checksTotal} core checks${process.env.BIRDEYE_API_KEY?' using Birdeye market/security data.':'. Add BIRDEYE_API_KEY for deeper EVM market/security intelligence.'}`,
    authenticity:metric('Contract confirmed','good',`Deployed bytecode exists on ${chainLabel}.`,'RPC'),
    sellable:metric(honeypot==null?'Not simulated':honeypot?'Possible block':'No honeypot flag',honeypot==null?'unknown':honeypot?'bad':'good','Birdeye token-security result when available.',honeypot==null?'Salt':'Birdeye'),
    honeypot:metric(honeypot==null?'Unknown':honeypot?'Detected':'Not detected',honeypot==null?'unknown':honeypot?'bad':'good','Current indexed honeypot flag.',honeypot==null?'Salt':'Birdeye'),
    taxes:metric(buyTax!=null||sellTax!=null?`${buyTax??'?'}% buy / ${sellTax??'?'}% sell`:'Unknown',buyTax==null&&sellTax==null?'unknown':maxTax>=20?'bad':maxTax>=8?'warn':'good','Current indexed token taxes.','Birdeye'),
    mintAuthority:metric(mintable==null?'Unknown':mintable?'Mintable':'Not mintable',mintable==null?'unknown':mintable?'bad':'good','Contract mint capability when indexed.','Birdeye'),
    ownerControl:metric(blacklist==null?'Unknown':blacklist?'Blacklist control':'No blacklist flag',blacklist==null?'unknown':blacklist?'warn':'good','Owner/control risk flag when indexed.','Birdeye'),
    proxyRisk:metric(proxy==null?'Unknown':proxy?'Upgradeable / proxy':'No proxy flag',proxy==null?'unknown':proxy?'warn':'good','Proxy/upgradeability flag when indexed.','Birdeye'),
    top10:metric('Needs holder graph','unknown','Wallet-level concentration will be added from Birdeye holder distribution.','Salt'),owner:metric('Needs wallet graph','unknown','Creator-linked holdings require attribution.','Salt'),bundled:metric('Needs wallet graph','unknown','Linked-wallet analysis is a later Salt layer.','Salt'),snipers:metric('Needs launch history','unknown','Launch-history analysis is a later Salt layer.','Salt'),
    liquidity:metric(liq==null?'Unknown':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?'Add/verify BIRDEYE_API_KEY for liquidity intelligence.':`Current indexed liquidity is about ${money(liq)}.`,'Birdeye'),holders:metric(holders==null?'Unknown':count(holders),holders==null?'unknown':'good','Current indexed holder count.','Birdeye'),duplicates:metric('Needs identity graph','unknown','Official contract matching is a later Salt layer.','Salt'),creatorHistory:metric('Needs history','unknown','Deployer history is a later Salt layer.','Salt')};
}

async function scanHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const mint=String(req.query.mint||'').trim();const pref=String(req.query.chain||'auto').toLowerCase();
    if(!mint)return res.status(400).json({error:'Paste a meme coin contract address first.'});
    const isSol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint),isEvm=/^0x[a-fA-F0-9]{40}$/.test(mint);
    let result;
    if(pref==='solana'||(pref==='auto'&&isSol)){if(!isSol)throw Object.assign(new Error('That does not look like a Solana mint address.'),{status:400});result=await scanSolana(mint)}
    else if(isEvm)result=await scanEvm(mint.toLowerCase(),pref);
    else throw Object.assign(new Error('Paste a valid Solana mint or 0x Ethereum / BNB Chain contract address.'),{status:400});
    return res.status(200).json(result);
  }catch(e){console.error('Salt scan error',e);const message=errorText(e?.message??e);return res.status(Number(e?.status)||500).json({error:message||'Salt scanner failed.'});}
};


async function healthHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({ok:true,service:'Salt Swap scanner',version:'1.6.2',providers:{helius:Boolean(process.env.HELIUS_API_KEY),birdeye:Boolean(process.env.BIRDEYE_API_KEY)}});
}

export default async function handler(req,res){
  try{
    const route=String(req.query?.route||'').toLowerCase();
    if(route==='health')return healthHandler(req,res);
    if(route==='scan')return scanHandler(req,res);
    return res.status(404).json({error:'Salt API route not found.'});
  }catch(e){
    console.error('Salt API router error',e);
    return res.status(500).json({error:errorText(e)});
  }
}
