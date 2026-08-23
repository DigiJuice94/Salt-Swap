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

const metric=(value,status,detail,source='Salt')=>({value,status,detail,source});
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
    const detail=`DEX Screener shows paid-service evidence for this token: ${labels.join(', ')}. Salt checks paid orders plus active boosts, recent profiles, ads, and community takeovers. Paid promotion/identity work is useful context, not proof of safety.`;
    return metric(`Yes — ${labels.join(' + ')}`,'good',detail,`DEX Screener (${[...new Set(unique.map(x=>x.source))].join(' + ')})`);
  }
  const anyResponse=[orders,pairs,profiles,ads,ctos,boostLatest,boostTop].some(x=>x!=null);
  if(!anyResponse)return metric('Could not verify','unknown','DEX Screener data sources were unavailable for this scan. Salt will not guess whether DEX services were paid.','DEX Screener');
  return metric('No paid evidence found','unknown','Salt checked DEX Screener paid orders, active boosts, recent token profiles, ads, and community takeovers and found no paid-service evidence in the currently available API data. This is not treated as proof that a project never paid DEX Screener.','DEX Screener multi-source');
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
async function saltLaunchBundleAnalysis(mint,rpcUrl,supplyUi){const hit=BUNDLE_ANALYSIS_CACHE.get(mint);if(hit&&Date.now()-hit.time<300000)return hit.data;try{const trades=await birdeye(`/defi/txs/token?address=${encodeURIComponent(mint)}&offset=0&limit=50&tx_type=swap&sort_type=asc&ui_amount_mode=scaled`,'solana'),buys=rowsFrom(trades).filter(r=>isBuyTrade(r,mint)&&tradeHash(r)&&tradeOwner(r)).slice(0,40);if(buys.length<4)return null;const calls=buys.map((r,i)=>({jsonrpc:'2.0',id:1000+i,method:'getTransaction',params:[tradeHash(r),{encoding:'jsonParsed',maxSupportedTransactionVersion:0,commitment:'confirmed'}]})),txs=await fetchJson(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(calls)},15000),slots=new Map();for(const x of Array.isArray(txs)?txs:[]){const r=buys[Number(x.id)-1000],slot=number(x?.result?.slot);if(!r||slot==null)continue;if(!slots.has(slot))slots.set(slot,[]);slots.get(slot).push(r)}const bundled=new Set(),ordered=[...slots.keys()].sort((a,b)=>a-b);for(const slot of ordered){const rs=slots.get(slot)||[];if(rs.length>=4)rs.forEach(r=>bundled.add(tradeOwner(r)))}for(let i=0;i<ordered.length-1;i++){if(ordered[i+1]-ordered[i]>1)continue;const ws=new Set([...(slots.get(ordered[i])||[]),...(slots.get(ordered[i+1])||[])].map(tradeOwner).filter(Boolean));if(ws.size>=3)ws.forEach(w=>bundled.add(w))}if(!bundled.size)return{percent_of_supply:0,holder_count:0,_percentUnits:'percent',_source:'Salt launch bundle analysis'};const wallets=[...bundled].slice(0,30),bcalls=wallets.map((w,i)=>({jsonrpc:'2.0',id:2000+i,method:'getTokenAccountsByOwner',params:[w,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]})),bal=await fetchJson(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(bcalls)},15000);let held=0;for(const x of Array.isArray(bal)?bal:[])for(const a of x?.result?.value||[])held+=Number(a?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString||a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount||0);const data={percent_of_supply:supplyUi?held/supplyUi*100:null,holder_count:wallets.length,_percentUnits:'percent',_source:'Salt launch bundle analysis'};BUNDLE_ANALYSIS_CACHE.set(mint,{time:Date.now(),data});return data}catch(e){console.warn('Salt bundle analysis:',e.message);return null}}

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
  if(pct===0&&source==='Birdeye Holder Profile')return metric('No Birdeye-tagged wallets','unknown',`${description} Birdeye returned zero tagged ${label.toLowerCase()} wallets, but Salt does not treat an indexer zero as proof that none exist.`,source);
  if(pct===0&&source==='Salt launch bundle analysis')return metric('No launch bundle detected','good',`${description} Salt checked the sampled earliest swaps for same-slot/adjacent-slot coordinated buying and found no qualifying launch bundle in that sample.`,source);
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
  const creatorHistory=creator?metric(creator.mintLike?`${creator.mintLike} recent mint/create event${creator.mintLike===1?'':'s'}`:'Creator identified',creator.mintLike>=3?'warn':'good',`Salt traced a likely launch signer ${creator.address.slice(0,6)}…${creator.address.slice(-4)}. Helius returned ${creator.recentCount} recent parsed transactions${creator.createdAt?` and the earliest sampled mint activity was ${new Date(creator.createdAt*1000).toLocaleDateString('en-US')}`:''}. This is creator-wallet context, not proof of every prior deployment.`,'Helius launch history'):metric('Could not verify','unknown','Salt could not reliably trace a creator wallet from the mint history for this scan.','Salt');
  return {mint,chain:'solana',name,symbol,decimals,logoUri,logoUris,identitySource,verified,priceUsd,marketCapUsd,...s,
    summary:s.hardRiskOverride?`HIGH RISK override triggered: ${s.hardRiskReasons.join('; ')}. Salt completed ${s.checksCompleted}/${s.checksTotal} core checks. The numerical Salt Score is still shown, but positive checks cannot cancel these severe structural risks.`:risks.length?`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks and found ${risks.join(', ')}.`:`Salt completed ${s.checksCompleted}/${s.checksTotal} core checks. No major warning was found in the data currently available.`,
    authenticity:metric('Mint confirmed','good','Helius confirmed a valid Solana token mint on-chain.','Helius'),
    sellable:metric(liq!=null?'Market found':'Not simulated',liq!=null?'good':'unknown',liq!=null?'Birdeye returned live market/liquidity data.':'A real swap-route simulation is a later Salt layer.',liq!=null?'Birdeye':'Salt'),
    mintAuthority:metric(mintable?'Active':'Revoked',mintable?'warn':'good',mintable?'Mint authority is still active. More supply could be created, increasing dilution risk; this alone does not force HIGH RISK.':'No active mint capability was detected.',security?'Helius + Birdeye':'Helius'),
    freezeAuthority:metric(freezable?'Active':'Revoked',freezable?'bad':'good',freezable?'Token accounts may be freezeable.':'No active freeze capability was detected.',security?'Helius + Birdeye':'Helius'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,statusPct(top10),top10==null?'Holder concentration was unavailable.':`Top 10 token accounts hold about ${top10.toFixed(1)}% of current supply.`,'Helius'),
    owner:cohortMetric(devTag,'Creator / dev',[3,10],'Salt checks Birdeye dev labels first, then falls back to the creator wallet traced from Solana launch history.'),
    bundled:cohortMetric(bundlerTag,'Bundler',[5,15],'Salt checks Birdeye labels first, then independently checks early trade slots when coverage is missing or reports zero.'),
    snipers:cohortMetric(sniperTag,'Sniper',[5,15],'Salt checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    insiders:cohortMetric(insiderTag,'Insider',[2,8],'Salt checks Birdeye Holder Profile first, then falls back to tagged Top Traders when available.'),
    smartTraders:cohortMetric(smartTag,'Smart trader',[101,102],'Salt checks Birdeye Holder Profile first, then tagged Top Traders for profitable-wallet participation.'),
    liquidity:metric(liq==null?'Unknown':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return liquidity for this token.':'Add BIRDEYE_API_KEY for market/liquidity intelligence.'):`Current indexed liquidity is about ${money(liq)}.`,liq==null?'Salt':'Birdeye'),
    holders:metric(holders==null?'Unknown':count(holders),holders==null?'unknown':'good',holders==null?(process.env.BIRDEYE_API_KEY?'Birdeye did not return a holder count.':'Add BIRDEYE_API_KEY for indexed holder data.'):'Current indexed holder count.','Birdeye'),
    dexPaid,
    duplicates:duplicateCheck||metric('Could not verify','unknown','Salt could not complete the secondary DEX identity search for this token.','Salt'),
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
  const marketSource=overview?'Birdeye':dex?'DEX Screener':'Salt';
  const securitySource=security?'Birdeye':gp?'GoPlus':'Salt';
  const logoUri=rhAsset?.logoUrl||dex?.imageUrl||field(overview,'logoURI','logo_uri','logo');
  const marketCapLabel=isRobinhoodStockToken?(companyMarketCapUsd!=null?'Company Market Cap':underlyingAumUsd!=null?'Underlying AUM':'Company Market Cap'):'Market Cap';
  return {mint:address,chain,name,symbol,decimals,logoUri,logoUris:[logoUri].filter(Boolean),verified:isRobinhoodStockToken,priceUsd,marketCapUsd,marketCapLabel,assetType:isRobinhoodStockToken?'robinhood_stock_token':'crypto_token',tokenizedMarketValueUsd,underlyingPriceUsd:number(rhPrice?.rawUnderlyingPriceUsd),stockTokenMultiplier:number(rhPrice?.multiplier),robinhoodAssetStatus:rhAsset?.status||null,...sc,summary:sc.hardRiskOverride?`HIGH RISK override triggered: ${sc.hardRiskReasons.join('; ')}. Salt confirmed the contract on ${chainLabel}. The numerical Salt Score is still shown, but positive checks cannot cancel these severe safety risks.`:`Salt confirmed the contract on ${chainLabel} and completed ${sc.checksCompleted}/${sc.checksTotal} core checks. Market data can fall back to DEX Screener and contract security can fall back to GoPlus when Birdeye is unavailable.`,
    authenticity:metric('Contract confirmed','good',`Deployed bytecode exists on ${chainLabel}.`,'EVM RPC'),
    sellable:metric(honeypot==null&&!cannotSell?'Could not verify':sellabilityBad?'Possible sell restriction':'No sell block detected',honeypot==null&&!cannotSell?'unknown':sellabilityBad?'bad':'good',cannotSell?'GoPlus reports a sell restriction.':honeypot===true?'A honeypot flag was returned.':'No current sell-block/honeypot signal was returned by the available security providers.',securitySource),
    honeypot:metric(honeypot==null?'Could not verify':honeypot?'Detected':'Not detected',honeypot==null?'unknown':honeypot?'bad':'good','Current token-security honeypot signal.',securitySource),
    taxes:metric(buyTax!=null||sellTax!=null?`${buyTax??'?'}% buy / ${sellTax??'?'}% sell`:'Could not verify',buyTax==null&&sellTax==null?'unknown':maxTax>=20?'bad':maxTax>=8?'warn':'good','Current token tax data from the available security provider.',securitySource),
    mintAuthority:metric(mintable==null?'Could not verify':mintable?'Mintable':'Not mintable',mintable==null?'unknown':mintable?'warn':'good',mintable?'Mint capability is active. This is a dilution warning, but does not force HIGH RISK by itself.':'No mint capability was detected by the available security provider.',securitySource),
    ownerControl:metric(blacklist==null?'Could not verify':blacklist?'Blacklist control':'No blacklist flag',blacklist==null?'unknown':blacklist?'warn':'good','Owner/control blacklist risk signal.',securitySource),
    proxyRisk:metric(proxy==null?'Could not verify':proxy?'Upgradeable / proxy':'No proxy flag',proxy==null?'unknown':proxy?'warn':'good','Proxy/upgradeability signal.',securitySource),
    top10:metric(top10==null?'Could not verify':`${top10.toFixed(1)}%`,top10==null?'unknown':statusPct(top10),top10==null?'Holder concentration was not available from the current providers.':`Top 10 indexed holders account for about ${top10.toFixed(1)}% of supply.`,'GoPlus'),
    owner:metric(ownerPct==null?'Could not verify':`${ownerPct.toFixed(1)}%`,ownerPct==null?'unknown':ownerPct<5?'good':ownerPct<15?'warn':'bad',ownerPct==null?'Owner share was not returned.':`Indexed contract owner/deployer share is about ${ownerPct.toFixed(1)}%.`,'GoPlus'),
    bundled:metric('Could not verify','unknown','EVM linked-wallet bundle analysis is not yet implemented.','Salt'),snipers:metric('Could not verify','unknown','EVM launch-sniper analysis is not yet implemented.','Salt'),
    liquidity:metric(liq==null?'Could not verify':money(liq),liq==null?'unknown':liq>=100000?'good':liq>=20000?'warn':'bad',liq==null?'No current liquidity figure was returned by Birdeye or DEX Screener.':`Current indexed liquidity is about ${money(liq)}.` ,marketSource),
    holders:metric(holders==null?'Could not verify':count(holders),holders==null?'unknown':'good','Current indexed holder count.',holders==null?'Salt':overview?'Birdeye':'GoPlus'),dexPaid,
    duplicates:metric('Needs identity graph','unknown','Official contract matching is a later Salt layer.','Salt'),creatorHistory:metric('Needs history','unknown','Deployer history is a later Salt layer.','Salt')};
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
  }catch(e){console.error('Salt scan error',e);const message=errorText(e?.message??e);return res.status(Number(e?.status)||500).json({error:message||'Salt scanner failed.'});}
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
async function jupiterTokens(path){const key=jupiterKey();return fetchJson(`${JUPITER_TOKENS_BASE}${path}`,{headers:{accept:'application/json','x-api-key':key}},10000)}
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
async function socialProfileHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method==='GET'){if(req.query.username){const username=cleanUsername(req.query.username);if(!username)return res.status(400).json({error:'Valid username required.'});const owner=await kv('get',`salt:social:username:${username.toLowerCase()}`);return res.status(200).json({username,available:!owner,owner:owner||null})}const wallet=safeSocialWallet(req.query.wallet);if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});const raw=await kv('get',`salt:social:profile:${wallet}`);return res.status(200).json(raw?JSON.parse(raw):null)}if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{},wallet=safeSocialWallet(b.wallet),message=String(b.message||''),signature=String(b.signature||'');if(!wallet)return res.status(400).json({error:'Valid wallet is required.'});if(b.action==='appearance'){const banner=String(b.banner||''),favorites=Array.isArray(b.favorites)?b.favorites.slice(0,2).map(x=>({id:String(x?.id||'').slice(0,100),name:String(x?.name||'NFT').slice(0,100),image:normalizeTokenIcon(x?.image)||''})):[];if(banner&&(!banner.startsWith('data:image/jpeg;base64,')||banner.length>600000))return res.status(400).json({error:'Banner image is invalid or too large.'});const data=JSON.stringify({banner,favorites}),expected=`Salt Swap profile appearance\nWallet: ${wallet}\nData: ${data}`;if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet signature could not be verified.'});const oldRaw=await kv('get',`salt:social:profile:${wallet}`);if(!oldRaw)return res.status(404).json({error:'Create your Salt profile first.'});const old=JSON.parse(oldRaw),profile={...old,banner,favorites,updatedAt:new Date().toISOString()};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));return res.status(200).json(profile)}const username=cleanUsername(b.username),avatar=String(b.avatar||''),avatarHash=String(b.avatarHash||'none');if(!username)return res.status(400).json({error:'Valid wallet and username are required.'});if(avatar&&(!avatar.startsWith('data:image/jpeg;base64,')||avatar.length>180000))return res.status(400).json({error:'Profile picture is invalid or too large.'});const expected=`Salt Swap profile\nWallet: ${wallet}\nUsername: ${username}\nAvatar: ${avatarHash}`;if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet signature could not be verified.'});const digest=avatar?await crypto.subtle.digest('SHA-256',new TextEncoder().encode(avatar)):null,serverHash=digest?[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join(''):'none';if(serverHash!==avatarHash)return res.status(400).json({error:'Profile picture verification failed.'});const now=new Date().toISOString(),oldRaw=await kv('get',`salt:social:profile:${wallet}`),old=oldRaw?JSON.parse(oldRaw):null,userKey=`salt:social:username:${username.toLowerCase()}`,existingOwner=await kv('get',userKey);if(existingOwner&&existingOwner!==wallet)return res.status(409).json({error:'That username is already taken. Pick another one.'});if(!existingOwner){const claimed=await kv('set',userKey,wallet,'nx');if(!claimed){const winner=await kv('get',userKey);if(winner!==wallet)return res.status(409).json({error:'That username was just claimed. Pick another one.'})}}if(old?.username&&old.username.toLowerCase()!==username.toLowerCase()){const oldKey=`salt:social:username:${old.username.toLowerCase()}`,oldOwner=await kv('get',oldKey);if(oldOwner===wallet)await kv('del',oldKey)}const profile={wallet,username,avatar:avatar||'',banner:old?.banner||'',favorites:old?.favorites||[],createdAt:old?.createdAt||now,updatedAt:now};await kv('set',`salt:social:profile:${wallet}`,JSON.stringify(profile));return res.status(200).json(profile)}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function socialNftsHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const wallet=safeSocialWallet(req.query.wallet),key=process.env.HELIUS_API_KEY;if(!wallet)return res.status(400).json({error:'Valid Solana wallet required.'});if(!key)return res.status(503).json({error:'NFT lookup needs HELIUS_API_KEY configured in Vercel.'});const j=await fetchJson(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'salt-social-nfts',method:'getAssetsByOwner',params:{ownerAddress:wallet,page:1,limit:100,displayOptions:{showFungible:false}}})},12000),items=(j?.result?.items||[]).filter(a=>{const i=String(a?.interface||'').toLowerCase();return i.includes('nft')||i.includes('programmablenft')}).map(a=>({id:String(a.id||''),name:String(a?.content?.metadata?.name||a?.content?.metadata?.symbol||'NFT'),image:heliusAssetImage(a)})).filter(a=>a.id&&a.image).slice(0,60);return res.status(200).json({items})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}
async function socialReviewsHandler(req,res){res.setHeader('Cache-Control','no-store');try{if(req.method==='GET'){const chain=cleanChain(req.query.chain),token=cleanToken(req.query.token);if(!chain||!token)return res.status(400).json({error:'Chain and token are required.'});const raw=await kv('get',socialKey(chain,token)),reviews=raw?JSON.parse(raw):[],avg=reviews.length?reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length:0;return res.status(200).json({average:avg,count:reviews.length,reviews:reviews.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,100)})}if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{},wallet=safeSocialWallet(b.wallet),chain=cleanChain(b.chain),token=cleanToken(b.token),rating=Number(b.rating),text=String(b.text||'').trim().slice(0,600),link=cleanLink(b.link),message=String(b.message||''),signature=String(b.signature||'');if(!wallet||!chain||!token||!Number.isInteger(rating)||rating<0||rating>10||text.length<5)return res.status(400).json({error:'Valid wallet, token, 0–10 rating and review are required.'});const expected=`Salt Swap review\nWallet: ${wallet}\nChain: ${chain}\nToken: ${token}\nRating: ${rating}\nText: ${text}\nLink: ${link}`;if(message!==expected||!await verifySolMessage(wallet,message,signature))return res.status(401).json({error:'Wallet signature could not be verified.'});const pr=await kv('get',`salt:social:profile:${wallet}`);if(!pr)return res.status(403).json({error:'Create a Salt profile before reviewing tokens.'});const profile=JSON.parse(pr),key=socialKey(chain,token),raw=await kv('get',key),reviews=raw?JSON.parse(raw):[],now=new Date().toISOString(),i=reviews.findIndex(r=>r.wallet===wallet),review={wallet,username:profile.username,avatar:profile.avatar||'',chain,token,rating,text,link,createdAt:i>=0?reviews[i].createdAt:now,updatedAt:now};if(i>=0)reviews[i]=review;else reviews.push(review);await kv('set',key,JSON.stringify(reviews.slice(-500)));const avg=reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length;return res.status(200).json({ok:true,review,average:avg,count:reviews.length})}catch(e){return res.status(Number(e?.status)||500).json({error:errorText(e)})}}

async function healthHandler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({ok:true,service:'Salt Swap scanner',version:'1.9.6',providers:{helius:Boolean(process.env.HELIUS_API_KEY),birdeye:Boolean(process.env.BIRDEYE_API_KEY),jupiter:Boolean(process.env.JUPITER_API_KEY),zerox:Boolean(process.env.ZEROX_API_KEY),social:Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN)}});
}

export default async function handler(req,res){
  try{
    const route=String(req.query?.route||'').toLowerCase();
    if(route==='health')return healthHandler(req,res);
    if(route==='scan')return scanHandler(req,res);
    if(route==='quote')return quoteHandler(req,res);
    if(route==='execute')return executeHandler(req,res);
    if(route==='tokens')return tokensHandler(req,res);
    if(route==='evm-quote')return evmQuoteHandler(req,res);
    if(route==='evm-tokens')return evmTokensHandler(req,res);
    if(route==='social-profile')return socialProfileHandler(req,res);
    if(route==='social-nfts')return socialNftsHandler(req,res);
    if(route==='social-reviews')return socialReviewsHandler(req,res);
    return res.status(404).json({error:'Salt API route not found.'});
  }catch(e){
    console.error('Salt API router error',e);
    return res.status(500).json({error:errorText(e)});
  }
}
