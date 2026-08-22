const HELIUS_BASE='https://mainnet.helius-rpc.com/';
const BIRDEYE_BASE='https://public-api.birdeye.so';
const ETH_RPC='https://ethereum-rpc.publicnode.com';
const BNB_RPC='https://bsc-dataseed.binance.org';

const metric=(value,status,detail,source='Salt')=>({value,status,detail,source});
const number=v=>{if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const bool=v=>v===true||v===1||v==='1'||v==='true'?true:v===false||v===0||v==='0'||v==='false'?false:null;
const money=n=>{n=Number(n);if(!Number.isFinite(n))return null;if(n>=1e9)return `$${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(n<10?2:0)}`};
const count=n=>{n=Number(n);if(!Number.isFinite(n))return null;return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US')};
const statusPct=v=>v==null?'unknown':v<20?'good':v<40?'warn':'bad';
function errorText(v){if(v==null)return 'Request failed.';if(typeof v==='string')return v;if(v instanceof Error)return errorText(v.message);if(typeof v==='object'){const p=v.message??v.error?.message??v.error?.detail??v.error??v.details?.message??v.details??v.reason??v.statusText;if(p!=null&&p!==v)return errorText(p);try{const s=JSON.stringify(v);return s&&s!=='{}'?s:'Request failed.'}catch{return 'Request failed.'}}return String(v)}
function finalize(checks,critical=false){const known=checks.filter(x=>x.known),tw=checks.reduce((s,x)=>s+x.weight,0)||1,kw=known.reduce((s,x)=>s+x.weight,0),risk=known.reduce((s,x)=>s+x.weight*Math.max(0,Math.min(100,x.risk))/100,0);let score=kw?Math.round(100-(risk/kw)*100):null;if(critical&&score!=null)score=Math.min(score,20);const confidence=Math.round(kw/tw*100);let tone='unknown',label='PRELIMINARY';if(score!=null&&confidence>=45){tone=score>=80?'good':score>=55?'warn':'bad';label=score>=80?'LOOKS HEALTHY':score>=55?'BE CAREFUL':'HIGH RISK'}return{score,confidence,checksCompleted:known.length,checksTotal:checks.length,label,tone}}
async function fetchJson(url,options={},timeout=12000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{...options,signal:c.signal});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={message:text}}if(!r.ok){const err=new Error(errorText(data?.message??data?.error??data) || `HTTP ${r.status}`);err.status=r.status;throw err}return data}finally{clearTimeout(t)}}
async function rpc(url,method,params){const j=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(j.error)throw new Error(j.error.message||'RPC error');return j.result}
async function rpcBatch(url,calls){const arr=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(calls)});if(!Array.isArray(arr))throw new Error('RPC did not return a batch response.');const by=Object.fromEntries(arr.map(x=>[x.id,x]));for(const x of arr)if(x.error&&x.id!==4)throw new Error(x.error.message||'RPC error');return by}
const BIRDEYE_CACHE=new Map();
async function birdeye(path,chain){const key=process.env.BIRDEYE_API_KEY;if(!key)return null;const ck=`${chain}:${path}`,now=Date.now(),hit=BIRDEYE_CACHE.get(ck);if(hit&&now-hit.time<60000)return hit.data;try{const j=await fetchJson(`${BIRDEYE_BASE}${path}`,{headers:{accept:'application/json','X-API-KEY':key,'x-chain':chain}});const data=j?.data??j;BIRDEYE_CACHE.set(ck,{time:now,data});return data}catch(e){console.warn('Birdeye:',e.message);return null}}
function field(o,...keys){for(const k of keys)if(o&&o[k]!=null)return o[k];return null}
function securityBool(sec,...keys){return bool(field(sec,...keys))}
function top10FromRpc(largest,supply){const total=Number(supply?.value?.uiAmountString??supply?.value?.uiAmount??0);if(!total)return null;const vals=(largest?.value||[]).map(x=>Number(x.uiAmountString??x.uiAmount??0)).filter(Number.isFinite);return vals.slice(0,10).reduce((a,b)=>a+b,0)/total*100}

function holderTag(profile,name){
  if(!profile)return null;
  const tags=profile.tags??profile.holder_tags??profile.holderTags??profile.tag_summary??profile.tagSummary;
  const wanted=String(name).toLowerCase().replace(/[- ]/g,'_');
  if(Array.isArray(tags)){
    return tags.find(x=>String(field(x,'tag','label','name','type','holder_tag')??'').toLowerCase().replace(/[- ]/g,'_')===wanted)||null;
  }
  if(tags&&typeof tags==='object'){
    for(const [k,v] of Object.entries(tags))if(String(k).toLowerCase().replace(/[- ]/g,'_')===wanted)return v;
  }
  return null;
}
function holderPct(entry){
  const n=number(field(entry,'percent_of_supply','percentOfSupply','supply_percent','supplyPercent','percentage','percent'));
  if(n==null)return null;
  if(entry?._percentUnits==='percent')return n;
  return n>=0&&n<1?n*100:n;
}

function holderCount(entry){return number(field(entry,'holder_count','holderCount','count','wallet_count','walletCount'))}
function cohortMetric(entry,label,thresholds,description){
  if(!entry)return metric('Could not verify','unknown',`${label} data was not available from Salt's current holder-intelligence sources. This is different from a confirmed 0%.`,'Salt');
  const pct=holderPct(entry), wallets=holderCount(entry), source=entry._source||'Birdeye Holder Profile';
  if(pct==null)return metric('Detected · % unknown','unknown',`${label} wallets were detected, but a reliable current supply percentage was not returned.`,source);
  const [goodMax,warnMax]=thresholds;
  const status=pct<goodMax?'good':pct<warnMax?'warn':'bad';
  const countText=wallets==null?'':` across ${Math.round(wallets).toLocaleString('en-US')} wallet${Math.round(wallets)===1?'':'s'}`;
  if(entry._partial)return metric(`≥${pct.toFixed(1)}%`,status,`${description} The fallback only exposes the top tagged wallets, so Salt can verify at least ${pct.toFixed(1)}% of supply${countText}; the full cohort may be larger.`,source);
  return metric(`${pct.toFixed(1)}%`,status,`${description} Currently holding about ${pct.toFixed(1)}% of supply${countText}.`,source);
}

function rowsFrom(data){
  if(!data)return [];
  if(Array.isArray(data))return data;
  for(const k of ['items','list','rows','traders','holders','data'])if(Array.isArray(data[k]))return data[k];
  return [];
}
function rowLabels(row){
  const raw=field(row,'wallet_tags','walletTags','tags','labels','label','tag');
  if(Array.isArray(raw))return raw.map(x=>typeof x==='string'?x:field(x,'name','label','tag')).filter(Boolean).map(x=>String(x).toLowerCase().replace(/[- ]/g,'_'));
  if(typeof raw==='string')return raw.split(',').map(x=>x.trim().toLowerCase().replace(/[- ]/g,'_'));
  return [];
}
function rowAddress(row){return field(row,'owner','wallet','wallet_address','walletAddress','address')}
function rowHoldPct(row,supplyUi){
  const direct=holderPct(row); if(direct!=null)return direct;
  const hold=number(field(row,'holdVolume','hold_volume','ui_amount','uiAmount','amount')); if(hold==null||!supplyUi)return null;
  return hold/supplyUi*100;
}
async function fallbackTaggedCohorts(mint,supplyUi){
  const path=`/defi/v2/tokens/top_traders?address=${encodeURIComponent(mint)}&time_frame=all_time&sort_type=desc&sort_by=hold_volume&offset=0&limit=10&ui_amount_mode=scaled&wallet_tags=dev%2Cbundler%2Csniper%2Cinsider%2Csmart_trader`;
  const data=await birdeye(path,'solana'); const rows=rowsFrom(data); if(!rows.length)return {};
  const wanted=['dev','bundler','sniper','insider','smart_trader'], groups={};
  for(const tag of wanted)groups[tag]=new Map();
  for(const row of rows){const labels=rowLabels(row), addr=String(rowAddress(row)||Math.random()); for(const tag of wanted){if(!labels.includes(tag))continue; const pct=rowHoldPct(row,supplyUi); groups[tag].set(addr,{pct});}}
  const out={}; for(const tag of wanted){if(!groups[tag].size)continue; const vals=[...groups[tag].values()].map(x=>x.pct).filter(v=>v!=null); out[tag]={holder_count:groups[tag].size,percent_of_supply:vals.length?vals.reduce((a,b)=>a+b,0):null,_percentUnits:'percent',_partial:true,_source:'Birdeye Top Traders fallback'};}
  return out;
}
async function creatorIntel(rpcUrl,mint,supplyUi){
  try{
    const sigs=await rpc(rpcUrl,'getSignaturesForAddress',[mint,{limit:1000}]); if(!Array.isArray(sigs)||!sigs.length)return null;
    const earliest=sigs[sigs.length-1]; const tx=await rpc(rpcUrl,'getTransaction',[earliest.signature,{encoding:'jsonParsed',maxSupportedTransactionVersion:0,commitment:'confirmed'}]);
    const keys=tx?.transaction?.message?.accountKeys||[]; const signer=keys.find(k=>typeof k==='object'&&k.signer)?.pubkey||field(keys[0],'pubkey')||(typeof keys[0]==='string'?keys[0]:null); if(!signer)return null;
    let pct=null; try{const accts=await rpc(rpcUrl,'getTokenAccountsByOwner',[signer,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]); const held=(accts?.value||[]).reduce((sum,a)=>sum+Number(a?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString||a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount||0),0); if(supplyUi)pct=held/supplyUi*100;}catch{}
    let recent=[]; try{recent=await fetchJson(`https://api.helius.xyz/v0/addresses/${signer}/transactions?api-key=${encodeURIComponent(process.env.HELIUS_API_KEY)}&limit=20`);}catch{}
    const arr=Array.isArray(recent)?recent:[]; const mintLike=arr.filter(x=>/MINT|CREATE/i.test(String(x?.type||''))||/mint|create token/i.test(String(x?.description||''))).length;
    return {address:signer,pct,recentCount:arr.length,mintLike,createdAt:earliest.blockTime||null,_source:'Helius launch history'};
  }catch(e){console.warn('Creator intel:',e.message);return null;}
}
async function duplicateIntel(mint,name,symbol){
  const q=[name,symbol].filter(Boolean).join(' '); if(!q)return null;
  try{const j=await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,{headers:{accept:'application/json'}},8000); const pairs=Array.isArray(j?.pairs)?j.pairs:[]; if(!pairs.length)return null;
    const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''); const nn=norm(name),ns=norm(symbol); const seen=new Set();
    for(const p of pairs){const b=p?.baseToken||{}, addr=String(b.address||''); if(!addr||addr===mint)continue; const same=(nn&&norm(b.name)===nn)||(ns&&norm(b.symbol)===ns); if(same)seen.add(addr);}
    if(seen.size)return metric(`${seen.size} similar contract${seen.size===1?'':'s'}`,'warn',`DexScreener returned ${seen.size} other token contract${seen.size===1?'':'s'} with the same name or symbol. This is an identity warning, not proof that this mint is fake.`,'Salt + DexScreener');
    return metric('No close duplicate found','good','Salt searched indexed DEX listings and did not find another contract with the same normalized name or symbol. This does not prove official identity.','Salt + DexScreener');
  }catch{return null;}
}


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
  const [batch,overview,security,holderProfile]=await Promise.all([
    rpcBatch(url,calls),
    birdeye(`/defi/token_overview?address=${encodeURIComponent(mint)}&frames=5m,1h,24h`,'solana'),
    birdeye(`/defi/token_security?address=${encodeURIComponent(mint)}`,'solana'),
    birdeye(`/token/v1/holder-profile?token_address=${encodeURIComponent(mint)}&interval=1h&include_zero_balance=false`,'solana')
  ]);
  const info=batch[1]?.result, supply=batch[2]?.result, largest=batch[3]?.result, asset=batch[4]?.result;
  const parsed=info?.value?.data?.parsed?.info;if(!parsed)throw Object.assign(new Error('No standard Solana token mint was found at that address.'),{status:404});
  const supplyUi=Number(supply?.value?.uiAmountString??supply?.value?.uiAmount??0)||null;
  const top10=top10FromRpc(largest,supply), mintActive=parsed.mintAuthority!=null, freezeActive=parsed.freezeAuthority!=null;
  const liq=number(field(overview,'liquidity','liquidityUsd','liquidity_usd')), holders=number(field(overview,'holder','holderCount','holder_count','holders'));
  const assetMeta=asset?.content?.metadata||{}, assetLinks=asset?.content?.links||{}, assetFile=Array.isArray(asset?.content?.files)?asset.content.files.find(f=>f?.uri)||asset.content.files[0]:null;
  const name=field(assetMeta,'name')||field(asset?.token_info,'name')||field(overview,'name')||field(security,'name')||'Unknown token';
  const symbol=field(assetMeta,'symbol')||field(asset?.token_info,'symbol')||field(overview,'symbol')||field(security,'symbol')||'TOKEN';
  const logoUri=field(assetLinks,'image')||field(assetFile,'uri')||field(overview,'logoURI','logo_uri')||null;
  const identitySource=field(assetMeta,'name')||field(asset?.token_info,'symbol')?'Helius metadata':(field(overview,'name')||field(overview,'symbol')?'Birdeye':'On-chain mint');
  const verified=Boolean(field(overview,'logoURI','logo_uri'));
  const securityMint=securityBool(security,'is_mintable','mintable'), securityFreeze=securityBool(security,'freezeable','freezable','is_freezable');
  const mintable=securityMint==null?mintActive:securityMint, freezable=securityFreeze==null?freezeActive:securityFreeze;

  let tags={bundler:holderTag(holderProfile,'bundler'),sniper:holderTag(holderProfile,'sniper'),insider:holderTag(holderProfile,'insider'),dev:holderTag(holderProfile,'dev'),smart_trader:holderTag(holderProfile,'smart_trader')};
  if(Object.values(tags).some(v=>!v)){
    const fb=await fallbackTaggedCohorts(mint,supplyUi);
    for(const k of Object.keys(tags))if(!tags[k]&&fb[k])tags[k]=fb[k];
  }
  const creator=await creatorIntel(url,mint,supplyUi);
  if(!tags.dev&&creator?.pct!=null)tags.dev={percent_of_supply:creator.pct,holder_count:1,_percentUnits:'percent',_source:'Helius creator wallet'};
  const duplicateCheck=await duplicateIntel(mint,name,symbol);
  const bundlerTag=tags.bundler,sniperTag=tags.sniper,insiderTag=tags.insider,devTag=tags.dev,smartTag=tags.smart_trader;
  const bundlePct=holderPct(bundlerTag),sniperPct=holderPct(sniperTag),insiderPct=holderPct(insiderTag),devPct=holderPct(devTag);
  const risks=[];if(mintable)risks.push('mint authority/capability is active');if(freezable)risks.push('freeze authority/capability is active');if(top10!=null&&top10>=40)risks.push('supply is concentrated');if(liq!=null&&liq<20000)risks.push('liquidity is thin');if(bundlePct!=null&&bundlePct>=15)risks.push(`${bundlePct.toFixed(1)}% of supply is held by tagged bundler wallets`);if(sniperPct!=null&&sniperPct>=15)risks.push(`${sniperPct.toFixed(1)}% of supply is held by tagged sniper wallets`);if(insiderPct!=null&&insiderPct>=8)risks.push(`${insiderPct.toFixed(1)}% of supply is held by tagged insider wallets`);if(devPct!=null&&devPct>=10)risks.push(`${devPct.toFixed(1)}% of supply is held by the creator/dev cohort`);
  const checks=[
    {known:true,weight:10,risk:0},{known:true,weight:12,risk:mintable?80:0},{known:true,weight:12,risk:freezable?75:0},
    {known:top10!=null,weight:16,risk:top10>=70?100:top10>=50?80:top10>=35?55:top10>=20?25:5},
    {known:liq!=null,weight:12,risk:liq<5000?100:liq<20000?75:liq<50000?45:liq<150000?20:5},{known:holders!=null,weight:6,risk:0},{known:security!=null,weight:8,risk:0},
    {known:bundlePct!=null,weight:10,risk:bundlePct>=30?100:bundlePct>=15?70:bundlePct>=5?35:5},{known:sniperPct!=null,weight:6,risk:sniperPct>=30?95:sniperPct>=15?65:sniperPct>=5?30:5},{known:insiderPct!=null,weight:4,risk:insiderPct>=15?100:insiderPct>=8?70:insiderPct>=2?35:5},{known:devPct!=null,weight:4,risk:devPct>=20?100:devPct>=10?70:devPct>=3?30:5}
  ];
  const s=finalize(checks);
  const creatorHistory=creator?metric(creator.mintLike?`${creator.mintLike} recent mint/create event${creator.mintLike===1?'':'s'}`:'Creator identified',creator.mintLike>=3?'warn':'good',`Salt traced a likely launch signer ${creator.address.slice(0,6)}…${creator.address.slice(-4)}. Helius returned ${creator.recentCount} recent parsed transactions${creator.createdAt?` and the earliest sampled mint activity was ${new Date(creator.createdAt*1000).toLocaleDateString('en-US')}`:''}. This is creator-wallet context, not proof of every prior deployment.`,'Helius launch history'):metric('Could not verify','unknown','Salt could not reliably trace a creator wallet from the mint history for this scan.','Salt');
  return {mint,chain:'solana',name,symbol,logoUri,identitySource,verified,...s,
    summary:risks.length?`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks and found ${risks.join(', ')}.`:`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks. No major warning was found in the data currently available.`,
    authenticity:metric('Mint confirmed','good','Helius confirmed a valid Solana token mint on-chain.','Helius'),
    sellable:metric(liq!=null?'Market found':'Not simulated',liq!=null?'good':'unknown',liq!=null?'Birdeye returned live market/liquidity data.':'A real swap-route simulation is a later Salt layer.',liq!=null?'Birdeye':'Salt'),
    mintAuthority:metric(mintable?'Active':'Revoked',mintable?'bad':'good',mintable?'More supply may be mintable.':'No active mint capability was detected.',security?'Helius + Birdeye':'Helius'),
    freezeAuthority:metric(freezable?'Active':'Revoked',freezable?'bad':'good',freezable?'Token accounts may be freezeable.':'No active freeze capability was detected.',security?'Helius + Birdeye':'Helius'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,statusPct(top10),top10==null?'Holder concentration was unavailable.':`Top 10 token accounts hold about ${top10.toFixed(1)}% of current supply.`,'Helius'),
    owner:cohortMetric(devTag,'Creator / dev',[3,10],'Salt checks Birdeye dev labels first, then falls back to the creator wallet traced from Solana launch history.'),
    bundled:cohortMetric(bundlerTag,'Bundler',[5,15],'Salt checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    snipers:cohortMetric(sniperTag,'Sniper',[5,15],'Salt checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    insiders:cohortMetric(insiderTag,'Insider',[2,8],'Salt checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    smartTraders:cohortMetric(smartTag,'Smart trader',[101,102],'Salt checks Birdeye Holder Profile first, then tagged Top Traders for profitable-wallet participation.'),
    liquidity:metric(liq==null?'Unknown':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return liquidity for this token.':'Add BIRDEYE_API_KEY for market/liquidity intelligence.'):`Current indexed liquidity is about ${money(liq)}.`,liq==null?'Salt':'Birdeye'),
    holders:metric(holders==null?'Unknown':count(holders),holders==null?'unknown':'good',holders==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return a holder count.':'Add BIRDEYE_API_KEY for indexed holder data.'):'Current indexed holder count.','Birdeye'),
    duplicates:duplicateCheck||metric('Could not verify','unknown','Salt could not complete the secondary DEX identity search for this token.','Salt'),
    creatorHistory
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
  return res.status(200).json({ok:true,service:'Salt Swap scanner',version:'1.6.4',providers:{helius:Boolean(process.env.HELIUS_API_KEY),birdeye:Boolean(process.env.BIRDEYE_API_KEY)}});
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
