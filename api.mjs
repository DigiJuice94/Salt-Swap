const HELIUS_BASE='https://mainnet.helius-rpc.com/';
const BIRDEYE_BASE='https://public-api.birdeye.so';
const ETH_RPC='https://ethereum-rpc.publicnode.com';
const BNB_RPC='https://bsc-rpc.publicnode.com';
const BASE_RPC='https://base-rpc.publicnode.com';
const ROBINHOOD_RPC='https://rpc.mainnet.chain.robinhood.com';
const ETH_RPCS=['https://ethereum-rpc.publicnode.com','https://eth.llamarpc.com','https://rpc.ankr.com/eth'];
const BNB_RPCS=['https://bsc-rpc.publicnode.com','https://bsc-dataseed.binance.org','https://rpc.ankr.com/bsc'];
const BASE_RPCS=['https://base-rpc.publicnode.com','https://mainnet.base.org','https://base.llamarpc.com'];
const ROBINHOOD_RPCS=['https://rpc.mainnet.chain.robinhood.com'];
const JUPITER_BASE='https://api.jup.ag/swap/v2';
const JUPITER_TOKENS_BASE='https://api.jup.ag/tokens/v2';
const ZEROX_BASE='https://api.0x.org/swap/allowance-holder';
const NATIVE_EVM='0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const SOL_MINT='So11111111111111111111111111111111111111112';

const metric=(value,status,detail,source='Trenches Engine')=>({value,status,detail,source});
const number=v=>{if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const bool=v=>v===true||v===1||v==='1'||v==='true'?true:v===false||v===0||v==='0'||v==='false'?false:null;
const money=n=>{n=Number(n);if(!Number.isFinite(n))return null;if(n>=1e9)return `$${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(n<10?2:0)}`};
const count=n=>{n=Number(n);if(!Number.isFinite(n))return null;return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US')};
const statusPct=v=>v==null?'unknown':v<20?'good':v<40?'warn':'bad';
function errorText(v){if(v==null)return 'Request failed.';if(typeof v==='string')return v;if(v instanceof Error)return errorText(v.message);if(typeof v==='object'){const p=v.message??v.error?.message??v.error?.detail??v.error??v.details?.message??v.details??v.reason??v.statusText;if(p!=null&&p!==v)return errorText(p);try{const s=JSON.stringify(v);return s&&s!=='{}'?s:'Request failed.'}catch{return 'Request failed.'}}return String(v)}
function finalize(checks,critical=false){const known=checks.filter(x=>x.known),tw=checks.reduce((s,x)=>s+x.weight,0)||1,kw=known.reduce((s,x)=>s+x.weight,0),risk=known.reduce((s,x)=>s+x.weight*Math.max(0,Math.min(100,x.risk))/100,0);let score=kw?Math.round(100-(risk/kw)*100):null;if(critical&&score!=null)score=Math.min(score,20);const confidence=Math.round(kw/tw*100);let tone='unknown',label='PRELIMINARY';if(score!=null&&confidence>=45){tone=score>=80?'good':score>=55?'warn':'bad';label=score>=80?'LOOKS HEALTHY':score>=55?'BE CAREFUL':'HIGH RISK'}return{score,confidence,checksCompleted:known.length,checksTotal:checks.length,label,tone}}
function applyHardRiskOverrides(summary,ctx={}){const reasons=[];if(ctx.authenticityBad===true)reasons.push('contract authenticity failed');if(ctx.sellabilityBad===true)reasons.push('sellability failed');if(ctx.freezable===true)reasons.push('freeze capability is active');const top10=number(ctx.top10),bundle=number(ctx.bundlePct),dev=number(ctx.devPct);if(top10!=null&&top10>80)reasons.push(`top 10 wallets hold ${top10.toFixed(1)}% of supply`);if(bundle!=null&&bundle>25)reasons.push(`bundled wallets hold ${bundle.toFixed(1)}% of supply`);if(top10!=null&&bundle!=null&&top10>70&&bundle>15&&!(top10>80)&&!(bundle>25))reasons.push(`top 10 concentration (${top10.toFixed(1)}%) and bundled supply (${bundle.toFixed(1)}%) are both severe`);if(ctx.mintable===true){if(top10!=null&&top10>70&&top10<=80)reasons.push(`mint capability is active alongside high top 10 concentration (${top10.toFixed(1)}%)`);if(bundle!=null&&bundle>15&&bundle<=25)reasons.push(`mint capability is active alongside elevated bundled supply (${bundle.toFixed(1)}%)`);if(dev!=null&&dev>=10)reasons.push(`mint capability is active while the creator/dev cohort still holds ${dev.toFixed(1)}% of supply`)}if(!reasons.length)return{...summary,hardRiskOverride:false,hardRiskReasons:[]};return{...summary,label:'HIGH RISK',tone:'bad',hardRiskOverride:true,hardRiskReasons:reasons}}
async function fetchJson(url,options={},timeout=12000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{...options,signal:c.signal});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={message:text}}if(!r.ok){const err=new Error(errorText(data?.message??data?.error??data) || `HTTP ${r.status}`);err.status=r.status;throw err}return data}finally{clearTimeout(t)}}
let robinhoodAssetsCache={at:0,assets:[]};
async function robinhoodStockAsset(address){
  try{
    if(Date.now()-robinhoodAssetsCache.at>5*60*1000||!robinhoodAssetsCache.assets.length){
      const j=await fetchJson('https://api.robinhood.com/rhj/assets',{headers:{accept:'application/json'}},9000);
      robinhoodAssetsCache={at:Date.now(),assets:Array.isArray(j?.assets)?j.assets:[]};
    }
    const a=String(address||'').toLowerCase();
    return robinhoodAssetsCache.assets.find(asset=>(asset?.deployments||[]).some(d=>Number(d?.chainId)===4663&&String(d?.contractAddress||'').toLowerCase()===a))||null;
  }catch(e){console.warn('Robinhood stock asset registry:',e.message);return null}
}
async function robinhoodStockPrice(asset){
  const symbol=String(asset?.tokenSymbol||'').trim().toUpperCase();
  if(!symbol)return null;
  try{
    const j=await fetchJson(`https://api.robinhood.com/rhj/prices/${encodeURIComponent(symbol)}`,{headers:{accept:'application/json'}},8000);
    const q=(Array.isArray(j?.quotes)?j.quotes:[]).find(x=>String(x?.tokenSymbol||'').toUpperCase()===symbol)||j?.quotes?.[0]||null;
    if(!q)return null;
    const bid=number(q.bid),ask=number(q.ask),raw=bid!=null&&ask!=null?(bid+ask)/2:(bid??ask);
    const multiplier=number(asset?.currentMultiplier)??1;
    return {symbol,bid,ask,rawUnderlyingPriceUsd:raw,tokenPriceUsd:raw==null?null:raw*multiplier,multiplier,dailyTradingVolume:number(q.dailyTradingVolume),isTradingHalt:q.isTradingHalt===true,generatedAt:q.generatedAt||null};
  }catch(e){console.warn('Robinhood stock price:',e.message);return null}
}
function parseCompactUsd(text){
  if(!text)return null;const m=String(text).trim().replace(/[$,]/g,'').match(/^([0-9]+(?:\.[0-9]+)?)\s*([KMBT])?$/i);if(!m)return null;
  const mult={K:1e3,M:1e6,B:1e9,T:1e12}[String(m[2]||'').toUpperCase()]||1;return Number(m[1])*mult;
}
async function robinhoodUnderlyingStats(symbol){
  if(!symbol)return null;
  try{
    const r=await fetch(`https://robinhood.com/us/en/stocks/${encodeURIComponent(symbol)}/`,{headers:{accept:'text/html','user-agent':'Mozilla/5.0 SaltSwap/1.8.5'}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const html=await r.text();
    const plain=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
    const capMatch=plain.match(/Market cap\s*\$?([0-9][0-9,.]*\s*[KMBT]?)/i)||plain.match(/market cap (?:stands at|of)\s*\$?([0-9][0-9,.]*\s*[KMBT]?)/i);
    const aumMatch=plain.match(/AUM\s*\$?([0-9][0-9,.]*\s*[KMBT]?)/i);
    const marketCapUsd=parseCompactUsd(capMatch?.[1]);const aumUsd=parseCompactUsd(aumMatch?.[1]);
    return {marketCapUsd,aumUsd,source:'Robinhood underlying asset page'};
  }catch(e){console.warn('Robinhood underlying stats:',e.message);return null}
}
function dexPaidTypeLabel(type){return ({tokenProfile:'Token profile',communityTakeover:'Community takeover',tokenAd:'Token ad',trendingBarAd:'Trending bar ad',boost:'Active boost'})[type]||String(type||'Paid service')}
function sameDexToken(row,chainId,tokenAddress){return String(row?.chainId||'').toLowerCase()===String(chainId).toLowerCase()&&String(row?.tokenAddress||'').toLowerCase()===String(tokenAddress).toLowerCase()}
async function dexPaidIntel(chainId,tokenAddress){
  const base='https://api.dexscreener.com';
  const get=async(path,timeout=7000)=>{try{return await fetchJson(base+path,{headers:{accept:'application/json'}},timeout)}catch(e){console.warn('DEX Screener '+path+':',e.message);return null}};
  const [orders,pairs,profiles,ads,ctos,boostLatest,boostTop]=await Promise.all([
    get(`/orders/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`),
    get(`/token-pairs/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`,8000),
    get('/token-profiles/latest/v1'),
    get('/ads/latest/v1'),
    get('/community-takeovers/latest/v1'),
    get('/token-boosts/latest/v1'),
    get('/token-boosts/top/v1')
  ]);
  const evidence=[];
  const rows=Array.isArray(orders)?orders:[];
  for(const row of rows){
    if(!row)continue;
    const status=String(row.status||'').toLowerCase();
    const paid=row.paymentTimestamp!=null||['approved','processing','on-hold'].includes(status);
    if(paid)evidence.push({type:row.type||'paidOrder',label:dexPaidTypeLabel(row.type),status:row.status||null,source:'Paid Orders'});
  }
  const pairRows=Array.isArray(pairs)?pairs:[];
  const activeBoosts=pairRows.reduce((max,p)=>Math.max(max,Number(p?.boosts?.active)||0),0);
  if(activeBoosts>0)evidence.push({type:'boost',label:`Active boosts (${activeBoosts})`,status:'active',source:'Token Pairs'});
  const firstMatch=(arr)=>Array.isArray(arr)?arr.find(x=>sameDexToken(x,chainId,tokenAddress)):null;
  if(firstMatch(profiles))evidence.push({type:'tokenProfile',label:'Token profile',status:'listed',source:'Latest Profiles'});
  if(firstMatch(ads))evidence.push({type:'tokenAd',label:'Token ad',status:'active/recent',source:'Latest Ads'});
  if(firstMatch(ctos))evidence.push({type:'communityTakeover',label:'Community takeover',status:'active/recent',source:'Latest CTO'});
  const boostHit=firstMatch(boostTop)||firstMatch(boostLatest);
  if(boostHit&&!evidence.some(x=>x.type==='boost')){
    const amount=Number(boostHit.amount)||Number(boostHit.totalAmount)||0;
    evidence.push({type:'boost',label:amount>0?`DEX boost (${amount})`:'DEX boost',status:'active/recent',source:'Boosts'});
  }
  const unique=[];const seen=new Set();
  for(const e of evidence){const k=`${e.type}:${e.label}`;if(!seen.has(k)){seen.add(k);unique.push(e)}}
  if(unique.length){
    const labels=unique.map(x=>x.label);
    const detail=`DEX Screener shows paid-service evidence for this token: ${labels.join(', ')}. The Trenches checks paid orders plus active boosts, recent profiles, ads, and community takeovers. Paid promotion/identity work is useful context, not proof of safety.`;
    return metric(`Yes — ${labels.join(' + ')}`,'good',detail,`DEX Screener (${[...new Set(unique.map(x=>x.source))].join(' + ')})`);
  }
  const anyResponse=[orders,pairs,profiles,ads,ctos,boostLatest,boostTop].some(x=>x!=null);
  if(!anyResponse)return metric('Could not verify','unknown','DEX Screener data sources were unavailable for this scan. The Trenches will not guess whether DEX services were paid.','DEX Screener');
  return metric('No paid evidence found','unknown','The Trenches checked DEX Screener paid orders, active boosts, recent token profiles, ads, and community takeovers and found no paid-service evidence in the currently available API data. This is not treated as proof that a project never paid DEX Screener.','DEX Screener multi-source');
}
async function rpc(url,method,params){const j=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(j.error)throw new Error(j.error.message||'RPC error');return j.result}

async function evmRpcTry(chain,method,params){const urls=chain==='bnb'?BNB_RPCS:chain==='base'?BASE_RPCS:chain==='robinhood'?ROBINHOOD_RPCS:ETH_RPCS;let last;for(const url of urls){try{return await rpc(url,method,params)}catch(e){last=e;console.warn(`EVM RPC ${chain} ${url}:`,e.message)}}throw last||new Error(`${chain} RPC unavailable`)}
async function goPlusTokenSecurity(address,chain){const chainId=chain==='bnb'?'56':chain==='base'?'8453':chain==='robinhood'?'4663':'1';try{const j=await fetchJson(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(address)}`,{headers:{accept:'application/json'}},9000);const result=j?.result||{};return result[String(address).toLowerCase()]||result[address]||Object.values(result)[0]||null}catch(e){console.warn('GoPlus EVM:',e.message);return null}}
async function dexEvmOverview(address,chain){const dsChain=chain==='bnb'?'bsc':chain==='base'?'base':chain==='robinhood'?'robinhood':'ethereum';try{const rows=await fetchJson(`https://api.dexscreener.com/token-pairs/v1/${dsChain}/${encodeURIComponent(address)}`,{headers:{accept:'application/json'}},9000);const pairs=Array.isArray(rows)?rows:[];if(!pairs.length)return null;const match=pairs.filter(x=>String(x?.chainId||'')===dsChain).sort((a,b)=>(Number(b?.liquidity?.usd)||0)-(Number(a?.liquidity?.usd)||0))[0]||pairs[0];const addr=String(address).toLowerCase(),base=match?.baseToken,quote=match?.quoteToken,token=String(base?.address||'').toLowerCase()===addr?base:String(quote?.address||'').toLowerCase()===addr?quote:base;return{name:token?.name||null,symbol:token?.symbol||null,priceUsd:number(match?.priceUsd),marketCapUsd:number(match?.marketCap??match?.fdv),fdv:number(match?.fdv),liquidityUsd:number(match?.liquidity?.usd),pairAddress:match?.pairAddress||null,dexId:match?.dexId||null,imageUrl:match?.info?.imageUrl||null,volume24h:number(match?.volume?.h24)}}catch(e){console.warn('DexScreener EVM overview:',e.message);return null}}
function gpBool(o,...keys){return bool(field(o,...keys))}
function gpPct(v){const n=number(v);if(n==null)return null;return n>0&&n<=1?n*100:n}
function gpTop10(sec){const holders=Array.isArray(sec?.holders)?sec.holders:[];if(!holders.length)return null;const vals=holders.map(x=>gpPct(field(x,'percent','percentage','rate'))).filter(x=>x!=null);return vals.slice(0,10).reduce((a,b)=>a+b,0)}
async function rpcBatch(url,calls){const arr=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(calls)});if(!Array.isArray(arr))throw new Error('RPC did not return a batch response.');const by=Object.fromEntries(arr.map(x=>[x.id,x]));for(const x of arr)if(x.error&&x.id!==4)throw new Error(x.error.message||'RPC error');return by}
const BIRDEYE_CACHE=new Map();
async function birdeye(path,chain){const key=process.env.BIRDEYE_API_KEY;if(!key)return null;const ck=`${chain}:${path}`,now=Date.now(),hit=BIRDEYE_CACHE.get(ck);if(hit&&now-hit.time<60000)return hit.data;try{const j=await fetchJson(`${BIRDEYE_BASE}${path}`,{headers:{accept:'application/json','X-API-KEY':key,'x-chain':chain}});const data=j?.data??j;BIRDEYE_CACHE.set(ck,{time:now,data});return data}catch(e){console.warn('Birdeye:',e.message);return null}}
function field(o,...keys){for(const k of keys)if(o&&o[k]!=null)return o[k];return null}
function securityBool(sec,...keys){return bool(field(sec,...keys))}
function top10FromRpc(largest,supply){const total=Number(supply?.value?.uiAmountString??supply?.value?.uiAmount??0);if(!total)return null;const vals=(largest?.value||[]).map(x=>Number(x.uiAmountString??x.uiAmount??0)).filter(Number.isFinite);return vals.slice(0,10).reduce((a,b)=>a+b,0)/total*100}

function normalizeMediaUri(uri){if(!uri||typeof uri!=='string')return null;const u=uri.trim();if(u.startsWith('ipfs://'))return `https://ipfs.io/ipfs/${u.slice(7).replace(/^ipfs\//,'')}`;if(u.startsWith('ar://'))return `https://arweave.net/${u.slice(5)}`;return /^https?:\/\//i.test(u)?u:null}
function mediaCandidates(uri){const n=normalizeMediaUri(uri);if(!n)return [];const out=[n],m=n.match(/^https:\/\/ipfs\.io\/ipfs\/(.+)$/i);if(m)out.push(`https://dweb.link/ipfs/${m[1]}`);return [...new Set(out)]}
function looksLikeImage(uri,mime=''){return /^image\//i.test(String(mime))||/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(String(uri||''))}
async function resolveSolanaIdentity(asset,overview,security,mint){const meta=asset?.content?.metadata||{},links=asset?.content?.links||{},files=Array.isArray(asset?.content?.files)?asset.content.files:[];let name=field(meta,'name')||field(asset?.token_info,'name')||field(overview,'name')||field(security,'name')||null,symbol=field(meta,'symbol')||field(asset?.token_info,'symbol')||field(overview,'symbol')||field(security,'symbol')||null;const logos=[],add=u=>{for(const x of mediaCandidates(u))if(!logos.includes(x))logos.push(x)};add(field(links,'image'));{const f=files.find(x=>looksLikeImage(x?.uri,x?.mime||x?.mimeType));add(f?.uri)}let source=(field(meta,'name')||field(asset?.token_info,'symbol'))?'Helius metadata':((field(overview,'name')||field(overview,'symbol'))?'Birdeye':'On-chain mint');const jsonUri=normalizeMediaUri(field(asset?.content,'json_uri','jsonUri')||field(meta,'uri'));if((!logos.length||!name||!symbol)&&jsonUri){try{const j=await fetchJson(jsonUri,{headers:{accept:'application/json'}},7000);name=name||field(j,'name');symbol=symbol||field(j,'symbol');add(field(j,'image','image_uri','imageUrl','image_url'));if(Array.isArray(j?.properties?.files)){const f=j.properties.files.find(x=>looksLikeImage(x?.uri,x?.type));add(f?.uri)}}catch(e){console.warn('Metadata URI:',e.message)}}if((!logos.length||!name||!symbol)&&String(mint).toLowerCase().endsWith('pump')){try{const j=await fetchJson(`https://frontend-api-v3.pump.fun/coins-v2/${encodeURIComponent(mint)}`,{headers:{accept:'application/json'}},7000),d=j?.data??j;name=name||field(d,'name');symbol=symbol||field(d,'symbol');add(field(d,'image_uri','imageUri','image'));if(field(d,'name')||field(d,'image_uri'))source='Pump.fun metadata'}catch(e){console.warn('Pump metadata:',e.message)}}if(!logos.length)add(field(overview,'logoURI','logo_uri'));if(!logos.length){try{const j=await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(mint)}`,{headers:{accept:'application/json'}},6500),pair=(j?.pairs||[]).find(x=>String(x?.baseToken?.address||'')===mint||String(x?.quoteToken?.address||'')===mint);add(pair?.info?.imageUrl)}catch{}}return{name:name||'Unknown token',symbol:symbol||'TOKEN',logoUri:logos[0]||null,logoUris:logos,identitySource:source}}
const BUNDLE_ANALYSIS_CACHE=new Map();
function tradeTokenAddr(side){return field(side,'address','token_address','tokenAddress','mint')}
function tradeHash(r){return field(r,'txHash','tx_hash','signature','txid')}
function tradeOwner(r){return field(r,'owner','wallet','trader','walletAddress','wallet_address')}
function isBuyTrade(r,mint){const ta=tradeTokenAddr(field(r,'to')),fa=tradeTokenAddr(field(r,'from'));if(ta===mint)return true;if(fa===mint)return false;return String(field(r,'side','type','txType','tx_type')||'').toLowerCase()==='buy'}
async function saltLaunchBundleAnalysis(mint,rpcUrl,supplyUi){const hit=BUNDLE_ANALYSIS_CACHE.get(mint);if(hit&&Date.now()-hit.time<300000)return hit.data;try{const trades=await birdeye(`/defi/txs/token?address=${encodeURIComponent(mint)}&offset=0&limit=50&tx_type=swap&sort_type=asc&ui_amount_mode=scaled`,'solana'),buys=rowsFrom(trades).filter(r=>isBuyTrade(r,mint)&&tradeHash(r)&&tradeOwner(r)).slice(0,40);if(buys.length<4)return null;const calls=buys.map((r,i)=>({jsonrpc:'2.0',id:1000+i,method:'getTransaction',params:[tradeHash(r),{encoding:'jsonParsed',maxSupportedTransactionVersion:0,commitment:'confirmed'}]})),txs=await fetchJson(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(calls)},15000),slots=new Map();for(const x of Array.isArray(txs)?txs:[]){const r=buys[Number(x.id)-1000],slot=number(x?.result?.slot);if(!r||slot==null)continue;if(!slots.has(slot))slots.set(slot,[]);slots.get(slot).push(r)}const bundled=new Set(),ordered=[...slots.keys()].sort((a,b)=>a-b);for(const slot of ordered){const rs=slots.get(slot)||[];if(rs.length>=4)rs.forEach(r=>bundled.add(tradeOwner(r)))}for(let i=0;i<ordered.length-1;i++){if(ordered[i+1]-ordered[i]>1)continue;const ws=new Set([...(slots.get(ordered[i])||[]),...(slots.get(ordered[i+1])||[])].map(tradeOwner).filter(Boolean));if(ws.size>=3)ws.forEach(w=>bundled.add(w))}if(!bundled.size)return{percent_of_supply:0,holder_count:0,_percentUnits:'percent',_source:'Trenches Bundle Analysis'};const wallets=[...bundled].slice(0,30),bcalls=wallets.map((w,i)=>({jsonrpc:'2.0',id:2000+i,method:'getTokenAccountsByOwner',params:[w,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]})),bal=await fetchJson(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(bcalls)},15000);let held=0;for(const x of Array.isArray(bal)?bal:[])for(const a of x?.result?.value||[])held+=Number(a?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString||a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount||0);const data={percent_of_supply:supplyUi?held/supplyUi*100:null,holder_count:wallets.length,_percentUnits:'percent',_source:'Trenches Bundle Analysis'};BUNDLE_ANALYSIS_CACHE.set(mint,{time:Date.now(),data});return data}catch(e){console.warn('Salt bundle analysis:',e.message);return null}}

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
  if(!entry)return metric('Could not verify','unknown',`${label} data was not available from The Trenches' current holder-intelligence sources. This is different from a confirmed 0%.`,'Trenches Engine');
  const pct=holderPct(entry), wallets=holderCount(entry), source=entry._source||'Birdeye Holder Profile';
  if(pct==null)return metric('Detected · % unknown','unknown',`${label} wallets were detected, but a reliable current supply percentage was not returned.`,source);
  const [goodMax,warnMax]=thresholds;
  const status=pct<goodMax?'good':pct<warnMax?'warn':'bad';
  const countText=wallets==null?'':` across ${Math.round(wallets).toLocaleString('en-US')} wallet${Math.round(wallets)===1?'':'s'}`;
  if(entry._partial)return metric(`≥${pct.toFixed(1)}%`,status,`${description} The fallback only exposes the top tagged wallets, so The Trenches can verify at least ${pct.toFixed(1)}% of supply${countText}; the full cohort may be larger.`,source);
  if(pct===0&&source==='Birdeye Holder Profile')return metric('No Birdeye-tagged wallets','unknown',`${description} Birdeye returned zero tagged ${label.toLowerCase()} wallets, but The Trenches does not treat an indexer zero as proof that none exist.`,source);
  if(pct===0&&source==='Trenches Bundle Analysis')return metric('No launch bundle detected','good',`${description} The Trenches checked the sampled earliest swaps for same-slot/adjacent-slot coordinated buying and found no qualifying launch bundle in that sample.`,source);
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
    if(seen.size)return metric(`${seen.size} similar contract${seen.size===1?'':'s'}`,'warn',`DexScreener returned ${seen.size} other token contract${seen.size===1?'':'s'} with the same name or symbol. This is an identity warning, not proof that this mint is fake.`,'Trenches Engine + DexScreener');
    return metric('No close duplicate found','good','The Trenches searched indexed DEX listings and did not find another contract with the same normalized name or symbol. This does not prove official identity.','Trenches Engine + DexScreener');
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
  const decimals=number(supply?.value?.decimals)??number(parsed?.decimals)??0;
  const top10=top10FromRpc(largest,supply), mintActive=parsed.mintAuthority!=null, freezeActive=parsed.freezeAuthority!=null;
  const liq=number(field(overview,'liquidity','liquidityUsd','liquidity_usd')), holders=number(field(overview,'holder','holderCount','holder_count','holders'));
  const priceUsd=number(field(overview,'price','priceUsd','price_usd','value'));
  const indexedMarketCap=number(field(overview,'mc','marketCap','market_cap','marketcap','marketCapUsd','market_cap_usd'));
  const marketCapUsd=indexedMarketCap??(priceUsd!=null&&supplyUi!=null?priceUsd*supplyUi:null);
  const dexPaid=await dexPaidIntel('solana',mint);
  const identity=await resolveSolanaIdentity(asset,overview,security,mint);
  const {name,symbol,logoUri,logoUris,identitySource}=identity;
  const verified=Boolean(field(overview,'logoURI','logo_uri'));
  const securityMint=securityBool(security,'is_mintable','mintable'), securityFreeze=securityBool(security,'freezeable','freezable','is_freezable');
  const mintable=securityMint==null?mintActive:securityMint, freezable=securityFreeze==null?freezeActive:securityFreeze;

  let tags={bundler:holderTag(holderProfile,'bundler'),sniper:holderTag(holderProfile,'sniper'),insider:holderTag(holderProfile,'insider'),dev:holderTag(holderProfile,'dev'),smart_trader:holderTag(holderProfile,'smart_trader')};
  if(Object.values(tags).some(v=>!v)){
    const fb=await fallbackTaggedCohorts(mint,supplyUi);
    for(const k of Object.keys(tags))if(!tags[k]&&fb[k])tags[k]=fb[k];
  }
  const bp=holderPct(tags.bundler),bc=holderCount(tags.bundler);if(!tags.bundler||bp==null||bp===0||bc===0){const sb=await saltLaunchBundleAnalysis(mint,url,supplyUi);if(sb&&holderPct(sb)>0)tags.bundler=sb;else if(!tags.bundler&&sb)tags.bundler=sb;}
  const creator=await creatorIntel(url,mint,supplyUi);
  if(!tags.dev&&creator?.pct!=null)tags.dev={percent_of_supply:creator.pct,holder_count:1,_percentUnits:'percent',_source:'Helius creator wallet'};
  const duplicateCheck=await duplicateIntel(mint,name,symbol);
  const bundlerTag=tags.bundler,sniperTag=tags.sniper,insiderTag=tags.insider,devTag=tags.dev,smartTag=tags.smart_trader;
  const bundlePct=holderPct(bundlerTag),sniperPct=holderPct(sniperTag),insiderPct=holderPct(insiderTag),devPct=holderPct(devTag);
  const risks=[];if(mintable)risks.push('mint authority/capability is active');if(freezable)risks.push('freeze authority/capability is active');if(top10!=null&&top10>=40)risks.push('supply is concentrated');if(liq!=null&&liq<20000)risks.push('liquidity is thin');if(bundlePct!=null&&bundlePct>=15)risks.push(`${bundlePct.toFixed(1)}% of supply is held by tagged bundler wallets`);if(sniperPct!=null&&sniperPct>=15)risks.push(`${sniperPct.toFixed(1)}% of supply is held by tagged sniper wallets`);if(insiderPct!=null&&insiderPct>=8)risks.push(`${insiderPct.toFixed(1)}% of supply is held by tagged insider wallets`);if(devPct!=null&&devPct>=10)risks.push(`${devPct.toFixed(1)}% of supply is held by the creator/dev cohort`);
  const checks=[
    {known:true,weight:10,risk:0},{known:true,weight:12,risk:mintable?55:0},{known:true,weight:12,risk:freezable?75:0},
    {known:top10!=null,weight:16,risk:top10>=70?100:top10>=50?80:top10>=35?55:top10>=20?25:5},
    {known:liq!=null,weight:12,risk:liq<5000?100:liq<20000?75:liq<50000?45:liq<150000?20:5},{known:holders!=null,weight:6,risk:0},{known:security!=null,weight:8,risk:0},
    {known:bundlePct!=null,weight:10,risk:bundlePct>=30?100:bundlePct>=15?70:bundlePct>=5?35:5},{known:sniperPct!=null,weight:6,risk:sniperPct>=30?95:sniperPct>=15?65:sniperPct>=5?30:5},{known:insiderPct!=null,weight:4,risk:insiderPct>=15?100:insiderPct>=8?70:insiderPct>=2?35:5},{known:devPct!=null,weight:4,risk:devPct>=20?100:devPct>=10?70:devPct>=3?30:5}
  ];
  const baseScore=finalize(checks);
  const s=applyHardRiskOverrides(baseScore,{mintable,freezable,top10,bundlePct,devPct});
  const creatorHistory=creator?metric(creator.mintLike?`${creator.mintLike} recent mint/create event${creator.mintLike===1?'':'s'}`:'Creator identified',creator.mintLike>=3?'warn':'good',`The Trenches traced a likely launch signer ${creator.address.slice(0,6)}…${creator.address.slice(-4)}. Helius returned ${creator.recentCount} recent parsed transactions${creator.createdAt?` and the earliest sampled mint activity was ${new Date(creator.createdAt*1000).toLocaleDateString('en-US')}`:''}. This is creator-wallet context, not proof of every prior deployment.`,'Helius launch history'):metric('Could not verify','unknown','The Trenches could not reliably trace a creator wallet from the mint history for this scan.','Trenches Engine');
  return {mint,chain:'solana',name,symbol,decimals,logoUri,logoUris,identitySource,verified,priceUsd,marketCapUsd,...s,
    summary:s.hardRiskOverride?`HIGH RISK override triggered: ${s.hardRiskReasons.join('; ')}. The Trenches completed ${s.checksCompleted}/${s.checksTotal} core checks. The numerical Trenches Risk Score is still shown, but positive checks cannot cancel these severe structural risks.`:risks.length?`The Trenches completed ${s.checksCompleted}/${s.checksTotal} core checks and found ${risks.join(', ')}.`:`The Trenches completed ${s.checksCompleted}/${s.checksTotal} core checks. No major warning was found in the data currently available.`,
    authenticity:metric('Mint confirmed','good','Helius confirmed a valid Solana token mint on-chain.','Helius'),
    sellable:metric(liq!=null?'Market found':'Not simulated',liq!=null?'good':'unknown',liq!=null?'Birdeye returned live market/liquidity data.':'A real swap-route simulation is a later Trenches intelligence layer.',liq!=null?'Birdeye':'Salt'),
    mintAuthority:metric(mintable?'Active':'Revoked',mintable?'warn':'good',mintable?'Mint authority is still active. More supply could be created, increasing dilution risk; this alone does not force HIGH RISK.':'No active mint capability was detected.',security?'Helius + Birdeye':'Helius'),
    freezeAuthority:metric(freezable?'Active':'Revoked',freezable?'bad':'good',freezable?'Token accounts may be freezeable.':'No active freeze capability was detected.',security?'Helius + Birdeye':'Helius'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,statusPct(top10),top10==null?'Holder concentration was unavailable.':`Top 10 token accounts hold about ${top10.toFixed(1)}% of current supply.`,'Helius'),
    owner:cohortMetric(devTag,'Creator / dev',[3,10],'The Trenches checks Birdeye dev labels first, then falls back to the creator wallet traced from Solana launch history.'),
    bundled:cohortMetric(bundlerTag,'Bundler',[5,15],'The Trenches checks Birdeye labels first, then independently checks early trade slots when coverage is missing or reports zero.'),
    snipers:cohortMetric(sniperTag,'Sniper',[5,15],'The Trenches checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    insiders:cohortMetric(insiderTag,'Insider',[2,8],'The Trenches checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    smartTraders:cohortMetric(smartTag,'Smart trader',[101,102],'The Trenches checks Birdeye Holder Profile first, then tagged Top Traders for profitable-wallet participation.'),
    liquidity:metric(liq==null?'Unknown':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return liquidity for this token.':'Add BIRDEYE_API_KEY for market/liquidity intelligence.'):`Current indexed liquidity is about ${money(liq)}.`,liq==null?'Trenches Engine':'Birdeye'),
    holders:metric(holders==null?'Unknown':count(holders),holders==null?'unknown':'good',holders==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return a holder count.':'Add BIRDEYE_API_KEY for indexed holder data.'):'Current indexed holder count.','Birdeye'),
    dexPaid,
    duplicates:duplicateCheck||metric('Could not verify','unknown','The Trenches could not complete the secondary DEX identity search for this token.','Trenches Engine'),
    creatorHistory
  };
}

async function detectEvm(address,pref){
  if(['ethereum','base','bnb','robinhood'].includes(pref))return pref;
  const [eth,base,bnb,robinhood]=await Promise.allSettled([
    evmRpcTry('ethereum','eth_getCode',[address,'latest']),
    evmRpcTry('base','eth_getCode',[address,'latest']),
    evmRpcTry('bnb','eth_getCode',[address,'latest']),
    evmRpcTry('robinhood','eth_getCode',[address,'latest'])
  ]);
  if(eth.status==='fulfilled'&&eth.value&&eth.value!=='0x')return 'ethereum';
  if(base.status==='fulfilled'&&base.value&&base.value!=='0x')return 'base';
  if(bnb.status==='fulfilled'&&bnb.value&&bnb.value!=='0x')return 'bnb';
  if(robinhood.status==='fulfilled'&&robinhood.value&&robinhood.value!=='0x')return 'robinhood';
  throw Object.assign(new Error('No contract was found at that 0x address on Ethereum, Base, BNB Chain, or Robinhood Chain.'),{status:404});
}
async function scanEvm(address,pref){
  const chain=await detectEvm(address,pref),beChain=chain==='bnb'?'bsc':chain==='base'?'base':chain==='robinhood'?'robinhood':'ethereum',chainLabel=chain==='bnb'?'BNB Chain':chain==='base'?'Base':chain==='robinhood'?'Robinhood Chain':'Ethereum';
  const rhAsset=chain==='robinhood'?await robinhoodStockAsset(address):null;
  const [codeR,overviewR,securityR,gpR,dexR,rhPriceR,rhStatsR]=await Promise.allSettled([
    evmRpcTry(chain,'eth_getCode',[address,'latest']),
    birdeye(`/defi/token_overview?address=${encodeURIComponent(address)}&frames=5m,1h,24h`,beChain),
    birdeye(`/defi/token_security?address=${encodeURIComponent(address)}`,beChain),
    goPlusTokenSecurity(address,chain),
    dexEvmOverview(address,chain),
    rhAsset?robinhoodStockPrice(rhAsset):Promise.resolve(null),
    rhAsset?robinhoodUnderlyingStats(String(rhAsset?.tokenSymbol||'')):Promise.resolve(null)
  ]);
  const code=codeR.status==='fulfilled'?codeR.value:null;
  if(!code||code==='0x')throw Object.assign(new Error(`No contract found on ${chainLabel}.`),{status:404});
  const overview=overviewR.status==='fulfilled'?overviewR.value:null,security=securityR.status==='fulfilled'?securityR.value:null,gp=gpR.status==='fulfilled'?gpR.value:null,dex=dexR.status==='fulfilled'?dexR.value:null,rhPrice=rhPriceR.status==='fulfilled'?rhPriceR.value:null,rhStats=rhStatsR.status==='fulfilled'?rhStatsR.value:null;
  const liq=number(field(overview,'liquidity','liquidityUsd','liquidity_usd'))??number(dex?.liquidityUsd);
  const holders=number(field(overview,'holder','holderCount','holder_count','holders'))??number(field(gp,'holder_count','holderCount'));
  const indexedTokenPriceUsd=number(field(overview,'price','priceUsd','price_usd','value'))??number(dex?.priceUsd);
  const indexedTokenMarketCapUsd=number(field(overview,'mc','marketCap','market_cap','marketcap','marketCapUsd','market_cap_usd','fdv'))??number(dex?.marketCapUsd)??number(dex?.fdv);
  const isRobinhoodStockToken=!!rhAsset;
  const priceUsd=isRobinhoodStockToken?(number(rhPrice?.tokenPriceUsd)??indexedTokenPriceUsd):indexedTokenPriceUsd;
  const companyMarketCapUsd=isRobinhoodStockToken?number(rhStats?.marketCapUsd):null;
  const underlyingAumUsd=isRobinhoodStockToken?number(rhStats?.aumUsd):null;
  const marketCapUsd=isRobinhoodStockToken?(companyMarketCapUsd??underlyingAumUsd):indexedTokenMarketCapUsd;
  const tokenizedMarketValueUsd=isRobinhoodStockToken?indexedTokenMarketCapUsd:null;
  const honeypot=securityBool(security,'is_honeypot','honeypot')??gpBool(gp,'is_honeypot');
  const mintable=securityBool(security,'is_mintable','mintable')??gpBool(gp,'is_mintable');
  const proxy=securityBool(security,'is_proxy','proxy')??gpBool(gp,'is_proxy');
  const blacklist=securityBool(security,'is_blacklisted','blacklist')??gpBool(gp,'is_blacklisted');
  const buyTax=number(field(security,'buy_tax','buyTax'))??number(field(gp,'buy_tax','buyTax'));
  const sellTax=number(field(security,'sell_tax','sellTax'))??number(field(gp,'sell_tax','sellTax'));
  const maxTax=Math.max(buyTax??0,sellTax??0);
  const top10=gpTop10(gp);
  const ownerPct=gpPct(field(gp,'owner_percent','ownerPercent'));
  const cannotSell=gpBool(gp,'cannot_sell_all','cannot_sell')===true;
  const sellabilityBad=honeypot===true||cannotSell;
  const checks=[{known:true,weight:15,risk:0},{known:honeypot!=null||cannotSell,weight:20,risk:sellabilityBad?100:0},{known:buyTax!=null||sellTax!=null,weight:15,risk:maxTax>=20?80:maxTax>=10?50:maxTax>=5?20:0},{known:mintable!=null,weight:10,risk:mintable?55:0},{known:proxy!=null,weight:10,risk:proxy?35:0},{known:blacklist!=null,weight:10,risk:blacklist?70:0},{known:liq!=null,weight:10,risk:liq<5000?100:liq<20000?75:liq<50000?45:10},{known:holders!=null,weight:10,risk:0}];
  const baseScore=finalize(checks);const sc=applyHardRiskOverrides(baseScore,{sellabilityBad,mintable,top10,devPct:ownerPct});
  const name=(rhAsset?.tokenName?String(rhAsset.tokenName).replace(/\s*[•·]\s*Robinhood Token\s*$/i,'').trim():null)||field(overview,'name')||field(gp,'token_name','tokenName')||dex?.name||`${chainLabel} token`,symbol=rhAsset?.tokenSymbol||field(overview,'symbol')||field(gp,'token_symbol','tokenSymbol')||dex?.symbol||'TOKEN',decimals=isRobinhoodStockToken?18:(number(field(overview,'decimals','decimal'))??number(field(gp,'decimals'))??18);
  const dexPaid=await dexPaidIntel(chain==='bnb'?'bsc':chain==='base'?'base':chain==='robinhood'?'robinhood':'ethereum',address);
  const marketSource=overview?'Birdeye':dex?'DEX Screener':'Trenches Engine';
  const securitySource=security?'Birdeye':gp?'GoPlus':'Trenches Engine';
  const logoUri=rhAsset?.logoUrl||dex?.imageUrl||field(overview,'logoURI','logo_uri','logo');
  const marketCapLabel=isRobinhoodStockToken?(companyMarketCapUsd!=null?'Company Market Cap':underlyingAumUsd!=null?'Underlying AUM':'Company Market Cap'):'Market Cap';
  return {mint:address,chain,name,symbol,decimals,logoUri,logoUris:[logoUri].filter(Boolean),verified:isRobinhoodStockToken,priceUsd,marketCapUsd,marketCapLabel,assetType:isRobinhoodStockToken?'robinhood_stock_token':'crypto_token',tokenizedMarketValueUsd,underlyingPriceUsd:number(rhPrice?.rawUnderlyingPriceUsd),stockTokenMultiplier:number(rhPrice?.multiplier),robinhoodAssetStatus:rhAsset?.status||null,...sc,summary:sc.hardRiskOverride?`HIGH RISK override triggered: ${sc.hardRiskReasons.join('; ')}. The Trenches confirmed the contract on ${chainLabel}. The numerical Trenches Risk Score is still shown, but positive checks cannot cancel these severe safety risks.`:`The Trenches confirmed the contract on ${chainLabel} and completed ${sc.checksCompleted}/${sc.checksTotal} core checks. Market data can fall back to DEX Screener and contract security can fall back to GoPlus when Birdeye is unavailable.`,
    authenticity:metric('Contract confirmed','good',`Deployed bytecode exists on ${chainLabel}.`,'EVM RPC'),
    sellable:metric(honeypot==null&&!cannotSell?'Could not verify':sellabilityBad?'Possible sell restriction':'No sell block detected',honeypot==null&&!cannotSell?'unknown':sellabilityBad?'bad':'good',cannotSell?'GoPlus reports a sell restriction.':honeypot===true?'A honeypot flag was returned.':'No current sell-block/honeypot signal was returned by the available security providers.',securitySource),
    honeypot:metric(honeypot==null?'Could not verify':honeypot?'Detected':'Not detected',honeypot==null?'unknown':honeypot?'bad':'good','Current token-security honeypot signal.',securitySource),
    taxes:metric(buyTax!=null||sellTax!=null?`${buyTax??'?'}% buy / ${sellTax??'?'}% sell`:'Could not verify',buyTax==null&&sellTax==null?'unknown':maxTax>=20?'bad':maxTax>=8?'warn':'good','Current token tax data from the available security provider.',securitySource),
    mintAuthority:metric(mintable==null?'Could not verify':mintable?'Mintable':'Not mintable',mintable==null?'unknown':mintable?'warn':'good',mintable?'Mint capability is active. This is a dilution warning, but does not force HIGH RISK by itself.':'No mint capability was detected by the available security provider.',securitySource),
    ownerControl:metric(blacklist==null?'Could not verify':blacklist?'Blacklist control':'No blacklist flag',blacklist==null?'unknown':blacklist?'warn':'good','Owner/control blacklist risk signal.',securitySource),
    proxyRisk:metric(proxy==null?'Could not verify':proxy?'Upgradeable / proxy':'No proxy flag',proxy==null?'unknown':proxy?'warn':'good','Proxy/upgradeability signal.',securitySource),
    top10:metric(top10==null?'Could not verify':`${top10.toFixed(1)}%`,top10==null?'unknown':statusPct(top10),top10==null?'Holder concentration was not available from the current providers.':`Top 10 indexed holders account for about ${top10.toFixed(1)}% of supply.`,'GoPlus'),
    owner:metric(ownerPct==null?'Could not verify':`${ownerPct.toFixed(1)}%`,ownerPct==null?'unknown':ownerPct<5?'good':ownerPct<15?'warn':'bad',ownerPct==null?'Owner share was not returned.':`Indexed contract owner/deployer share is about ${ownerPct.toFixed(1)}%.`,'GoPlus'),
    bundled:metric('Could not verify','unknown','EVM linked-wallet bundle analysis is not yet implemented.','Trenches Engine'),snipers:metric('Could not verify','unknown','EVM launch-sniper analysis is not yet implemented.','Trenches Engine'),
    liquidity:metric(liq==null?'Could not verify':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?'No current liquidity figure was returned by Birdeye or DEX Screener.':`Current indexed liquidity is about ${money(liq)}.` ,marketSource),
    holders:metric(holders==null?'Could not verify':count(holders),holders==null?'unknown':'good','Current indexed holder count.',holders==null?'Trenches Engine':overview?'Birdeye':'GoPlus'),dexPaid,
    duplicates:metric('Needs identity graph','unknown','Official contract matching is a later Trenches intelligence layer.','Trenches Engine'),creatorHistory:metric('Needs history','unknown','Deployer history is a later Trenches intelligence layer.','Trenches Engine')};
}


const SCAN_CHART_NETWORKS={
  solana:{dex:'solana',gecko:'solana',birdeye:'solana'},
  ethereum:{dex:'ethereum',gecko:'eth',birdeye:'ethereum'},
  base:{dex:'base',gecko:'base',birdeye:'base'},
  bnb:{dex:'bsc',gecko:'bsc',birdeye:'bsc'},
  robinhood:{dex:'robinhood',gecko:null,birdeye:'robinhood'}
};
const SCAN_CHART_RANGES={
  '1d':{seconds:24*60*60,birdeyeType:'5m',geckoTimeframe:'minute',geckoAggregate:15,geckoLimit:96},
  '1w':{seconds:7*24*60*60,birdeyeType:'1H',geckoTimeframe:'hour',geckoAggregate:4,geckoLimit:42},
  '1m':{seconds:30*24*60*60,birdeyeType:'1H',geckoTimeframe:'hour',geckoAggregate:12,geckoLimit:60},
  '3m':{seconds:90*24*60*60,birdeyeType:'1D',geckoTimeframe:'day',geckoAggregate:1,geckoLimit:90},
  '1y':{seconds:365*24*60*60,birdeyeType:'1D',geckoTimeframe:'day',geckoAggregate:1,geckoLimit:100}
};
function normalizeScanChartRows(rows){
  return (Array.isArray(rows)?rows:[]).map(x=>{
    if(Array.isArray(x)){
      const a=x.slice(0,6).map(Number);return a.length===6&&a.every(Number.isFinite)?a:null
    }
    const t=number(x?.unixTime??x?.unix_time??x?.time??x?.timestamp),
      o=number(x?.o??x?.open),h=number(x?.h??x?.high),l=number(x?.l??x?.low),
      c=number(x?.c??x?.close),v=number(x?.v??x?.volume??x?.volumeUsd??x?.volume_usd)??0;
    return [t,o,h,l,c,v].every(Number.isFinite)?[t,o,h,l,c,v]:null
  }).filter(Boolean).sort((a,b)=>a[0]-b[0])
}
async function resolveScanChartPair(mint,chain){
  const cfg=SCAN_CHART_NETWORKS[chain];if(!cfg)return null;
  try{
    const rows=await fetchJson(`https://api.dexscreener.com/token-pairs/v1/${cfg.dex}/${encodeURIComponent(mint)}`,{headers:{accept:'application/json'}},9000),
      pairs=Array.isArray(rows)?rows:[],target=String(mint).toLowerCase();
    const candidates=pairs.filter(p=>{
      const b=String(p?.baseToken?.address||'').toLowerCase(),q=String(p?.quoteToken?.address||'').toLowerCase();
      return b===target||q===target
    }).sort((a,b)=>(number(b?.liquidity?.usd)||0)-(number(a?.liquidity?.usd)||0));
    const pair=candidates[0]||pairs[0];if(!pair)return null;
    const side=String(pair?.baseToken?.address||'').toLowerCase()===target?'base':'quote';
    return{
      pairAddress:String(pair?.pairAddress||''),dexId:String(pair?.dexId||''),side,
      priceUsd:number(pair?.priceUsd),change24h:number(pair?.priceChange?.h24),
      volume24h:number(pair?.volume?.h24),liquidityUsd:number(pair?.liquidity?.usd),
      marketCap:number(pair?.marketCap)??number(pair?.fdv),pairUrl:String(pair?.url||'')
    }
  }catch(e){console.warn('Scan chart pair resolve:',chain,errorText(e));return null}
}
async function birdeyeScanChart(mint,chain,rc){
  const key=process.env.BIRDEYE_API_KEY,cfg=SCAN_CHART_NETWORKS[chain];
  if(!key||!cfg?.birdeye)return[];
  const now=Math.floor(Date.now()/1000),from=now-rc.seconds;
  const headers={accept:'application/json','X-API-KEY':key,'x-chain':cfg.birdeye};
  const common=new URLSearchParams({
    address:mint,type:rc.birdeyeType,currency:'usd',
    time_from:String(from),time_to:String(now)
  });
  // V3 is primary. Legacy remains a compatibility fallback.
  for(const path of [
    `/defi/v3/ohlcv?${common.toString()}&mode=range&padding=false&outlier=true`,
    `/defi/ohlcv?${common.toString()}`
  ]){
    try{
      const j=await fetchJson(`${BIRDEYE_BASE}${path}`,{headers},12000),
        data=j?.data??j,
        rows=normalizeScanChartRows(data?.items??data?.list??data?.rows??data);
      if(rows.length>=2)return rows
    }catch(e){console.warn('Birdeye scan chart:',chain,rc.birdeyeType,errorText(e))}
  }
  return[]
}
async function resolveGeckoChartPool(mint,chain,pair){
  const cfg=SCAN_CHART_NETWORKS[chain];if(!cfg?.gecko)return null;
  try{
    const j=await fetchJson(
      `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(cfg.gecko)}/tokens/${encodeURIComponent(mint)}/pools?page=1`,
      {headers:{accept:'application/json;version=20230203','user-agent':'The-Trenches/1.10.99'}},10000
    );
    const rows=Array.isArray(j?.data)?j.data:[],target=String(mint).toLowerCase();
    const best=rows.sort((a,b)=>(number(b?.attributes?.reserve_in_usd)||0)-(number(a?.attributes?.reserve_in_usd)||0))[0];
    if(best){
      const baseId=String(best?.relationships?.base_token?.data?.id||'').toLowerCase(),
        side=baseId.endsWith('_'+target)||baseId===target?'base':'quote';
      return{poolAddress:String(best?.attributes?.address||''),side}
    }
  }catch(e){console.warn('Gecko token-pool resolve:',chain,errorText(e))}
  // Last fallback: the DEX Screener pair may also be indexed by Gecko.
  return pair?.pairAddress?{poolAddress:pair.pairAddress,side:pair.side||'base'}:null
}
async function geckoScanChart(mint,chain,rc,pair){
  const cfg=SCAN_CHART_NETWORKS[chain];if(!cfg?.gecko)return[];
  const resolved=await resolveGeckoChartPool(mint,chain,pair);
  if(!resolved?.poolAddress)return[];
  try{
    const q=new URLSearchParams({
      aggregate:String(rc.geckoAggregate),limit:String(Math.min(100,rc.geckoLimit)),
      currency:'usd',token:resolved.side
    });
    const j=await fetchJson(
      `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(cfg.gecko)}/pools/${encodeURIComponent(resolved.poolAddress)}/ohlcv/${encodeURIComponent(rc.geckoTimeframe)}?${q.toString()}`,
      {headers:{accept:'application/json;version=20230203','user-agent':'The-Trenches/1.10.99'}},10000
    );
    return normalizeScanChartRows(j?.data?.attributes?.ohlcv_list)
  }catch(e){console.warn('Gecko scan chart:',chain,errorText(e));return[]}
}
async function scanChartHandler(req,res){
  res.setHeader('Cache-Control','public, max-age=15, s-maxage=25');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const mint=String(req.query.mint||'').trim(),chain=String(req.query.chain||'').toLowerCase(),
      range=String(req.query.range||'1d').toLowerCase(),cfg=SCAN_CHART_NETWORKS[chain],rc=SCAN_CHART_RANGES[range];
    if(!mint||!cfg)return res.status(400).json({error:'Valid scanned token and chain are required.'});
    if(!rc)return res.status(400).json({error:'Unsupported chart timeframe.'});

    const pair=await resolveScanChartPair(mint,chain),
      dexUrl=pair?.pairUrl||(pair?.pairAddress?`https://dexscreener.com/${encodeURIComponent(cfg.dex)}/${encodeURIComponent(pair.pairAddress)}`:'');

    // Token-level Birdeye history avoids the exact bug in V1.10.98:
    // a DEX Screener pool address was being handed to GeckoTerminal even
    // when Gecko did not index that same pool ID.
    let candles=await birdeyeScanChart(mint,chain,rc),source='';
    if(candles.length>=2)source='Birdeye token history';
    else{
      candles=await geckoScanChart(mint,chain,rc,pair);
      if(candles.length>=2)source='GeckoTerminal token-pool history'
    }

    const cutoff=Math.floor(Date.now()/1000)-rc.seconds;
    const inWindow=candles.filter(x=>x[0]>=cutoff);
    if(inWindow.length>=2)candles=inWindow;

    return res.status(200).json({
      mint,chain,range,candles,pair,
      source:source||(pair?'DEX Screener live market':'No indexed market'),
      dexUrl,
      message:candles.length<2
        ?(process.env.BIRDEYE_API_KEY
          ?'The historical providers did not return enough points for this token/range.'
          :'Add BIRDEYE_API_KEY for the most reliable token-level price history; GeckoTerminal fallback was also checked.')
        :''
    })
  }catch(e){
    console.error('Trenches scan chart:',e);
    return res.status(Number(e?.status)||500).json({error:errorText(e)})
  }
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
    else throw Object.assign(new Error('Paste a valid Solana mint or 0x Ethereum / Base / BNB Chain / Robinhood Chain contract address.'),{status:400});
    return res.status(200).json(result);
  }catch(e){console.error('Salt scan error',e);const message=errorText(e?.message??e);return res.status(Number(e?.status)||500).json({error:message||'Trenches scanner failed.'});}
};



function jupiterKey(){const key=process.env.JUPITER_API_KEY;if(!key){const e=new Error('Jupiter is not configured yet. Add JUPITER_API_KEY in Vercel Environment Variables, then redeploy.');e.status=503;throw e}return key}
function validSolAddress(v){return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(v||''))}
function validPositiveInteger(v){return /^\d+$/.test(String(v||''))&&BigInt(String(v))>0n}
function normalizePriceImpact(order){const direct=number(field(order,'priceImpact'));if(direct!=null)return direct;const pct=number(field(order,'priceImpactPct'));if(pct==null)return null;return Math.abs(pct)<=1?pct*100:pct}
async function getJupiterOrder({inputMint=SOL_MINT,outputMint,amount,taker}){
  const key=jupiterKey();
  if(!validSolAddress(inputMint))throw Object.assign(new Error('Invalid Solana input mint.'),{status:400});
  if(!validSolAddress(outputMint))throw Object.assign(new Error('Invalid Solana output mint.'),{status:400});
  if(String(inputMint)===String(outputMint))throw Object.assign(new Error('Choose two different tokens to swap.'),{status:400});
  if(!validPositiveInteger(amount))throw Object.assign(new Error('Swap amount must be a positive integer in lamports.'),{status:400});
  if(taker&&!validSolAddress(taker))throw Object.assign(new Error('Invalid Solana wallet address.'),{status:400});
  const params=new URLSearchParams({inputMint:String(inputMint),outputMint:String(outputMint),amount:String(amount)});if(taker)params.set('taker',String(taker));
  const order=await fetchJson(`${JUPITER_BASE}/order?${params.toString()}`,{headers:{accept:'application/json','x-api-key':key}},12000);
  if(!order?.outAmount||String(order.outAmount)==='0')throw Object.assign(new Error(order?.errorMessage||'Jupiter could not find a live route for this amount.'),{status:422});
  return {
    inputMint:field(order,'inputMint')||String(inputMint),outputMint:field(order,'outputMint')||String(outputMint),
    inAmount:String(field(order,'inAmount')||amount),outAmount:String(order.outAmount),
    transaction:taker?(order.transaction??null):null,requestId:order.requestId||null,
    router:order.router||'Jupiter',mode:order.mode||'ultra',feeBps:number(order.feeBps),feeMint:order.feeMint||null,
    priceImpactPct:normalizePriceImpact(order),otherAmountThreshold:order.otherAmountThreshold?String(order.otherAmountThreshold):null,
    slippageBps:number(order.slippageBps),expireAt:order.expireAt||null,lastValidBlockHeight:order.lastValidBlockHeight||null,
    errorCode:order.errorCode??null,errorMessage:order.errorMessage||null,quotedAt:Date.now()
  };
}
async function quoteHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{const inputMint=String(req.query.inputMint||SOL_MINT).trim(),outputMint=String(req.query.outputMint||'').trim(),amount=String(req.query.amount||'').trim(),taker=String(req.query.taker||'').trim()||null;const order=await getJupiterOrder({inputMint,outputMint,amount,taker});return res.status(200).json(order)}catch(e){console.error('Salt quote error',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function executeHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const key=jupiterKey(),body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),signedTransaction=String(body.signedTransaction||''),requestId=String(body.requestId||'');
    if(!signedTransaction||!requestId)return res.status(400).json({error:'Missing signedTransaction or requestId.'});
    const result=await fetchJson(`${JUPITER_BASE}/execute`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','x-api-key':key},body:JSON.stringify({signedTransaction,requestId,...(body.lastValidBlockHeight?{lastValidBlockHeight:String(body.lastValidBlockHeight)}:{})})},30000);
    return res.status(200).json(result);
  }catch(e){console.error('Salt execute error',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}


function normalizeTokenIcon(uri){const s=String(uri||'').trim();if(!s)return null;if(s.startsWith('ipfs://'))return `https://ipfs.io/ipfs/${s.slice(7).replace(/^ipfs\//,'')}`;if(s.startsWith('ar://'))return `https://arweave.net/${s.slice(5)}`;if(/^https?:\/\//i.test(s)||s.startsWith('data:image/'))return s;return null}
function heliusAssetImage(asset){const links=asset?.content?.links||{},files=Array.isArray(asset?.content?.files)?asset.content.files:[];const direct=normalizeTokenIcon(links.image)||normalizeTokenIcon(files.find(x=>String(x?.mime||x?.mimeType||'').startsWith('image/'))?.uri)||normalizeTokenIcon(files[0]?.uri);return direct||null}
function tokenShape(t){return{id:String(t?.id||''),name:String(t?.name||'Unknown token'),symbol:String(t?.symbol||'TOKEN'),icon:normalizeTokenIcon(t?.icon),decimals:number(t?.decimals)??0,isVerified:Boolean(t?.isVerified),organicScore:number(t?.organicScore),usdPrice:number(t?.usdPrice),holderCount:number(t?.holderCount),mcap:number(t?.mcap)}}
async function heliusIconFallback(list){const missing=list.filter(x=>x?.id&&!x.icon).slice(0,50),key=process.env.HELIUS_API_KEY;if(!missing.length||!key)return;try{const j=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'salt-token-icons',method:'getAssetBatch',params:{ids:missing.map(x=>x.id)}})},10000),assets=Array.isArray(j?.result)?j.result:[];for(let i=0;i<missing.length;i++){const asset=assets[i];let img=heliusAssetImage(asset);if(!img){const metaUri=normalizeTokenIcon(asset?.content?.json_uri)||String(asset?.content?.json_uri||'').trim();if(metaUri&&/^https?:\/\//i.test(metaUri)){try{const meta=await fetchJson(metaUri,{headers:{accept:'application/json'}},4500);img=normalizeTokenIcon(meta?.image||meta?.image_uri||meta?.imageUrl)}catch{}}}if(img)missing[i].icon=img}}catch(e){console.warn('Helius token icon fallback:',errorText(e))}}
async function dexIconFallback(list){const missing=list.filter(x=>x?.id&&!x.icon).slice(0,30);if(!missing.length)return;try{const ds=await fetchJson(`https://api.dexscreener.com/tokens/v1/solana/${missing.map(x=>encodeURIComponent(x.id)).join(',')}`,{headers:{accept:'application/json'}},8000);for(const row of missing){const pairs=(Array.isArray(ds)?ds:[]).filter(x=>String(x?.baseToken?.address||'')===row.id||String(x?.quoteToken?.address||'')===row.id).sort((a,b)=>(Number(b?.liquidity?.usd)||0)-(Number(a?.liquidity?.usd)||0));const img=normalizeTokenIcon(pairs.find(x=>x?.info?.imageUrl)?.info?.imageUrl);if(img)row.icon=img}}catch(e){console.warn('DexScreener icon fallback:',errorText(e))}}
async function pumpIconFallback(list){const missing=list.filter(x=>x?.id&&!x.icon&&String(x.id).toLowerCase().endsWith('pump')).slice(0,12);if(!missing.length)return;await Promise.allSettled(missing.map(async row=>{try{const j=await fetchJson(`https://frontend-api-v3.pump.fun/coins-v2/${encodeURIComponent(row.id)}`,{headers:{accept:'application/json'}},5000),d=j?.data??j,img=normalizeTokenIcon(d?.image_uri||d?.imageUri||d?.image);if(img)row.icon=img}catch{}}))}
async function enrichSolIcons(rows){const list=(rows||[]).filter(x=>x?.id);if(!list.length)return rows;for(const row of list)row.icon=normalizeTokenIcon(row.icon);await heliusIconFallback(list);await dexIconFallback(list);await pumpIconFallback(list);return rows}

function tokenIconVariants(uri){
  const normalized=normalizeTokenIcon(uri);if(!normalized)return[];
  const out=[normalized],seen=new Set(out),add=u=>{u=normalizeTokenIcon(u);if(u&&!seen.has(u)){seen.add(u);out.push(u)}};
  let cidPath='';
  if(String(uri||'').startsWith('ipfs://'))cidPath=String(uri).slice(7).replace(/^ipfs\//,'');
  else {const m=normalized.match(/\/ipfs\/([^?#]+)/i);if(m)cidPath=m[1]}
  if(cidPath){add(`https://ipfs.io/ipfs/${cidPath}`);add(`https://dweb.link/ipfs/${cidPath}`);add(`https://cloudflare-ipfs.com/ipfs/${cidPath}`)}
  return out
}
function heliusAssetImageCandidates(asset){
  const links=asset?.content?.links||{},files=Array.isArray(asset?.content?.files)?asset.content.files:[],out=[];
  const add=u=>{for(const v of tokenIconVariants(u))if(!out.includes(v))out.push(v)};
  add(links.image);for(const f of files){if(String(f?.mime||f?.mimeType||'').startsWith('image/')||looksLikeImage(f?.uri,f?.mime||f?.mimeType))add(f?.uri)}
  return out
}
async function holdingHeliusImageMap(mints){
  const out=new Map(),key=process.env.HELIUS_API_KEY;if(!key||!mints.length)return out;
  try{
    const j=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'trenches-holding-art',method:'getAssetBatch',params:{ids:mints}})},10000),assets=Array.isArray(j?.result)?j.result:[];
    for(const asset of assets){const id=String(asset?.id||'');if(!id)continue;const urls=heliusAssetImageCandidates(asset);if(urls.length)out.set(id,urls)}
    const metadataJobs=assets.filter(a=>a?.id&&!out.get(String(a.id))?.length).slice(0,12).map(async asset=>{
      const id=String(asset.id),metaUri=normalizeMediaUri(asset?.content?.json_uri||asset?.content?.jsonUri||asset?.content?.metadata?.uri);if(!metaUri||!/^https?:\/\//i.test(metaUri))return;
      try{const meta=await fetchJson(metaUri,{headers:{accept:'application/json'}},4500),urls=[];const add=u=>{for(const v of tokenIconVariants(u))if(!urls.includes(v))urls.push(v)};add(meta?.image||meta?.image_uri||meta?.imageUrl||meta?.image_url);if(Array.isArray(meta?.properties?.files))for(const f of meta.properties.files){if(looksLikeImage(f?.uri,f?.type||f?.mime))add(f?.uri)}if(urls.length)out.set(id,urls)}catch{}
    });
    await Promise.allSettled(metadataJobs)
  }catch(e){console.warn('Helius holdings artwork:',errorText(e))}
  return out
}
async function holdingJupiterImageMap(mints){
  const out=new Map();if(!mints.length)return out;
  try{
    for(let i=0;i<mints.length;i+=8){const chunk=mints.slice(i,i+8),arr=await jupiterTokens('/search?query='+encodeURIComponent(chunk.join(','))).catch(()=>[]);for(const t of (Array.isArray(arr)?arr:[])){const id=String(t?.id||'');if(!chunk.includes(id))continue;const urls=tokenIconVariants(t?.icon);if(urls.length)out.set(id,urls)}}
    const missing=mints.filter(id=>!out.has(id)).slice(0,10);
    await Promise.allSettled(missing.map(async id=>{const arr=await jupiterTokens('/search?query='+encodeURIComponent(id)).catch(()=>[]),hit=(Array.isArray(arr)?arr:[]).find(t=>String(t?.id||'')===id),urls=tokenIconVariants(hit?.icon);if(urls.length)out.set(id,urls)}))
  }catch(e){console.warn('Jupiter holdings artwork:',errorText(e))}
  return out
}
async function holdingDexImageMap(mints){
  const out=new Map();if(!mints.length)return out;
  try{const ds=await fetchJson(`https://api.dexscreener.com/tokens/v1/solana/${mints.map(x=>encodeURIComponent(x)).join(',')}`,{headers:{accept:'application/json'}},8000);for(const id of mints){const pairs=(Array.isArray(ds)?ds:[]).filter(x=>String(x?.baseToken?.address||'')===id||String(x?.quoteToken?.address||'')===id).sort((a,b)=>(Number(b?.liquidity?.usd)||0)-(Number(a?.liquidity?.usd)||0)),urls=[];for(const pair of pairs){for(const v of tokenIconVariants(pair?.info?.imageUrl))if(!urls.includes(v))urls.push(v)}if(urls.length)out.set(id,urls)}}catch(e){console.warn('DexScreener holdings artwork:',errorText(e))}
  return out
}
async function holdingPumpImageMap(mints){
  const out=new Map(),pump=mints.filter(x=>String(x).toLowerCase().endsWith('pump')).slice(0,12);await Promise.allSettled(pump.map(async id=>{try{const j=await fetchJson(`https://frontend-api-v3.pump.fun/coins-v2/${encodeURIComponent(id)}`,{headers:{accept:'application/json'}},5000),d=j?.data??j,urls=tokenIconVariants(d?.image_uri||d?.imageUri||d?.image);if(urls.length)out.set(id,urls)}catch{}}));return out
}
async function enrichHoldingImages(rows){
  const target=(rows||[]).filter(x=>x?.mint&&x.mint!=='SOL').slice(0,30),mints=[...new Set(target.map(x=>String(x.mint)))];if(!mints.length)return rows;
  const [helius,jupiter,dex,pump]=await Promise.all([holdingHeliusImageMap(mints),holdingJupiterImageMap(mints),holdingDexImageMap(mints),holdingPumpImageMap(mints)]);
  for(const row of (rows||[])){
    const id=String(row?.mint||'');if(!id||id==='SOL')continue;const candidates=[],add=u=>{for(const v of tokenIconVariants(u))if(!candidates.includes(v))candidates.push(v)},addAll=a=>{for(const u of (a||[]))add(u)};
    addAll(helius.get(id));addAll(jupiter.get(id));addAll(dex.get(id));addAll(pump.get(id));add(row.image);
    // Trust Wallet's public asset repo is a final real-logo attempt before the UI falls back to initials.
    add(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/${encodeURIComponent(id)}/logo.png`);
    row.image=candidates[0]||null;row.imageFallbacks=candidates.slice(1)
  }
  return rows
}
async function jupiterTokens(path){const key=jupiterKey();return fetchJson(`${JUPITER_TOKENS_BASE}${path}`,{headers:{accept:'application/json','x-api-key':key}},10000)}

let trendingMarketCache={at:0,items:[]};
function trendingSupportedChain(chainId){
  const c=String(chainId||'').toLowerCase();
  if(c==='solana')return 'solana';
  if(c==='ethereum')return 'ethereum';
  if(c==='base')return 'base';
  if(c==='bsc'||c==='bnb')return 'bnb';
  if(c==='robinhood')return 'robinhood';
  return null
}
function trendingDexChain(chain){
  return chain==='bnb'?'bsc':chain
}
function trendingBestPair(pairs,address){
  const target=String(address||'').toLowerCase();
  return (Array.isArray(pairs)?pairs:[]).filter(p=>String(p?.baseToken?.address||'').toLowerCase()===target)
    .sort((a,b)=>(number(b?.liquidity?.usd)||0)-(number(a?.liquidity?.usd)||0))[0]||null
}
function trendingPairRow(pair,seed={}){
  if(!pair)return null;
  const chain=trendingSupportedChain(pair?.chainId)||seed.chain,address=String(pair?.baseToken?.address||seed.address||''),boost=Number(seed.boost||0),vol=number(pair?.volume?.h24)||0,liq=number(pair?.liquidity?.usd)||0,tx=Number(pair?.txns?.h24?.buys||0)+Number(pair?.txns?.h24?.sells||0),h1=Math.abs(number(pair?.priceChange?.h1)||0),h24=Math.abs(number(pair?.priceChange?.h24)||0);
  const heat=Math.max(0,Math.min(100,Math.round(
    16 + Math.min(24,Math.log10(Math.max(1,vol))*3.2) + Math.min(18,Math.log10(Math.max(1,liq))*2.2) +
    Math.min(18,Math.log10(Math.max(1,tx))*5) + Math.min(12,h1*.35) + Math.min(7,h24*.08) + Math.min(12,Math.log10(Math.max(1,boost+1))*7)
  )));
  return{
    chain,address,
    name:String(pair?.baseToken?.name||seed.name||'Unknown token').slice(0,80),
    symbol:String(pair?.baseToken?.symbol||seed.symbol||'TOKEN').slice(0,24),
    image:normalizeTokenIcon(pair?.info?.imageUrl)||normalizeTokenIcon(seed.image)||'',
    priceUsd:number(pair?.priceUsd),change5m:number(pair?.priceChange?.m5),change1h:number(pair?.priceChange?.h1),change6h:number(pair?.priceChange?.h6),change24h:number(pair?.priceChange?.h24),
    volume24h:vol,liquidityUsd:liq,marketCap:number(pair?.marketCap)??number(pair?.fdv),fdv:number(pair?.fdv),
    buys24h:Number(pair?.txns?.h24?.buys||0),sells24h:Number(pair?.txns?.h24?.sells||0),
    pairCreatedAt:number(pair?.pairCreatedAt),pairAddress:String(pair?.pairAddress||''),dexId:String(pair?.dexId||''),
    boosted:boost>0,boost,heat,
    source:seed.jupiter?'Jupiter + DEX Screener':'DEX Screener'
  }
}
async function trendingPairBatch(chain,addresses){
  const dsChain=trendingDexChain(chain),out=new Map(),uniq=[...new Set(addresses.filter(Boolean))].slice(0,30);
  if(!uniq.length)return out;
  try{
    const rows=await fetchJson(`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(dsChain)}/${uniq.map(x=>encodeURIComponent(x)).join(',')}`,{headers:{accept:'application/json'}},10000);
    for(const address of uniq){const pair=trendingBestPair(rows,address);if(pair)out.set(String(address).toLowerCase(),pair)}
  }catch(e){console.warn('Trending DexScreener batch:',chain,errorText(e))}
  return out
}

const GECKO_TRENDING_NETWORKS={
  solana:{network:'solana',chain:'solana'},
  ethereum:{network:'eth',chain:'ethereum'},
  base:{network:'base',chain:'base'},
  bnb:{network:'bsc',chain:'bnb'}
};
async function geckoTerminalTrendingRows(network,chain){
  const headers={
    accept:'application/json;version=20230203',
    'user-agent':'The-Trenches/1.10.96'
  };
  const url=`https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/trending_pools?include=base_token&page=1&duration=24h`;
  try{
    const j=await fetchJson(url,{headers},10000),included=new Map();
    for(const item of (Array.isArray(j?.included)?j.included:[])){
      if(item?.id)included.set(String(item.id),item)
    }
    const rows=[];
    for(const pool of (Array.isArray(j?.data)?j.data:[])){
      const a=pool?.attributes||{},baseId=pool?.relationships?.base_token?.data?.id,
        token=included.get(String(baseId||''))?.attributes||{},
        address=String(token?.address||'').trim();
      if(!address)continue;
      const h1=number(a?.price_change_percentage?.h1),
        h24=number(a?.price_change_percentage?.h24),
        vol=number(a?.volume_usd?.h24)||0,
        liq=number(a?.reserve_in_usd)||0,
        txh=a?.transactions?.h24||{},
        buys=Number(txh?.buys||0),sells=Number(txh?.sells||0),tx=buys+sells,
        mcap=number(a?.market_cap_usd),
        fdv=number(a?.fdv_usd),
        ageMs=a?.pool_created_at?Date.parse(a.pool_created_at):null;
      // Organic heat rewards actual activity/momentum. Unlike the old
      // boost-only discovery, no paid boost is required to enter this set.
      const positiveMomentum=Math.max(0,Number(h1)||0)*.28+Math.max(0,Number(h24)||0)*.055;
      const heat=Math.max(0,Math.min(100,Math.round(
        14 +
        Math.min(27,Math.log10(Math.max(1,vol))*3.5) +
        Math.min(21,Math.log10(Math.max(1,liq))*2.4) +
        Math.min(18,Math.log10(Math.max(1,tx))*5.0) +
        Math.min(20,positiveMomentum)
      )));
      rows.push({
        chain,address,
        name:String(token?.name||String(a?.name||'').split('/')[0]||'Unknown token').trim().slice(0,80),
        symbol:String(token?.symbol||'TOKEN').trim().slice(0,24),
        image:normalizeTokenIcon(token?.image_url)||'',
        priceUsd:number(a?.base_token_price_usd),
        change5m:number(a?.price_change_percentage?.m5),
        change1h:h1,
        change6h:number(a?.price_change_percentage?.h6),
        change24h:h24,
        volume24h:vol,
        liquidityUsd:liq,
        marketCap:mcap??fdv,
        fdv,
        buys24h:buys,
        sells24h:sells,
        pairCreatedAt:Number.isFinite(ageMs)?ageMs:null,
        pairAddress:String(a?.address||''),
        dexId:String(pool?.relationships?.dex?.data?.id||''),
        boosted:false,
        boost:0,
        heat,
        source:'GeckoTerminal organic trending'
      })
    }
    return rows
  }catch(e){
    console.warn('GeckoTerminal trending:',network,errorText(e));
    return[]
  }
}
async function organicMultiChainTrending(){
  const entries=await Promise.all(Object.values(GECKO_TRENDING_NETWORKS).map(async x=>[
    x.chain,
    await geckoTerminalTrendingRows(x.network,x.chain)
  ]));
  return Object.fromEntries(entries)
}

async function trendingMarketHandler(req,res){
  res.setHeader('Cache-Control','public, max-age=20, s-maxage=45');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const force=String(req.query.refresh||'')==='1';
    if(!force&&Date.now()-trendingMarketCache.at<25000&&trendingMarketCache.items.length){
      return res.status(200).json({
        items:trendingMarketCache.items,cached:true,
        updatedAt:new Date(trendingMarketCache.at).toISOString(),
        discovery:trendingMarketCache.discovery||{}
      })
    }

    // 1) Organic network-wide trending pools. This is the core fix for
    // Ethereum / Base / BNB runner coverage.
    const organic=await organicMultiChainTrending();

    // 2) Existing promotional/attention signals from DEX Screener remain
    // useful as an extra source, but they are no longer the only EVM seed.
    const seedMap=new Map(),put=s=>{
      if(!s?.chain||!s?.address)return;
      const k=`${s.chain}:${String(s.address).toLowerCase()}`,old=seedMap.get(k)||{};
      seedMap.set(k,{
        ...old,...s,
        boost:Math.max(Number(old.boost||0),Number(s.boost||0)),
        jupiter:Boolean(old.jupiter||s.jupiter)
      })
    };

    const [boostTop,boostLatest]=await Promise.all([
      fetchJson('https://api.dexscreener.com/token-boosts/top/v1',{headers:{accept:'application/json'}},8000).catch(()=>[]),
      fetchJson('https://api.dexscreener.com/token-boosts/latest/v1',{headers:{accept:'application/json'}},8000).catch(()=>[])
    ]);
    for(const row of [...(Array.isArray(boostTop)?boostTop:[]),...(Array.isArray(boostLatest)?boostLatest:[])]){
      const chain=trendingSupportedChain(row?.chainId);if(!chain)continue;
      put({
        chain,address:String(row?.tokenAddress||''),image:row?.icon||'',
        boost:Number(row?.totalAmount||row?.amount||0),boosted:true
      })
    }

    // 3) Jupiter remains an additional organic Solana signal.
    try{
      const arr=await jupiterTokens('/toptrending/1h?limit=30');
      for(const t of (Array.isArray(arr)?arr:[])){
        const x=tokenShape(t);if(!x.id)continue;
        put({chain:'solana',address:x.id,name:x.name,symbol:x.symbol,image:x.icon,jupiter:true,boost:0})
      }
    }catch(e){console.warn('Trending Jupiter:',errorText(e))}

    // Enrich DEX Screener/Jupiter seeds.
    const seeds=[...seedMap.values()].slice(0,120),
      groups={solana:[],ethereum:[],base:[],bnb:[],robinhood:[]};
    for(const s of seeds)groups[s.chain]?.push(s.address);
    const batchEntries=await Promise.all(
      Object.entries(groups).map(async([chain,addresses])=>[
        chain,await trendingPairBatch(chain,addresses)
      ])
    );
    const pairMaps=Object.fromEntries(batchEntries),extra=[];
    for(const seed of seeds){
      const pair=pairMaps[seed.chain]?.get(String(seed.address).toLowerCase()),
        row=trendingPairRow(pair,seed);
      if(row&&row.priceUsd!=null)extra.push(row)
    }

    // Merge organic network lists with boosted/attention lists. Prefer the
    // row with better market depth, while preserving boost labels when a
    // token exists in both feeds.
    const merged=new Map();
    const add=row=>{
      if(!row?.chain||!row?.address||row.priceUsd==null)return;
      const key=`${row.chain}:${String(row.address).toLowerCase()}`,old=merged.get(key);
      if(!old){merged.set(key,row);return}
      const oldDepth=(number(old.volume24h)||0)+(number(old.liquidityUsd)||0),
        newDepth=(number(row.volume24h)||0)+(number(row.liquidityUsd)||0),
        preferred=newDepth>oldDepth?row:old,other=preferred===row?old:row;
      merged.set(key,{
        ...other,...preferred,
        boosted:Boolean(old.boosted||row.boosted),
        boost:Math.max(Number(old.boost||0),Number(row.boost||0)),
        heat:Math.max(Number(old.heat||0),Number(row.heat||0)),
        image:preferred.image||other.image||'',
        source:[old.source,row.source].filter(Boolean).join(' + ')
      })
    };
    for(const chainRows of Object.values(organic))for(const row of chainRows)add(row);
    for(const row of extra)add(row);

    const clean=[...merged.values()]
      .filter(row=>{
        // Keep genuine runners with reasonable tradability. Lower than the
        // old threshold so newer EVM runners are not silently discarded.
        const liq=number(row.liquidityUsd)||0,vol=number(row.volume24h)||0;
        return row.chain==='robinhood'||liq>=250||vol>=2500
      })
      .sort((a,b)=>(Number(b.heat)||0)-(Number(a.heat)||0))
      .slice(0,160);

    const discovery={
      solana:clean.filter(x=>x.chain==='solana').length,
      ethereum:clean.filter(x=>x.chain==='ethereum').length,
      base:clean.filter(x=>x.chain==='base').length,
      bnb:clean.filter(x=>x.chain==='bnb').length,
      robinhood:clean.filter(x=>x.chain==='robinhood').length
    };
    trendingMarketCache={
      at:Date.now(),items:clean,discovery
    };
    return res.status(200).json({
      items:clean,cached:false,
      updatedAt:new Date(trendingMarketCache.at).toISOString(),
      discovery
    })
  }catch(e){
    console.error('Trenches trending market:',e);
    return res.status(Number(e?.status)||500).json({error:errorText(e)})
  }
}

async function tokensHandler(req,res){
  res.setHeader('Cache-Control','public, max-age=30, s-maxage=60');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const mode=String(req.query.mode||'search').toLowerCase();
    if(mode==='trending'){const arr=await jupiterTokens('/toptrending/1h?limit=12');const rows=(Array.isArray(arr)?arr:[]).map(tokenShape);await enrichSolIcons(rows);return res.status(200).json(rows);}
    if(mode==='popular'){const arr=await jupiterTokens('/search?query='+encodeURIComponent('SOL,USDC,USDT,WBTC,WETH,JitoSOL'));const rows=(Array.isArray(arr)?arr:[]).map(tokenShape),wanted=['SOL','USDC','USDT','WBTC','WETH','JITOSOL'],picked=[];for(const sym of wanted){const candidates=rows.filter(x=>x.symbol.toUpperCase()===sym).sort((a,b)=>(Number(b.isVerified)-Number(a.isVerified))+(Number(b.organicScore||0)-Number(a.organicScore||0))/100);if(candidates[0]&&!picked.some(x=>x.id===candidates[0].id))picked.push(candidates[0]);}await enrichSolIcons(picked);return res.status(200).json(picked);}
    const q=String(req.query.q||'').trim();if(!q)return res.status(200).json([]);const arr=await jupiterTokens('/search?query='+encodeURIComponent(q));const rows=(Array.isArray(arr)?arr:[]).slice(0,20).map(tokenShape);await enrichSolIcons(rows);return res.status(200).json(rows);
  }catch(e){console.error('Salt token search error',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}


function zeroXKey(){const key=process.env.ZEROX_API_KEY;if(!key){const e=new Error('Ethereum/Base/BNB/Robinhood swaps are not configured yet. Add ZEROX_API_KEY in Vercel Environment Variables, then redeploy.');e.status=503;throw e}return key}
const EVM_CHAINS={ethereum:1,base:8453,bnb:56,robinhood:4663};
function validEvmAddress(v){return /^0x[a-fA-F0-9]{40}$/.test(String(v||''))}
async function getZeroXQuote({chain,sellToken,buyToken,sellAmount,taker,firm=false}){const chainId=EVM_CHAINS[chain];if(!chainId)throw Object.assign(new Error('Unsupported EVM chain.'),{status:400});if(!validEvmAddress(sellToken)||!validEvmAddress(buyToken))throw Object.assign(new Error('Invalid EVM token address.'),{status:400});if(sellToken.toLowerCase()===buyToken.toLowerCase())throw Object.assign(new Error('Choose two different tokens.'),{status:400});if(!validPositiveInteger(sellAmount))throw Object.assign(new Error('Swap amount must be positive.'),{status:400});if(taker&&!validEvmAddress(taker))throw Object.assign(new Error('Invalid EVM wallet address.'),{status:400});const q=new URLSearchParams({chainId:String(chainId),sellToken,buyToken,sellAmount,slippageBps:'100'});if(taker)q.set('taker',taker);const kind=firm&&taker?'quote':'price';const z=await fetchJson(`${ZEROX_BASE}/${kind}?${q}`,{headers:{accept:'application/json','0x-api-key':zeroXKey(),'0x-version':'v2'}},15000);if(!z?.buyAmount||String(z.buyAmount)==='0')throw Object.assign(new Error(z?.reason||z?.validationErrors?.[0]?.reason||'0x could not find a live route for this pair.'),{status:422});const allowance=z?.issues?.allowance||null;return{chain,chainId,sellToken,buyToken,sellAmount:String(z.sellAmount||sellAmount),buyAmount:String(z.buyAmount),minBuyAmount:z.minBuyAmount?String(z.minBuyAmount):null,route:'0x',liquidityAvailable:z.liquidityAvailable!==false,allowanceSpender:allowance?.spender||z.allowanceTarget||null,allowanceActual:allowance?.actual!=null?String(allowance.actual):null,transaction:firm?(z.transaction||null):null,fees:z.fees||null,totalNetworkFee:z.totalNetworkFee||null,quotedAt:Date.now()}}
async function evmQuoteHandler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});try{const chain=String(req.query.chain||'').toLowerCase(),sellToken=String(req.query.sellToken||'').toLowerCase(),buyToken=String(req.query.buyToken||'').toLowerCase(),sellAmount=String(req.query.sellAmount||''),taker=String(req.query.taker||'').toLowerCase()||null,firm=String(req.query.firm||'')==='1';return res.status(200).json(await getZeroXQuote({chain,sellToken,buyToken,sellAmount,taker,firm}))}catch(e){console.error('Salt 0x quote error',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function evmTokensHandler(req,res){res.setHeader('Cache-Control','public, max-age=30, s-maxage=60');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});try{const chain=String(req.query.chain||'').toLowerCase(),q=String(req.query.q||'').trim();if(!['ethereum','base','bnb','robinhood'].includes(chain)||!q)return res.status(200).json([]);const dsChain=chain==='ethereum'?'ethereum':chain==='base'?'base':chain==='robinhood'?'robinhood':'bsc',j=await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,{headers:{accept:'application/json'}},9000),seen=new Set(),rows=[];for(const pair of (j?.pairs||[])){if(String(pair?.chainId)!==dsChain)continue;for(const t of [pair?.baseToken,pair?.quoteToken]){const id=String(t?.address||'').toLowerCase();if(!validEvmAddress(id)||seen.has(id))continue;seen.add(id);rows.push({id,name:String(t?.name||'Unknown token'),symbol:String(t?.symbol||'TOKEN'),icon:pair?.info?.imageUrl||null,decimals:null,chain,liquidityUsd:number(pair?.liquidity?.usd)})}}rows.sort((a,b)=>(b.liquidityUsd||0)-(a.liquidityUsd||0));return res.status(200).json(rows.slice(0,20))}catch(e){return res.status(500).json({error:errorText(e)})}}



// V1.10.82 — Quick Swap cross-chain native-asset routing via LI.FI public API.
const QUICK_SWAP_CHAINS={
  solana:{id:'1151111081099710',kind:'solana',token:'11111111111111111111111111111111',symbol:'SOL',decimals:9},
  ethereum:{id:'1',kind:'evm',token:'0x0000000000000000000000000000000000000000',symbol:'ETH',decimals:18},
  base:{id:'8453',kind:'evm',token:'0x0000000000000000000000000000000000000000',symbol:'ETH',decimals:18},
  bnb:{id:'56',kind:'evm',token:'0x0000000000000000000000000000000000000000',symbol:'BNB',decimals:18}
};
function lifiHeaders(){const h={accept:'application/json'};if(process.env.LIFI_API_KEY)h['x-lifi-api-key']=process.env.LIFI_API_KEY;return h}
function validQuickAddress(chain,address){const c=QUICK_SWAP_CHAINS[chain];return c?.kind==='solana'?validSolAddress(address):validEvmAddress(address)}
async function quickSwapPreviewHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const from=String(req.query.from||'').toLowerCase(),to=String(req.query.to||'').toLowerCase(),amount=String(req.query.amount||''),fromAddress=String(req.query.fromAddress||'').trim();
    const a=QUICK_SWAP_CHAINS[from],b=QUICK_SWAP_CHAINS[to];
    if(!a||!b)return res.status(400).json({error:'That Quick Swap network is not supported by the cross-chain router yet.'});
    if(from===to)return res.status(400).json({error:'Choose two different networks.'});
    if(!validPositiveInteger(amount))return res.status(400).json({error:'Quick Swap amount must be positive.'});
    if(!validQuickAddress(from,fromAddress))return res.status(400).json({error:'Valid source-wallet address required.'});
    const body={
      fromChainId:Number(a.id),
      toChainId:Number(b.id),
      fromTokenAddress:a.token,
      toTokenAddress:b.token,
      fromAmount:amount,
      fromAddress,
      options:{slippage:0.01,order:'RECOMMENDED'}
    };
    const j=await fetchJson('https://li.quest/v1/advanced/routes',{
      method:'POST',
      headers:{...lifiHeaders(),'content-type':'application/json'},
      body:JSON.stringify(body)
    },20000);
    const routes=Array.isArray(j?.routes)?j.routes:[];
    if(!routes.length||!routes[0]?.toAmount)throw Object.assign(new Error('No live cross-chain route was returned for that amount.'),{status:422});
    return res.status(200).json({route:routes[0],routes:routes.slice(0,3)});
  }catch(e){console.error('Trenches Quick Swap preview:',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function quickSwapQuoteHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const from=String(req.query.from||'').toLowerCase(),to=String(req.query.to||'').toLowerCase(),amount=String(req.query.amount||''),fromAddress=String(req.query.fromAddress||'').trim(),toAddress=String(req.query.toAddress||'').trim();
    const a=QUICK_SWAP_CHAINS[from],b=QUICK_SWAP_CHAINS[to];
    if(!a||!b)return res.status(400).json({error:'That Quick Swap network is not supported by the cross-chain router yet.'});
    if(from===to)return res.status(400).json({error:'Choose two different networks.'});
    if(!validPositiveInteger(amount))return res.status(400).json({error:'Quick Swap amount must be positive.'});
    if(!validQuickAddress(from,fromAddress))return res.status(400).json({error:'Valid source-wallet address required.'});
    if(!validQuickAddress(to,toAddress))return res.status(400).json({error:'Valid destination-wallet address required.'});
    const q=new URLSearchParams({fromChain:a.id,toChain:b.id,fromToken:a.token,toToken:b.token,fromAmount:amount,fromAddress,toAddress,slippage:'0.01'});
    const quote=await fetchJson(`https://li.quest/v1/quote?${q.toString()}`,{headers:lifiHeaders()},20000);
    if(!quote?.estimate?.toAmount)throw Object.assign(new Error('No live cross-chain route was returned for that amount.'),{status:422});
    return res.status(200).json(quote);
  }catch(e){console.error('Trenches Quick Swap quote:',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function quickSwapSolSubmitHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),signedTransaction=String(body.signedTransaction||'').trim(),key=process.env.HELIUS_API_KEY;
    if(!signedTransaction)return res.status(400).json({error:'Signed Solana transaction required.'});
    if(!key)return res.status(503).json({error:'HELIUS_API_KEY is required to broadcast this Solana Quick Swap.'});
    const j=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'trenches-quick-swap',method:'sendTransaction',params:[signedTransaction,{encoding:'base64',skipPreflight:false,maxRetries:3}]})},20000);
    if(j?.error)throw new Error(j.error.message||'Solana broadcast failed.');
    const signature=String(j?.result||'');if(!signature)throw new Error('Solana RPC did not return a transaction signature.');
    return res.status(200).json({signature});
  }catch(e){console.error('Trenches Quick Swap Solana broadcast:',e);return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function quickSwapStatusHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const txHash=String(req.query.txHash||'').trim(),fromChain=String(req.query.fromChain||'').trim(),toChain=String(req.query.toChain||'').trim(),bridge=String(req.query.bridge||'').trim();
    if(!txHash)return res.status(400).json({error:'Transaction hash required.'});
    const q=new URLSearchParams({txHash});if(fromChain)q.set('fromChain',fromChain);if(toChain)q.set('toChain',toChain);if(bridge)q.set('bridge',bridge);
    const j=await fetchJson(`https://li.quest/v1/status?${q.toString()}`,{headers:lifiHeaders()},12000);
    return res.status(200).json(j);
  }catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}

// V1.9.0 Salt Social — Upstash Redis REST persistence + Solana wallet signature verification.
const SOCIAL_URL=()=>String(process.env.UPSTASH_REDIS_REST_URL||'').replace(/\/$/,'');
const SOCIAL_TOKEN=()=>String(process.env.UPSTASH_REDIS_REST_TOKEN||'');
function socialReady(){return Boolean(SOCIAL_URL()&&SOCIAL_TOKEN())}
async function kv(command,...args){if(!socialReady())throw Object.assign(new Error('Salt Social storage is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.'),{status:503});const r=await fetch(`${SOCIAL_URL()}/${[command,...args].map(x=>encodeURIComponent(String(x))).join('/')}`,{headers:{Authorization:`Bearer ${SOCIAL_TOKEN()}`}}),j=await r.json();if(!r.ok||j?.error)throw Object.assign(new Error(j?.error||'Salt Social storage request failed.'),{status:502});return j.result}
function base58Bytes(str){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',map=new Map([...alphabet].map((c,i)=>[c,i])),bytes=[0];for(const c of String(str)){const v=map.get(c);if(v==null)throw new Error('Invalid Solana wallet address.');let carry=v;for(let j=0;j<bytes.length;j++){carry+=bytes[j]*58;bytes[j]=carry&255;carry>>=8}while(carry){bytes.push(carry&255);carry>>=8}}for(let i=0;i<str.length-1&&str[i]==='1';i++)bytes.push(0);return Buffer.from(bytes.reverse())}
async function verifySolMessage(wallet,message,signature){try{const {createPublicKey,verify}=await import('node:crypto'),raw=base58Bytes(wallet);if(raw.length!==32)return false;const der=Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),key=createPublicKey({key:der,format:'der',type:'spki'});return verify(null,Buffer.from(String(message),'utf8'),key,Buffer.from(String(signature),'base64'))}catch{return false}}
function safeSocialWallet(v){v=String(v||'').trim();try{return base58Bytes(v).length===32?v:''}catch{return''}}
function cleanUsername(v){v=String(v||'').trim();return /^[A-Za-z0-9_]{3,24}$/.test(v)?v:''}
function cleanChain(v){v=String(v||'').toLowerCase();return ['solana','ethereum','base','bnb','robinhood'].includes(v)?v:''}
function cleanToken(v){v=String(v||'').trim();return v.length>=20&&v.length<=80?v:''}
function cleanLink(v){v=String(v||'').trim();if(!v)return'';try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href.slice(0,300):''}catch{return''}}
function socialKey(chain,token){return `salt:social:reviews:${chain}:${token.toLowerCase()}`}

// V1.10.61 — one wallet signature creates a 7-day Trenches Social session.
// Social posts use this HttpOnly session instead of opening the wallet for every thesis.
const SOCIAL_SESSION_COOKIE='trenches_social_session';
const SOCIAL_SESSION_TTL_SECONDS=7*24*60*60;
function socialSessionSecret(){return String(process.env.SOCIAL_SESSION_SECRET||SOCIAL_TOKEN()||'')}
function socialCookie(req,name){const raw=String(req?.headers?.cookie||'');for(const part of raw.split(';')){const i=part.indexOf('=');if(i<0)continue;const k=part.slice(0,i).trim();if(k===name){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return part.slice(i+1).trim()}}}return''}
function socialB64Url(input){return Buffer.from(input).toString('base64url')}
const socialTokenSnapshotCache=new Map();
function meaningfulSocialTokenName(value){
  const s=String(value||'').replace(/\s+/g,' ').trim();
  if(!s)return false;
  const low=s.toLowerCase();
  if(['token','contract token','unknown','unknown token','n/a','na','none','undefined','null'].includes(low))return false;
  // A raw CA is not a meaningful display name.
  if(/^0x[a-f0-9]{40}$/i.test(s)||/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s))return false;
  return true
}

function meaningfulSocialTokenSymbol(value){
  const s=String(value||'').replace(/^\$/,'').trim();
  if(!s)return false;
  const low=s.toLowerCase();
  if(['token','unknown','n/a','na','none','undefined','null','?','-'].includes(low))return false;
  if(/^0x[a-f0-9]{40}$/i.test(s)||/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s))return false;
  return true
}

function applySocialPairSnapshot(snap,pair,target){
  if(!snap||!pair)return snap;
  const wanted=String(target||'').toLowerCase(),
    base=pair?.baseToken||{},quote=pair?.quoteToken||{},
    baseAddress=String(base?.address||'').toLowerCase(),
    quoteAddress=String(quote?.address||'').toLowerCase(),
    targetIsQuote=Boolean(wanted&&quoteAddress===wanted&&baseAddress!==wanted),
    token=targetIsQuote?quote:base;

  if(!meaningfulSocialTokenName(snap.name)&&meaningfulSocialTokenName(token?.name)){
    snap.name=String(token.name).replace(/\s+/g,' ').trim().slice(0,100)
  }
  if(!meaningfulSocialTokenSymbol(snap.symbol)&&meaningfulSocialTokenSymbol(token?.symbol)){
    snap.symbol=String(token.symbol).trim().replace(/^\$/,'').slice(0,20)
  }

  // DexScreener priceUsd describes the base token. When the requested token
  // is the quote token, derive quote USD from base USD / base priceNative.
  let livePrice=null;
  if(!targetIsQuote){
    livePrice=number(pair?.priceUsd)
  }else{
    const baseUsd=number(pair?.priceUsd),baseInQuote=number(pair?.priceNative);
    if(baseUsd!=null&&baseInQuote!=null&&baseInQuote>0)livePrice=baseUsd/baseInQuote
  }
  if(livePrice!=null)snap.priceUsd=livePrice;

  // DexScreener's pair image normally represents the base token, so don't
  // incorrectly put that image on a quote-token post.
  if(!snap.image&&!targetIsQuote){
    snap.image=normalizeTokenIcon(pair?.info?.imageUrl)||''
  }
  return snap
}

function socialPostId(wallet,chain,token){
  return `${String(wallet||'').trim()}:${cleanChain(chain)}:${String(token||'').trim().toLowerCase()}`
}

function parseSocialPostId(postId){
  const s=String(postId||'').trim(),first=s.indexOf(':'),second=first<0?-1:s.indexOf(':',first+1);
  if(first<=0||second<=first+1)return null;
  const wallet=safeSocialWallet(s.slice(0,first)),
    chain=cleanChain(s.slice(first+1,second)),
    token=cleanToken(s.slice(second+1));
  return wallet&&chain&&token?{wallet,chain,token}:null
}

function cleanSocialComment(value){
  return String(value||'')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'')
    .replace(/\r\n?/g,'\n')
    .trim()
    .slice(0,400)
}

async function socialSessionMac(payload){const secret=socialSessionSecret();if(!secret)throw Object.assign(new Error('Trenches Social session security is not configured.'),{status:503});const {createHmac}=await import('node:crypto');return createHmac('sha256',secret).update(payload).digest('base64url')}
async function makeSocialSessionToken(wallet){const payload=socialB64Url(JSON.stringify({v:1,wallet,exp:Date.now()+SOCIAL_SESSION_TTL_SECONDS*1000}));return `${payload}.${await socialSessionMac(payload)}`}
async function socialSessionWallet(req){try{const token=socialCookie(req,SOCIAL_SESSION_COOKIE),parts=token.split('.');if(parts.length!==2)return'';const [payload,mac]=parts,expected=await socialSessionMac(payload);const {timingSafeEqual}=await import('node:crypto'),a=Buffer.from(mac),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return'';const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(data?.v!==1||!safeSocialWallet(data?.wallet)||Number(data?.exp)<=Date.now())return'';return String(data.wallet)}catch{return''}}
function socialCookieSecure(req){return Boolean(process.env.VERCEL||String(req?.headers?.['x-forwarded-proto']||'').toLowerCase()==='https')}
async function setSocialSession(res,req,wallet){const token=await makeSocialSessionToken(wallet),secure=socialCookieSecure(req)?'; Secure':'';res.setHeader('Set-Cookie',`${SOCIAL_SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SOCIAL_SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);return token}
function clearSocialSessionCookie(res,req){const secure=socialCookieSecure(req)?'; Secure':'';res.setHeader('Set-Cookie',`${SOCIAL_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`)}
function socialLoginMessage(wallet,nonce){return `The Trenches sign in\nWallet: ${wallet}\nNonce: ${nonce}\nSession: 7 days\nThis signature only proves wallet ownership. It does not create a transaction or cost gas.`}
async function socialAuthHandler(req,res){res.setHeader('Cache-Control','no-store');try{
  if(req.method==='GET'){
    const action=String(req.query?.action||'session').toLowerCase();
    if(action==='challenge'){
      const wallet=safeSocialWallet(req.query?.wallet);if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});
      const {randomBytes}=await import('node:crypto'),nonce=randomBytes(18).toString('hex'),message=socialLoginMessage(wallet,nonce);
      await kv('set',`trenches:social:auth:${wallet}:${nonce}`,'1','ex','600');
      return res.status(200).json({wallet,nonce,message,expiresIn:600});
    }
    const wallet=await socialSessionWallet(req);return res.status(200).json({authenticated:Boolean(wallet),wallet:wallet||null,expiresInDays:wallet?7:0});
  }
  if(req.method==='DELETE'){clearSocialSessionCookie(res,req);return res.status(200).json({ok:true});}
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{},wallet=safeSocialWallet(b.wallet),nonce=String(b.nonce||''),message=String(b.message||''),signature=String(b.signature||'');
  if(!wallet||!/^[a-f0-9]{36}$/i.test(nonce)||!signature)return res.status(400).json({error:'Valid wallet login challenge is required.'});
  const key=`trenches:social:auth:${wallet}:${nonce}`,pending=await kv('get',key),expected=socialLoginMessage(wallet,nonce);
  if(!pending)return res.status(401).json({error:'That login request expired. Try connecting again.'});
  if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet sign-in could not be verified.'});
  await kv('del',key);await setSocialSession(res,req,wallet);
  const pr=await kv('get',`salt:social:profile:${wallet}`),profile=pr?withTrenchesVerification(JSON.parse(pr)):null;
  return res.status(200).json({ok:true,authenticated:true,wallet,expiresInDays:7,profile});
}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
const TRENCHES_VERIFIED_WALLETS=new Set(['ETNzpdn7qiSYDX1xzPk9EF5TTN2DyaRmcnUttDYHRALN']);
function withTrenchesVerification(profile){
  if(!profile)return profile;
  const wallet=String(profile.wallet||'');
  return {...profile,verified:TRENCHES_VERIFIED_WALLETS.has(wallet)};
}
async function socialProfileHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method==='GET'){if(req.query.username){const username=cleanUsername(req.query.username);if(!username)return res.status(400).json({error:'Valid username required.'});const owner=await kv('get',`salt:social:username:${username.toLowerCase()}`);return res.status(200).json({username,available:!owner,owner:owner||null})}const wallet=safeSocialWallet(req.query.wallet);if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});const raw=await kv('get',`salt:social:profile:${wallet}`);if(!raw)return res.status(200).json(null);const profile=JSON.parse(raw),viewer=await socialSessionWallet(req),following=Array.isArray(profile.following)?profile.following:[],followers=Array.isArray(profile.followers)?profile.followers:[];return res.status(200).json({...withTrenchesVerification(profile),followingCount:following.length,followersCount:followers.length,viewerFollowing:Boolean(viewer&&followers.includes(viewer))})}if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{},wallet=safeSocialWallet(b.wallet),message=String(b.message||''),signature=String(b.signature||'');if(!wallet)return res.status(400).json({error:'Valid wallet is required.'});if(b.action==='follow'){const viewer=await socialSessionWallet(req);if(!viewer)return res.status(401).json({error:'Connect your Trenches Social wallet to follow profiles.'});if(viewer===wallet)return res.status(400).json({error:'You cannot follow your own profile.'});const viewerRaw=await kv('get',`salt:social:profile:${viewer}`),targetRaw=await kv('get',`salt:social:profile:${wallet}`);if(!viewerRaw)return res.status(403).json({error:'Create your Trenches profile first.'});if(!targetRaw)return res.status(404).json({error:'That Trenches profile no longer exists.'});const viewerProfile=JSON.parse(viewerRaw),targetProfile=JSON.parse(targetRaw),following=Array.isArray(viewerProfile.following)?viewerProfile.following:[],followers=Array.isArray(targetProfile.followers)?targetProfile.followers:[],isFollowing=following.includes(wallet);if(isFollowing){viewerProfile.following=following.filter(x=>x!==wallet);targetProfile.followers=followers.filter(x=>x!==viewer)}else{viewerProfile.following=[...new Set([...following,wallet])].slice(-5000);targetProfile.followers=[...new Set([...followers,viewer])].slice(-5000)}viewerProfile.updatedAt=new Date().toISOString();targetProfile.updatedAt=new Date().toISOString();await kv('set',`salt:social:profile:${viewer}`,JSON.stringify(viewerProfile));await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(targetProfile));return res.status(200).json({following:!isFollowing,followingCount:viewerProfile.following.length,followersCount:targetProfile.followers.length,target:withTrenchesVerification(targetProfile)})}if(b.action==='tickers'){const tickers=Array.isArray(b.tickers)?b.tickers.slice(0,20).map(x=>({id:String(x?.id||'').slice(0,100),symbol:String(x?.symbol||'').slice(0,20),name:String(x?.name||'').slice(0,100),image:normalizeTokenIcon(x?.image)||'',price:number(x?.price),change24h:number(x?.change24h)})).filter(x=>x.id&&x.symbol):[];const oldRaw=await kv('get',`salt:social:profile:${wallet}`);if(!oldRaw)return res.status(404).json({error:'Create your Salt profile first.'});const old=JSON.parse(oldRaw),profile={...old,tickers,updatedAt:new Date().toISOString()};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));return res.status(200).json(withTrenchesVerification(profile))}if(b.action==='banner'){const banner=String(b.banner||'');if(!banner.startsWith('data:image/jpeg;base64,')||banner.length>600000)return res.status(400).json({error:'Banner image is invalid or too large.'});const oldRaw=await kv('get',`salt:social:profile:${wallet}`);if(!oldRaw)return res.status(404).json({error:'Create your Salt profile first.'});const old=JSON.parse(oldRaw),profile={...old,banner,updatedAt:new Date().toISOString()};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));return res.status(200).json(withTrenchesVerification(profile))}if(b.action==='appearance'){const banner=String(b.banner||''),favorites=Array.isArray(b.favorites)?b.favorites.slice(0,2).map(x=>({id:String(x?.id||'').slice(0,100),name:String(x?.name||'NFT').slice(0,100),image:normalizeTokenIcon(x?.image)||'',collection:String(x?.collection||'').slice(0,100),priceSol:Number.isFinite(Number(x?.priceSol))?Number(x.priceSol):null})):[];if(banner&&(!banner.startsWith('data:image/jpeg;base64,')||banner.length>600000))return res.status(400).json({error:'Banner image is invalid or too large.'});const data=JSON.stringify({banner,favorites}),expected=`Salt Swap profile appearance\nWallet: ${wallet}\nData: ${data}`;if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet signature could not be verified.'});const oldRaw=await kv('get',`salt:social:profile:${wallet}`);if(!oldRaw)return res.status(404).json({error:'Create your Salt profile first.'});const old=JSON.parse(oldRaw),profile={...old,banner,favorites,updatedAt:new Date().toISOString()};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));return res.status(200).json(withTrenchesVerification(profile))}const username=cleanUsername(b.username),avatar=String(b.avatar||''),avatarHash=String(b.avatarHash||'none'),bio=String(b.bio||'').trim().slice(0,160);if(!username)return res.status(400).json({error:'Valid wallet and username are required.'});if(avatar&&(!avatar.startsWith('data:image/jpeg;base64,')||avatar.length>180000))return res.status(400).json({error:'Profile picture is invalid or too large.'});const expected=`Salt Swap profile\nWallet: ${wallet}\nUsername: ${username}\nAvatar: ${avatarHash}\nBio: ${bio}`;if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet signature could not be verified.'});const digest=avatar?await crypto.subtle.digest('SHA-256',new TextEncoder().encode(avatar)):null,serverHash=digest?[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join(''):'none';if(serverHash!==avatarHash)return res.status(400).json({error:'Profile picture verification failed.'});const now=new Date().toISOString(),oldRaw=await kv('get',`salt:social:profile:${wallet}`),old=oldRaw?JSON.parse(oldRaw):null,userKey=`salt:social:username:${username.toLowerCase()}`,existingOwner=await kv('get',userKey);if(existingOwner&&existingOwner!==wallet)return res.status(409).json({error:'That username is already taken. Pick another one.'});if(!existingOwner){const claimed=await kv('set',userKey,wallet,'nx');if(!claimed){const winner=await kv('get',userKey);if(winner!==wallet)return res.status(409).json({error:'That username was just claimed. Pick another one.'})}}if(old?.username&&old.username.toLowerCase()!==username.toLowerCase()){const oldKey=`salt:social:username:${old.username.toLowerCase()}`,oldOwner=await kv('get',oldKey);if(oldOwner===wallet)await kv('del',oldKey)}const profile={wallet,username,avatar:avatar||'',bio,banner:old?.banner||'',favorites:old?.favorites||[],tickers:old?.tickers||[],following:Array.isArray(old?.following)?old.following:[],followers:Array.isArray(old?.followers)?old.followers:[],createdAt:old?.createdAt||now,updatedAt:now};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));await setSocialSession(res,req,wallet);return res.status(200).json(withTrenchesVerification(profile))}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function socialNftsHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const wallet=safeSocialWallet(req.query.wallet),key=process.env.HELIUS_API_KEY;if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});if(!key)return res.status(503).json({error:'NFT lookup needs HELIUS_API_KEY configured in Vercel.'});const j=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'salt-social-nfts',method:'getAssetsByOwner',params:{ownerAddress:wallet,page:1,limit:100,displayOptions:{showFungible:false}}})},12000),items=(j?.result?.items||[]).filter(a=>{const i=String(a?.interface||'').toLowerCase();return i.includes('nft')||i.includes('programmablenft')}).map(a=>{const grouping=Array.isArray(a?.grouping)?a.grouping:[],collectionGroup=grouping.find(g=>String(g?.group_key||'').toLowerCase()==='collection');return{id:String(a.id||''),name:String(a?.content?.metadata?.name||a?.content?.metadata?.symbol||'NFT'),image:heliusAssetImage(a),collection:String(a?.content?.metadata?.collection?.name||a?.content?.metadata?.collection||collectionGroup?.group_value||'').slice(0,100)}}).filter(a=>a.id&&a.image).slice(0,60);return res.status(200).json({items})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function socialNftDetailHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const mint=String(req.query.mint||'').trim();if(!mint||mint.length<32||mint.length>100)return res.status(400).json({error:'Valid NFT mint required.'});let collection='',priceSol=null;try{const meta=await fetchJson(`https://api-mainnet.magiceden.dev/v2/tokens/${encodeURIComponent(mint)}`,{headers:{accept:'application/json'}},7000);collection=String(meta?.collectionName||meta?.collection||meta?.collectionSymbol||'').slice(0,100)}catch{}try{const listings=await fetchJson(`https://api-mainnet.magiceden.dev/v2/tokens/${encodeURIComponent(mint)}/listings?listingAggMode=true`,{headers:{accept:'application/json'}},7000);const rows=Array.isArray(listings)?listings:[];const prices=rows.map(x=>Number(x?.price??x?.listPrice)).filter(x=>Number.isFinite(x)&&x>0);if(prices.length)priceSol=Math.min(...prices)}catch{}return res.status(200).json({mint,collection,priceSol})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function swapBalanceHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const wallet=safeSocialWallet(req.query.wallet),mint=String(req.query.mint||'').trim(),key=process.env.HELIUS_API_KEY;
    if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});
    if(!key)return res.status(503).json({error:'Wallet balance lookup needs HELIUS_API_KEY configured in Vercel.'});
    if(mint!=='SOL'&&!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(mint))return res.status(400).json({error:'Valid Solana token mint required.'});
    const rpcUrl=`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
    if(mint==='SOL'){
      const result=await rpc(rpcUrl,'getBalance',[wallet,{commitment:'confirmed'}]);
      const atomic=String(result?.value??0);
      return res.status(200).json({wallet,mint:'SOL',atomic,decimals:9,source:'Helius'});
    }
    const result=await rpc(rpcUrl,'getTokenAccountsByOwner',[wallet,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]);
    let total=0n,decimals=null;
    for(const row of result?.value||[]){
      const ta=row?.account?.data?.parsed?.info?.tokenAmount||{};
      if(ta.amount!=null){try{total+=BigInt(String(ta.amount))}catch{}}
      if(decimals==null&&Number.isFinite(Number(ta.decimals)))decimals=Number(ta.decimals);
    }
    return res.status(200).json({wallet,mint,atomic:total.toString(),decimals:decimals??null,source:'Helius'});
  }catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}

async function socialHoldingsHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const wallet=safeSocialWallet(req.query.wallet),key=process.env.HELIUS_API_KEY;if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});if(!key)return res.status(503).json({error:'Wallet holdings need HELIUS_API_KEY configured in Vercel.'});const rpc=`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,j=await fetchJson(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'salt-social-holdings',method:'getAssetsByOwner',params:{ownerAddress:wallet,page:1,limit:100,displayOptions:{showFungible:true,showNativeBalance:true}}})},12000),rows=[];for(const a of (j?.result?.items||[])){const ti=a?.token_info||{},dec=Number(ti.decimals||0),raw=Number(ti.balance||0),bal=dec>=0?raw/(10**dec):raw,iface=String(a?.interface||'').toLowerCase();if(!Number.isFinite(bal)||bal<=0||(!iface.includes('fungible')&&!ti.balance))continue;const symbol=String(a?.content?.metadata?.symbol||a?.content?.metadata?.name||'TOKEN').slice(0,20),name=String(a?.content?.metadata?.name||symbol).slice(0,60);rows.push({mint:String(a.id||''),symbol,name,balance:bal,displayBalance:bal>=1000000?(bal/1000000).toFixed(2)+'M':bal>=1000?(bal/1000).toFixed(2)+'K':bal>=1?bal.toLocaleString(undefined,{maximumFractionDigits:4}):bal.toPrecision(3),image:heliusAssetImage(a)})}rows.sort((a,b)=>b.balance-a.balance);await enrichHoldingImages(rows);return res.status(200).json({items:rows.slice(0,30)})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}



function portfolioHistoryRangeMs(range){return ({'24h':86400000,'1w':604800000,'1m':2592000000,'3m':7776000000,'1y':31536000000})[String(range||'24h').toLowerCase()]||null}
function portfolioHistoryBucketMs(range){return ({'24h':5*60*1000,'1w':60*60*1000,'1m':6*60*60*1000,'3m':24*60*60*1000,'1y':24*60*60*1000,'all':7*24*60*60*1000})[String(range||'24h').toLowerCase()]||5*60*1000}
function downsamplePortfolioHistory(rows,range){
  rows=(rows||[]).filter(x=>Number.isFinite(Number(x?.t))&&Number.isFinite(Number(x?.v))).sort((a,b)=>a.t-b.t);
  const bucket=portfolioHistoryBucketMs(range),out=[],map=new Map();
  for(const x of rows){const k=Math.floor(Number(x.t)/bucket)*bucket;map.set(k,{t:Number(x.t),v:Number(x.v)})}
  for(const x of map.values())out.push(x);return out.sort((a,b)=>a.t-b.t)
}
async function recordPersistentPortfolioSnapshot(wallet,totalUsd,items){
  if(!socialReady()||!Number.isFinite(Number(totalUsd)))return;
  const now=Date.now(),histKey=`trenches:portfolio:history:${wallet}`,lastKey=`trenches:portfolio:last:${wallet}`;
  try{
    const last=Number(await kv('get',lastKey)||0);
    if(!last||now-last>=5*60*1000){
      await kv('zadd',histKey,String(now),JSON.stringify({t:now,v:Number(totalUsd)}));
      await kv('set',lastKey,String(now),'ex',String(400*24*60*60));
      await kv('zremrangebyscore',histKey,'0',String(now-400*24*60*60*1000)).catch(()=>null)
    }
    const d=new Date(now),day=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`,dayKey=`trenches:portfolio:day:${wallet}:${day}`;
    const daily={
      t:now,totalUsd:Number(totalUsd),
      items:(items||[]).slice(0,100).map(x=>({mint:x.mint,symbol:x.symbol,name:x.name,balance:x.balance,displayBalance:x.displayBalance,image:x.image,imageFallbacks:x.imageFallbacks||[],priceUsd:x.priceUsd,valueUsd:x.valueUsd,change24h:x.change24h,marketCap:x.marketCap}))
    };
    await kv('set',dayKey,JSON.stringify(daily),'nx','ex',String(400*24*60*60)).catch(()=>null)
  }catch(e){console.warn('Portfolio persistent snapshot:',errorText(e))}
}
async function persistentPortfolioHistory(wallet,range){
  if(!socialReady())return[];
  try{
    const now=Date.now(),ms=portfolioHistoryRangeMs(range),min=ms?now-ms:0,key=`trenches:portfolio:history:${wallet}`,raw=await kv('zrangebyscore',key,String(min),String(now));
    return downsamplePortfolioHistory((Array.isArray(raw)?raw:[]).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean),range)
  }catch{return[]}
}
async function portfolioHistoryHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const wallet=safeSocialWallet(req.query.wallet),range=String(req.query.range||'24h').toLowerCase();
    if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});
    if(!['24h','1w','1m','3m','1y','all'].includes(range))return res.status(400).json({error:'Invalid portfolio history range.'});
    const items=await persistentPortfolioHistory(wallet,range);
    return res.status(200).json({wallet,range,items,persistent:socialReady()})
  }catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function portfolioTimeMachineHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const wallet=safeSocialWallet(req.query.wallet),date=String(req.query.date||'');
    if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({error:'Use YYYY-MM-DD for Time Machine.'});
    if(!socialReady())return res.status(200).json({wallet,date,snapshot:null,persistent:false});
    const raw=await kv('get',`trenches:portfolio:day:${wallet}:${date}`);
    return res.status(200).json({wallet,date,snapshot:raw?JSON.parse(raw):null,persistent:true})
  }catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}
async function enrichPortfolioMarket(rows){
  const targets=(rows||[]).filter(x=>x?.mint).slice(0,60),mintMap=new Map();
  for(const r of targets){const queryMint=r.mint==='SOL'?'So11111111111111111111111111111111111111112':r.mint;mintMap.set(queryMint,r)}
  const mints=[...mintMap.keys()];if(!mints.length)return rows;
  try{
    for(let i=0;i<mints.length;i+=25){
      const chunk=mints.slice(i,i+25),ds=await fetchJson(`https://api.dexscreener.com/tokens/v1/solana/${chunk.map(encodeURIComponent).join(',')}`,{headers:{accept:'application/json'}},8000).catch(()=>[]);
      for(const mint of chunk){
        const row=mintMap.get(mint),pairs=(Array.isArray(ds)?ds:[]).filter(p=>String(p?.baseToken?.address||'')===mint).sort((a,b)=>(number(b?.liquidity?.usd)||0)-(number(a?.liquidity?.usd)||0)),best=pairs[0];if(!row||!best)continue;
        row.change24h=number(best?.priceChange?.h24);
        row.marketCap=number(best?.marketCap)??number(best?.fdv);
        row.liquidityUsd=number(best?.liquidity?.usd);
        if(number(row.priceUsd)==null)row.priceUsd=number(best?.priceUsd);
        if(number(row.valueUsd)==null&&number(row.priceUsd)!=null)row.valueUsd=Number(row.balance||0)*Number(row.priceUsd)
      }
    }
  }catch(e){console.warn('Portfolio market enrichment:',errorText(e))}
  return rows
}
async function portfolioHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const wallet=safeSocialWallet(req.query.wallet),key=process.env.HELIUS_API_KEY;if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});if(!key)return res.status(503).json({error:'Portfolio needs HELIUS_API_KEY configured in Vercel.'});
    const rpc=`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
    const [assets,activityRaw]=await Promise.all([
      fetchJson(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'trenches-portfolio',method:'getAssetsByOwner',params:{ownerAddress:wallet,page:1,limit:250,displayOptions:{showFungible:true,showNativeBalance:true}}})},14000),
      fetchJson(`https://api.helius.xyz/v0/addresses/${encodeURIComponent(wallet)}/transactions?api-key=${encodeURIComponent(key)}&limit=50`,{headers:{accept:'application/json'}},12000).catch(()=>[])
    ]);
    const result=assets?.result||{},rows=[],native=result?.nativeBalance||{},lamports=number(native?.lamports)??0,solBalance=lamports/1e9,solPrice=number(native?.price_per_sol??native?.pricePerSol),solValue=number(native?.total_price??native?.totalPrice)??(solPrice!=null?solBalance*solPrice:null);
    if(solBalance>0)rows.push({mint:'SOL',symbol:'SOL',name:'Solana',balance:solBalance,displayBalance:solBalance.toLocaleString(undefined,{maximumFractionDigits:6}),image:'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',priceUsd:solPrice,valueUsd:solValue,native:true,avgBuyUsd:null,pnlUsd:null});
    for(const asset of (result?.items||[])){
      const ti=asset?.token_info||{},dec=Number(ti.decimals||0),raw=Number(ti.balance||0),bal=dec>=0?raw/(10**dec):raw,iface=String(asset?.interface||'').toLowerCase();if(!Number.isFinite(bal)||bal<=0||(!iface.includes('fungible')&&!ti.balance))continue;
      const pi=ti?.price_info||{},price=number(pi?.price_per_token??pi?.pricePerToken),value=number(pi?.total_price??pi?.totalPrice)??(price!=null?bal*price:null),symbol=String(asset?.content?.metadata?.symbol||asset?.content?.metadata?.name||'TOKEN').slice(0,20),name=String(asset?.content?.metadata?.name||symbol).slice(0,60);
      rows.push({mint:String(asset.id||''),symbol,name,balance:bal,displayBalance:bal>=1e6?(bal/1e6).toFixed(2)+'M':bal>=1e3?(bal/1e3).toFixed(2)+'K':bal>=1?bal.toLocaleString(undefined,{maximumFractionDigits:4}):bal.toPrecision(3),image:heliusAssetImage(asset),priceUsd:price,valueUsd:value,native:false,avgBuyUsd:null,pnlUsd:null})
    }
    await Promise.all([enrichHoldingImages(rows),enrichPortfolioMarket(rows)]);
    rows.sort((x,y)=>{const xv=number(x.valueUsd),yv=number(y.valueUsd);if(xv!=null||yv!=null)return(yv??-1)-(xv??-1);return Number(y.balance||0)-Number(x.balance||0)});
    const priced=rows.filter(x=>number(x.valueUsd)!=null),totalUsd=priced.reduce((sum,x)=>sum+Number(x.valueUsd||0),0);
    const activity=(Array.isArray(activityRaw)?activityRaw:[]).slice(0,50).map(tx=>({signature:String(tx?.signature||''),timestamp:number(tx?.timestamp),type:String(tx?.type||'TRANSACTION').slice(0,60),source:String(tx?.source||'').slice(0,60),description:String(tx?.description||'').replace(/\s+/g,' ').trim().slice(0,260),fee:number(tx?.fee)}));
    await recordPersistentPortfolioSnapshot(wallet,totalUsd,rows);
    return res.status(200).json({wallet,network:'solana',totalUsd,pricedAssets:priced.length,items:rows.slice(0,100),activity,updatedAt:new Date().toISOString(),historyPersistent:socialReady()})
  }catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}
}

async function socialTokenSnapshot(chain,token,fallback={}){
  let snap={name:String(fallback?.name||'').trim().slice(0,100),symbol:String(fallback?.symbol||'').trim().replace(/^\$/,'').slice(0,20),priceUsd:number(fallback?.priceUsd),image:normalizeTokenIcon(fallback?.image)||''},
    dsChain=chain==='bnb'?'bsc':chain,target=String(token||'').trim(),pairs=[];
  if(!target)return snap;

  // 1) Chain-specific DexScreener pairs.
  try{
    const rows=await fetchJson(`https://api.dexscreener.com/token-pairs/v1/${dsChain}/${encodeURIComponent(target)}`,{headers:{accept:'application/json'}},7000);
    pairs=Array.isArray(rows)?rows:[];
    const pair=pairs.sort((a,b)=>(number(b?.liquidity?.usd)||0)-(number(a?.liquidity?.usd)||0))[0];
    applySocialPairSnapshot(snap,pair,target)
  }catch{}

  // 2) DexScreener's chain-agnostic token endpoint. This catches older posts
  // whose stored chain alias or pair lookup no longer resolves cleanly.
  if(!meaningfulSocialTokenName(snap.name)||!meaningfulSocialTokenSymbol(snap.symbol)||snap.priceUsd==null||!snap.image){
    try{
      const j=await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(target)}`,{headers:{accept:'application/json'}},7000),
        rows=Array.isArray(j?.pairs)?j.pairs:[],
        wanted=rows.filter(x=>!dsChain||String(x?.chainId||'').toLowerCase()===String(dsChain).toLowerCase()),
        pair=(wanted.length?wanted:rows).sort((a,b)=>(number(b?.liquidity?.usd)||0)-(number(a?.liquidity?.usd)||0))[0];
      applySocialPairSnapshot(snap,pair,target)
    }catch{}
  }

  // 3) Solana metadata fallbacks for name/symbol/artwork even when there is no
  // active DEX pair. This prevents a feed card from degrading to "Token".
  if(chain==='solana'&&(!meaningfulSocialTokenName(snap.name)||!meaningfulSocialTokenSymbol(snap.symbol)||!snap.image)){
    try{
      const arr=await jupiterTokens('/search?query='+encodeURIComponent(target)),
        hit=(Array.isArray(arr)?arr:[]).find(x=>String(x?.id||'')===target)||(Array.isArray(arr)?arr:[])[0];
      if(hit){
        if(meaningfulSocialTokenName(hit?.name))snap.name=String(hit.name).trim().slice(0,100);
        if(meaningfulSocialTokenSymbol(hit?.symbol))snap.symbol=String(hit.symbol).trim().replace(/^\$/,'').slice(0,20);
        snap.image=normalizeTokenIcon(hit?.icon)||snap.image;
        snap.priceUsd=number(hit?.usdPrice)??snap.priceUsd
      }
    }catch{}
    if((!meaningfulSocialTokenName(snap.name)||!meaningfulSocialTokenSymbol(snap.symbol)||!snap.image)&&process.env.HELIUS_API_KEY){
      try{
        const h=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(process.env.HELIUS_API_KEY)}`,{
          method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
          body:JSON.stringify({jsonrpc:'2.0',id:'trenches-social-token',method:'getAsset',params:{id:target}})
        },7000),asset=h?.result||{},meta=asset?.content?.metadata||{};
        if(meaningfulSocialTokenName(meta?.name))snap.name=String(meta.name).trim().slice(0,100);
        if(meaningfulSocialTokenSymbol(meta?.symbol))snap.symbol=String(meta.symbol).trim().replace(/^\$/,'').slice(0,20);
        snap.image=heliusAssetImage(asset)||snap.image
      }catch{}
    }
  }

  return snap
}
async function cachedSocialTokenSnapshot(chain,token,fallback={}){
  const key=`${cleanChain(chain)}:${String(token||'').toLowerCase()}`,now=Date.now(),cached=socialTokenSnapshotCache.get(key);
  if(cached&&now-cached.at<120000){
    const c={...cached.value};
    // A caller-provided historical/post snapshot remains more authoritative
    // than the cached live values.
    if(meaningfulSocialTokenName(fallback?.name))c.name=String(fallback.name).trim().slice(0,100);
    if(meaningfulSocialTokenSymbol(fallback?.symbol))c.symbol=String(fallback.symbol).trim().replace(/^\$/,'').slice(0,20);
    if(number(fallback?.priceUsd)!=null)c.priceUsd=number(fallback.priceUsd);
    if(normalizeTokenIcon(fallback?.image))c.image=normalizeTokenIcon(fallback.image);
    return c
  }
  const value=await socialTokenSnapshot(chain,token,fallback);
  socialTokenSnapshotCache.set(key,{at:now,value:{...value}});
  if(socialTokenSnapshotCache.size>300){
    for(const [k,v] of socialTokenSnapshotCache){if(now-v.at>300000)socialTokenSnapshotCache.delete(k)}
  }
  return value
}
async function readSocialPostState(postId,viewerWallet=''){const raw=await kv('get',`salt:social:post:${postId}`),state=raw?JSON.parse(raw):{},likes=Array.isArray(state.likes)?state.likes:[],replies=Array.isArray(state.replies)?state.replies:[],quotes=Array.isArray(state.quotes)?state.quotes:[];return{likes,replies,quotes,likeCount:likes.length,replyCount:replies.length,quoteCount:quotes.length,liked:Boolean(viewerWallet&&likes.includes(viewerWallet))}}
async function enrichSocialReview(review,viewerWallet=''){
  let r={...review},needsMeta=!meaningfulSocialTokenName(r.tokenName)||!meaningfulSocialTokenSymbol(r.symbol)||!r.tokenImage||number(r.priceAtPost)==null,live={};
  if(needsMeta&&r.chain&&r.token){
    live=await cachedSocialTokenSnapshot(r.chain,r.token,{});
    r={
      ...r,
      tokenName:meaningfulSocialTokenName(r.tokenName)?r.tokenName:(live.name||''),
      symbol:meaningfulSocialTokenSymbol(r.symbol)?r.symbol:(live.symbol||''),
      tokenImage:r.tokenImage||live.image||'',
      // Never pretend a live lookup is the historical posting price. Older
      // posts instead get a clearly-labelled current price fallback.
      currentPriceUsd:number(live.priceUsd)
    }
  }else if(r.chain&&r.token){
    // Still provide a current price for feed cards when it is cheap/cached.
    const cached=socialTokenSnapshotCache.get(`${cleanChain(r.chain)}:${String(r.token).toLowerCase()}`);
    if(cached)r.currentPriceUsd=number(cached.value?.priceUsd)
  }
  const postId=r.postId||socialPostId(r.wallet,r.chain,r.token),st=await readSocialPostState(postId,viewerWallet);
  return{...r,postId,likeCount:st.likeCount,replyCount:st.replyCount,quoteCount:st.quoteCount,liked:st.liked}
}
async function socialPostActionsHandler(req,res){res.setHeader('Cache-Control','no-store');try{const postId=String(req.method==='GET'?req.query.postId:(typeof req.body==='string'?JSON.parse(req.body||'{}')?.postId:req.body?.postId)||'').trim(),parsed=parseSocialPostId(postId);if(!parsed)return res.status(400).json({error:'Valid thesis post required.'});const reviewRaw=await kv('get',socialKey(parsed.chain,parsed.token)),reviewList=reviewRaw?JSON.parse(reviewRaw):[],original=reviewList.find(r=>String(r.wallet)===parsed.wallet);if(!original)return res.status(404).json({error:'That thesis is no longer available.'});const viewer=await socialSessionWallet(req);if(req.method==='GET'){const st=await readSocialPostState(postId,viewer);return res.status(200).json({...st,likes:undefined})}if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});if(!viewer)return res.status(401).json({error:'Connect your Trenches Social wallet to interact.'});const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},action=String(body.action||'').toLowerCase(),text=cleanSocialComment(body.text),profileRaw=await kv('get',`salt:social:profile:${viewer}`);if(!profileRaw)return res.status(403).json({error:'Create a Trenches profile first.'});const profile=JSON.parse(profileRaw),state=await readSocialPostState(postId,viewer);if(action==='like'){const i=state.likes.indexOf(viewer);if(i>=0)state.likes.splice(i,1);else state.likes.push(viewer)}else if(action==='reply'||action==='quote'){if(text.length<1)return res.status(400).json({error:`Write something before you ${action}.`});const list=action==='reply'?state.replies:state.quotes;list.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,wallet:viewer,username:profile.username,avatar:profile.avatar||'',text,createdAt:new Date().toISOString()});if(list.length>250)list.splice(0,list.length-250)}else return res.status(400).json({error:'Unknown post action.'});await kv('set',`salt:social:post:${postId}`,JSON.stringify({likes:state.likes,replies:state.replies,quotes:state.quotes}));const updated=await readSocialPostState(postId,viewer);return res.status(200).json({...updated,likes:undefined})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}

async function socialProfileFeedHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const wallet=safeSocialWallet(req.query.wallet);if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});const raw=await kv('get',`salt:social:feed:${wallet}`),reviews=raw?JSON.parse(raw):[],viewer=await socialSessionWallet(req),sorted=reviews.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,100),enriched=await Promise.all(sorted.map(r=>enrichSocialReview(r,viewer)));return res.status(200).json({reviews:enriched})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}

async function socialCommunityFeedHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const raw=await kv('get','salt:social:community-feed'),reviews=raw?JSON.parse(raw):[],viewer=await socialSessionWallet(req),sorted=reviews.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,150),enriched=await Promise.all(sorted.map(r=>enrichSocialReview(r,viewer)));return res.status(200).json({reviews:enriched})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function socialMarketHandler(req,res){res.setHeader('Cache-Control','public, max-age=30, s-maxage=60');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const resolve=String(req.query.resolve||'').trim();if(resolve){if(resolve.startsWith('ca:')){const parts=resolve.split(':'),chain=parts[1],mint=parts.slice(2).join(':');if(mint)return res.status(200).json({mint,chain:chain==='bsc'?'bnb':chain})}const native={bitcoin:{mint:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',chain:'ethereum'},ethereum:{mint:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',chain:'ethereum'},solana:{mint:SOL_MINT,chain:'solana'},binancecoin:{mint:'0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',chain:'bnb'},dogecoin:{mint:'0xbA2aE424d960c26247Dd6c32edC70B295c744C43',chain:'bnb'}};if(native[resolve])return res.status(200).json(native[resolve]);const coin=await fetchJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(resolve)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,{headers:{accept:'application/json'}},8000),platforms=coin?.platforms||{};const choices=[['solana','solana'],['ethereum','ethereum'],['binance-smart-chain','bnb'],['base','base']];for(const [platform,chain] of choices){const mint=String(platforms?.[platform]||'').trim();if(mint)return res.status(200).json({mint,chain,name:coin?.name||resolve,symbol:coin?.symbol||''})}return res.status(404).json({error:'This coin does not have a supported Solana/EVM contract in Salt Checker yet.'})}const q=String(req.query.q||'').trim();if(q){const looksSol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q),looksEvm=/^0x[a-fA-F0-9]{40}$/.test(q);if(!looksSol&&!looksEvm)return res.status(400).json({error:'Paste a valid contract address (CA). Name/ticker search is disabled for Add Ticker.'});if(looksSol||looksEvm){try{const chains=looksSol?['solana']:['ethereum','bsc','base','robinhood'];for(const chain of chains){try{const pairs=await fetchJson(`https://api.dexscreener.com/token-pairs/v1/${chain}/${encodeURIComponent(q)}`,{headers:{accept:'application/json'}},8000),pair=(Array.isArray(pairs)?pairs:[]).sort((a,b)=>number(b?.liquidity?.usd)-number(a?.liquidity?.usd))[0];if(pair){const base=String(pair?.baseToken?.address||'').toLowerCase()===q.toLowerCase()?pair.baseToken:pair.quoteToken;const tok=base||pair.baseToken;return res.status(200).json({results:[{id:`ca:${chain}:${q}`,symbol:tok?.symbol||'TOKEN',name:tok?.name||'Contract token',image:normalizeTokenIcon(pair?.info?.imageUrl)||'',price:number(pair?.priceUsd),change24h:number(pair?.priceChange?.h24),contract:q,chain:chain==='bsc'?'bnb':chain}]})}}catch{}}}catch{}return res.status(200).json({results:[]})}return res.status(200).json({results:[]})}const pinned=['bitcoin','ethereum','solana','binancecoin','dogecoin'];const trending=await fetchJson('https://api.coingecko.com/api/v3/search/trending',{headers:{accept:'application/json'}},8000),trendIds=(trending?.coins||[]).map(x=>x?.item?.id).filter(Boolean).filter(x=>!pinned.includes(x)).slice(0,15),ids=[...pinned,...trendIds],markets=await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(','))}&price_change_percentage=24h`,{headers:{accept:'application/json'}},8000),byId=Object.fromEntries((markets||[]).map(x=>[x.id,x])),ordered=ids.map(id=>byId[id]).filter(Boolean).map(x=>({id:x.id,symbol:x.symbol,name:x.name,image:x.image||'',price:number(x.current_price),change24h:number(x.price_change_percentage_24h)}));return res.status(200).json({coins:ordered})}catch(e){return res.status(500).json({error:errorText(e)})}}
let socialNewsCache={at:0,articles:[]};
function xmlText(v=''){return String(v).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()}
function xmlTag(block,tag){const m=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?xmlText(m[1]):''}
function rssImage(block){const patterns=[/<media:content[^>]+url=["']([^"']+)["']/i,/<media:thumbnail[^>]+url=["']([^"']+)["']/i,/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i,/<img[^>]+src=["']([^"']+)["']/i];for(const p of patterns){const m=block.match(p);if(m?.[1])return m[1].replace(/&amp;/g,'&')}return ''}
async function readCryptoRss(source,url){try{const r=await fetch(url,{headers:{accept:'application/rss+xml, application/xml, text/xml, */*','user-agent':'SaltSwap-News/1.0'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const xml=await r.text(),items=[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m=>m[0]);return items.slice(0,15).map(block=>{const title=xmlTag(block,'title'),link=xmlTag(block,'link')||xmlTag(block,'guid'),date=xmlTag(block,'pubDate')||xmlTag(block,'dc:date');return{title,url:link,publishedAt:date?new Date(date).toISOString():new Date().toISOString(),image:rssImage(block),source}}).filter(x=>x.title&&/^https?:\/\//i.test(x.url))}catch(e){console.warn('Crypto RSS '+source+':',e.message);return[]}}
async function socialNewsHandler(req,res){res.setHeader('Cache-Control','public, max-age=120, s-maxage=300, stale-while-revalidate=600');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const force=String(req.query.refresh||'')==='1';if(!force&&socialNewsCache.articles.length&&Date.now()-socialNewsCache.at<5*60*1000)return res.status(200).json({articles:socialNewsCache.articles,cached:true});const feeds=[['CoinDesk','https://www.coindesk.com/arc/outboundfeeds/rss/'],['Cointelegraph','https://cointelegraph.com/rss'],['Decrypt','https://decrypt.co/feed'],['The Block','https://www.theblock.co/rss.xml'],['Bitcoin Magazine','https://bitcoinmagazine.com/feed'],['CryptoSlate','https://cryptoslate.com/feed/']];const batches=await Promise.all(feeds.map(([n,u])=>readCryptoRss(n,u))),seen=new Set(),articles=batches.flat().sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).filter(a=>{const k=a.title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(seen.has(k))return false;seen.add(k);return true}).slice(0,40);if(articles.length)socialNewsCache={at:Date.now(),articles};return res.status(200).json({articles:articles.length?articles:socialNewsCache.articles,cached:false})}catch(e){return res.status(500).json({error:errorText(e)})}}

async function socialReviewsHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method==='GET'){const chain=cleanChain(req.query.chain),token=cleanToken(req.query.token);if(!chain||!token)return res.status(400).json({error:'Chain and token are required.'});const raw=await kv('get',socialKey(chain,token)),reviews=raw?JSON.parse(raw):[],avg=reviews.length?reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length:0;return res.status(200).json({average:avg,count:reviews.length,reviews:reviews.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,100)})}if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{},chain=cleanChain(b.chain),token=cleanToken(b.token),rating=Number(b.rating),text=String(b.text||'').trim().slice(0,600),link=cleanLink(b.link);if(!chain||!token||!Number.isInteger(rating)||rating<0||rating>10||text.length<5)return res.status(400).json({error:'Valid token, 0–10 rating and thesis are required.'});
let wallet=await socialSessionWallet(req);
// Backward compatibility: an older build may still send a per-post wallet signature.
if(!wallet){const legacyWallet=safeSocialWallet(b.wallet),message=String(b.message||''),signature=String(b.signature||''),expected=`The Trenches review\nWallet: ${legacyWallet}\nChain: ${chain}\nToken: ${token}\nRating: ${rating}\nText: ${text}\nLink: ${link}`,legacyExpected=`Salt Swap review\nWallet: ${legacyWallet}\nChain: ${chain}\nToken: ${token}\nRating: ${rating}\nText: ${text}\nLink: ${link}`;if(legacyWallet&&signature&&(message===expected||message===legacyExpected)&&await verifySolMessage(legacyWallet,message,signature)){wallet=legacyWallet;await setSocialSession(res,req,wallet)}}
if(!wallet)return res.status(401).json({error:'Your Trenches Social session expired. Connect your Solana wallet and sign in once to keep posting.'});
const claimed=safeSocialWallet(b.wallet);if(claimed&&claimed!==wallet)return res.status(403).json({error:'The connected social session does not match that profile wallet.'});
const pr=await kv('get',`salt:social:profile:${wallet}`);if(!pr)return res.status(403).json({error:'Create a Trenches profile before posting theses.'});const profile=JSON.parse(pr),key=socialKey(chain,token),raw=await kv('get',key),reviews=raw?JSON.parse(raw):[],now=new Date().toISOString(),i=reviews.findIndex(r=>r.wallet===wallet),fallbackSnapshot={name:String(b.tokenName||'').slice(0,100),symbol:String(b.symbol||'').slice(0,20),priceUsd:number(b.priceUsd),image:String(b.tokenImage||'')},snapshot=await cachedSocialTokenSnapshot(chain,token,fallbackSnapshot),postId=socialPostId(wallet,chain,token),review={wallet,username:profile.username,avatar:profile.avatar||'',chain,token,postId,rating,text,link,tokenName:snapshot.name||reviews[i]?.tokenName||'',symbol:snapshot.symbol||reviews[i]?.symbol||'',priceAtPost:number(snapshot.priceUsd)??number(reviews[i]?.priceAtPost),tokenImage:snapshot.image||reviews[i]?.tokenImage||'',createdAt:i>=0?reviews[i].createdAt:now,updatedAt:now};if(i>=0)reviews[i]=review;else reviews.push(review);await kv('set',key,JSON.stringify(reviews.slice(-500)));const feedKey=`salt:social:feed:${wallet}`,feedRaw=await kv('get',feedKey),feed=feedRaw?JSON.parse(feedRaw):[],fi=feed.findIndex(r=>r.chain===chain&&r.token===token);if(fi>=0)feed[fi]=review;else feed.push(review);await kv('set',feedKey,JSON.stringify(feed.slice(-250)));const globalKey='salt:social:community-feed',globalRaw=await kv('get',globalKey),globalFeed=globalRaw?JSON.parse(globalRaw):[],gi=globalFeed.findIndex(r=>r.wallet===wallet&&r.chain===chain&&r.token===token);if(gi>=0)globalFeed[gi]=review;else globalFeed.push(review);await kv('set',globalKey,JSON.stringify(globalFeed.slice(-1000)));const avg=reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length;return res.status(200).json({ok:true,review,average:avg,count:reviews.length})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}

async function healthHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({ok:true,service:'The Trenches scanner',version:'1.11.32',providers:{helius:Boolean(process.env.HELIUS_API_KEY),birdeye:Boolean(process.env.BIRDEYE_API_KEY),jupiter:Boolean(process.env.JUPITER_API_KEY),zerox:Boolean(process.env.ZEROX_API_KEY),social:Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN)}});
}

export default async function handler(req,res){
  try{
    const route=String(req.query?.route||'').toLowerCase();
    if(route==='health')return healthHandler(req,res);
    if(route==='scan')return scanHandler(req,res);
    if(route==='scan-chart')return scanChartHandler(req,res);
    if(route==='quote')return quoteHandler(req,res);
    if(route==='execute')return executeHandler(req,res);
    if(route==='tokens')return tokensHandler(req,res);
    if(route==='trending-market')return trendingMarketHandler(req,res);
    if(route==='evm-quote')return evmQuoteHandler(req,res);
    if(route==='evm-tokens')return evmTokensHandler(req,res);
    if(route==='quick-swap-preview')return quickSwapPreviewHandler(req,res);
    if(route==='quick-swap-quote')return quickSwapQuoteHandler(req,res);
    if(route==='quick-swap-sol-submit')return quickSwapSolSubmitHandler(req,res);
    if(route==='quick-swap-status')return quickSwapStatusHandler(req,res);
    if(route==='social-auth')return socialAuthHandler(req,res);
    if(route==='social-profile')return socialProfileHandler(req,res);
    if(route==='social-nfts')return socialNftsHandler(req,res);
    if(route==='social-nft-detail')return socialNftDetailHandler(req,res);
    if(route==='swap-balance')return swapBalanceHandler(req,res);
    if(route==='portfolio')return portfolioHandler(req,res);
    if(route==='portfolio-history')return portfolioHistoryHandler(req,res);
    if(route==='portfolio-time-machine')return portfolioTimeMachineHandler(req,res);     if(route==='social-holdings')return socialHoldingsHandler(req,res);
    if(route==='social-profile-feed')return socialProfileFeedHandler(req,res);
    if(route==='social-community-feed')return socialCommunityFeedHandler(req,res);
    if(route==='social-market')return socialMarketHandler(req,res);
    if(route==='social-news')return socialNewsHandler(req,res);
    if(route==='social-reviews')return socialReviewsHandler(req,res);
    if(route==='social-post-actions')return socialPostActionsHandler(req,res);
    return res.status(404).json({error:'Trenches API route not found.'});
  }catch(e){
    console.error('Salt API router error',e);
    return res.status(500).json({error:errorText(e)});
  }
}
