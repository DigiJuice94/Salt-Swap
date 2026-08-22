const SOL_RPCS=[process.env.SOLANA_RPC_URL,'https://api.mainnet-beta.solana.com','https://solana-rpc.publicnode.com'].filter(Boolean);

const ETH_RPC=process.env.ETH_RPC_URL||'https://ethereum-rpc.publicnode.com';
const BNB_RPC=process.env.BNB_RPC_URL||'https://bsc-dataseed.binance.org';
const GOPLUS='https://api.gopluslabs.io/api/v1';
const GOPLUS_TOKEN=process.env.GOPLUS_ACCESS_TOKEN||'';
const ZERO='0x0000000000000000000000000000000000000000';
const IMPL_SLOT='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const metric=(value,status,detail,source='Salt')=>({value,status,detail,source});
const clamp=n=>Math.max(0,Math.min(100,n));
const pct=v=>{const n=Number(v);return Number.isFinite(n)?(n<=1?n*100:n):null};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const yn=v=>v==='1'||v===1||v===true?true:v==='0'||v===0||v===false?false:null;
const money=n=>{n=Number(n);if(!Number.isFinite(n))return null;if(n>=1e9)return `$${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(n<10?2:0)}`;};
const count=n=>{n=Number(n);if(!Number.isFinite(n))return null;return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US');};
async function fetchJson(url,options={},timeout=6500){const controller=new AbortController();const t=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(url,{...options,signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(t);}}
function errText(v){if(v==null)return 'Unknown error';if(typeof v==='string')return v;if(typeof v==='object'){const x=v.message??v.error??v.details??v.reason;if(x!=null&&x!==v)return errText(x);try{return JSON.stringify(v);}catch{return 'Unknown error';}}return String(v);}async function jsonRpc(url,method,params){const j=await fetchJson(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})},7000);if(j.error)throw new Error(errText(j.error));return j.result;}
async function solRpc(method,params){let lastErr=null;for(const url of SOL_RPCS){try{return await jsonRpc(url,method,params);}catch(e){lastErr=e;}}throw new Error(`Solana RPC unavailable: ${errText(lastErr?.message??lastErr)}`);}
function gpHeaders(){return GOPLUS_TOKEN?{Authorization:`Bearer ${GOPLUS_TOKEN}`}:{ };}
function findResult(result,address){if(!result)return null;if(Array.isArray(result))return result[0]||null;if(typeof result!=='object')return null;if(result[address])return result[address];const lower=address.toLowerCase();const key=Object.keys(result).find(k=>k.toLowerCase()===lower);return key?result[key]:(result.metadata||result.holders||result.token_name?result:null);}
async function goPlusSol(mint){try{const j=await fetchJson(`${GOPLUS}/solana/token_security?contract_addresses=${encodeURIComponent(mint)}`,{headers:gpHeaders()});return findResult(j.result,mint);}catch(e){return null;}}
async function goPlusEvm(address,chainId){try{const j=await fetchJson(`${GOPLUS}/token_security/${chainId}?contract_addresses=${encodeURIComponent(address)}`,{headers:gpHeaders()});return findResult(j.result,address);}catch(e){return null;}}
function finalize(checks,critical=false){const known=checks.filter(x=>x&&x.known);const totalWeight=checks.reduce((s,x)=>s+(x?.weight||0),0)||1;const knownWeight=known.reduce((s,x)=>s+x.weight,0);const risk=known.reduce((s,x)=>s+x.weight*clamp(x.risk)/100,0);let score=knownWeight?Math.round(100-(risk/knownWeight)*100):null;if(critical&&score!=null)score=Math.min(score,20);const confidence=Math.round((knownWeight/totalWeight)*100);let tone='unknown',label='PRELIMINARY';if(score!=null&&confidence>=45){tone=score>=80?'good':score>=55?'warn':'bad';label=score>=80?'LOOKS HEALTHY':score>=55?'BE CAREFUL':'HIGH RISK';}return{score,confidence,checksCompleted:known.length,checksTotal:checks.length,label,tone};}
function statusFromPct(v,good=20,warn=40){return v==null?'unknown':v<good?'good':v<warn?'warn':'bad';}
function holderTop10(holders){if(!Array.isArray(holders)||!holders.length)return null;let sum=0,used=0;for(const h of holders.slice(0,10)){const p=pct(h.percent);if(p!=null){sum+=p;used++;}}return used?sum:null;}
function taggedPercent(holders,words){if(!Array.isArray(holders))return null;let sum=0,found=false;for(const h of holders){const tag=String(h.tag||'').toLowerCase();if(words.some(w=>tag.includes(w))){const p=pct(h.percent);if(p!=null){sum+=p;found=true;}}}return found?sum:null;}
function bestSolDex(gp){const arr=Array.isArray(gp?.dex)?gp.dex:Array.isArray(gp?.dex_info)?gp.dex_info:[];if(!arr.length)return null;return arr.map(d=>({...d,_tvl:num(d.tvl??d.liquidity)})).filter(d=>d._tvl!=null).sort((a,b)=>b._tvl-a._tvl)[0]||arr[0];}
function bestEvmDex(gp){const arr=Array.isArray(gp?.dex)?gp.dex:[];if(!arr.length)return null;return arr.map(d=>({...d,_liq:num(d.liquidity)})).filter(d=>d._liq!=null).sort((a,b)=>b._liq-a._liq)[0]||arr[0];}
function solFeature(gp,key){const x=gp?.[key];if(x==null)return null;if(typeof x==='object')return yn(x.status);return yn(x);}
async function scanSolana(mint){
  const [info,supply,largest,gp]=await Promise.all([
    solRpc('getAccountInfo',[mint,{encoding:'jsonParsed',commitment:'confirmed'}]),
    solRpc('getTokenSupply',[mint,{commitment:'confirmed'}]),
    solRpc('getTokenLargestAccounts',[mint,{commitment:'confirmed'}]),
    goPlusSol(mint)
  ]);
  const parsed=info?.value?.data?.parsed?.info;if(!parsed)throw new Error('Mint account was not found or is not a standard SPL/SPL-2022 token mint.');
  const rawSupply=Number(supply?.value?.uiAmountString??supply?.value?.uiAmount??0);
  const rpcVals=(largest?.value||[]).map(x=>Number(x.uiAmountString||x.uiAmount||0));
  const rpcTop10=rawSupply>0?rpcVals.slice(0,10).reduce((a,b)=>a+b,0)/rawSupply*100:null;
  const gpHolders=Array.isArray(gp?.holders)?gp.holders:[];
  const top10=holderTop10(gpHolders)??rpcTop10;
  const creatorPct=taggedPercent(gpHolders,['creator','deployer','owner']);
  const mintable=gp?solFeature(gp,'mintable'):(parsed.mintAuthority!=null);
  const freezable=gp?solFeature(gp,'freezable'):(parsed.freezeAuthority!=null);
  const closable=solFeature(gp,'closable');
  const balanceMutable=solFeature(gp,'balance_mutable_authority');
  const nonTransfer=yn(gp?.non_transferable);
  const transferHook=!!gp?.transfer_hook?.address;
  const hookMalicious=yn(gp?.transfer_hook?.malicious_address)===true;
  const defaultFrozen=String(gp?.default_account_state??'')==='2';
  const trusted=yn(gp?.trusted_token)===true;
  const metadata=gp?.metadata||{};
  const name=metadata.name||'Solana token';const symbol=metadata.symbol||'TOKEN';
  const dex=bestSolDex(gp);const liquidity=num(dex?._tvl??dex?.tvl??dex?.liquidity);const holderCount=num(gp?.holder_count??gp?.holders_count);
  const maliciousCreator=Array.isArray(gp?.creator)?gp.creator.some(c=>yn(c.malicious_address)===true):yn(gp?.creator?.malicious_address)===true;
  const checks=[
    {known:true,weight:8,risk:0},
    {known:mintable!=null,weight:12,risk:mintable?80:0},
    {known:freezable!=null,weight:11,risk:freezable?75:0},
    {known:top10!=null,weight:13,risk:top10==null?0:top10>=70?100:top10>=50?80:top10>=35?55:top10>=20?25:5},
    {known:liquidity!=null,weight:12,risk:liquidity==null?0:liquidity<5000?100:liquidity<20000?75:liquidity<50000?45:liquidity<150000?20:5},
    {known:nonTransfer!=null,weight:10,risk:nonTransfer?100:0},
    {known:gp!=null,weight:8,risk:(transferHook||defaultFrozen)?(hookMalicious?100:65):0},
    {known:closable!=null,weight:8,risk:closable?90:0},
    {known:balanceMutable!=null,weight:10,risk:balanceMutable?100:0},
    {known:maliciousCreator!=null,weight:8,risk:maliciousCreator?100:0},
    {known:creatorPct!=null,weight:8,risk:creatorPct==null?0:creatorPct>=20?95:creatorPct>=10?60:creatorPct>=5?30:5},
    {known:trusted||metadata.name||metadata.symbol,weight:4,risk:trusted?0:10}
  ];
  const critical=nonTransfer===true||defaultFrozen||hookMalicious||balanceMutable===true;
  const s=finalize(checks,critical);
  const topStatus=statusFromPct(top10,20,40);const liqStatus=liquidity==null?'unknown':liquidity>=100000?'good':liquidity>=20000?'warn':'bad';
  const creatorStatus=creatorPct==null?'unknown':creatorPct<5?'good':creatorPct<12?'warn':'bad';
  const transferFee=num(gp?.transfer_fee?.current_fee_rate?.fee_rate);const feePct=transferFee!=null?transferFee/100:null;
  const riskBits=[];if(mintable)riskBits.push('mint authority');if(freezable)riskBits.push('freeze authority');if(nonTransfer)riskBits.push('non-transferable token');if(defaultFrozen)riskBits.push('new accounts default to frozen');if(balanceMutable)riskBits.push('balance-changing authority');if(top10!=null&&top10>=40)riskBits.push('concentrated ownership');if(liquidity!=null&&liquidity<20000)riskBits.push('thin liquidity');
  const summary=riskBits.length?`Salt verified ${s.checksCompleted} of ${s.checksTotal} core Solana checks and found ${riskBits.slice(0,3).join(', ')}${riskBits.length>3?' plus other warnings':''}. Review the red and yellow items before trading.`:`Salt verified ${s.checksCompleted} of ${s.checksTotal} core Solana checks and found no major warning in the data currently available. Missing advanced wallet-cluster data is still shown as unknown.`;
  return{mint,chain:'solana',name,symbol,verified:trusted,...s,summary,
    authenticity:metric(trusted?'Known token':'Mint confirmed',trusted?'good':'unknown',trusted?'GoPlus marks this token as trusted.':'The mint exists on Solana. Official-project identity/dupe verification still needs social and project matching.',gp?'GoPlus + Solana RPC':'Solana RPC'),
    sellable:metric(nonTransfer===true?'Transfers blocked':defaultFrozen?'Default frozen':dex?'DEX market found':'Not confirmed',nonTransfer||defaultFrozen?'bad':dex?'good':'unknown',nonTransfer?'This token is marked non-transferable.':defaultFrozen?'New token accounts default to frozen.':dex?'GoPlus reports an active DEX pool. This is not the same as a full wallet-specific sell simulation.':'No DEX market was confirmed by the current sources.',gp?'GoPlus':'Solana RPC'),
    mintAuthority:metric(mintable==null?'Unknown':mintable?'Active':'Disabled',mintable==null?'unknown':mintable?'bad':'good',mintable?'Additional supply can still be minted.':'No active mint capability was detected.',gp?'GoPlus + RPC':'Solana RPC'),
    freezeAuthority:metric(freezable==null?'Unknown':freezable?'Active':'Disabled',freezable==null?'unknown':freezable?'bad':'good',freezable?'The developer may be able to freeze token accounts.':'No active freeze capability was detected.',gp?'GoPlus + RPC':'Solana RPC'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,topStatus,top10==null?'Holder concentration could not be calculated.':`The top 10 token accounts hold about ${top10.toFixed(1)}% of supply${gpHolders.length?' using indexed holder data':' using raw RPC token accounts'}.`,gpHolders.length?'GoPlus':'Solana RPC'),
    owner:metric(creatorPct==null?'Not identified':`${creatorPct.toFixed(1)}%`,creatorStatus,creatorPct==null?'Salt did not find a reliably tagged creator/deployer holding in the available top-holder data. This does not prove the creator owns 0%.':`Tagged creator/deployer accounts in the available holder data control about ${creatorPct.toFixed(1)}%.`,'GoPlus'),
    bundled:metric('Needs wallet graph','unknown','True bundle percentage requires funding-source and linked-wallet clustering. Salt does not infer it from top holders alone.','Salt'),
    snipers:metric('Needs launch history','unknown','Accurate sniper share requires launch-time transaction ordering and early-buyer attribution.','Salt'),
    liquidity:metric(liquidity==null?'Unknown':money(liquidity),liqStatus,liquidity==null?'No indexed DEX TVL was available.':`Largest detected pool${dex?.dexname?` on ${dex.dexname}`:''} has roughly ${money(liquidity)} TVL.`,'GoPlus'),
    holders:metric(holderCount==null?(gpHolders.length?`${gpHolders.length}+ indexed`:'Unknown'):count(holderCount),holderCount!=null?'good':'unknown',holderCount!=null?'Indexed holder count returned by the security provider.':gpHolders.length?'Top holder data is available, but a total holder count was not returned.':'Holder count was not available.','GoPlus'),
    transferControl:metric(nonTransfer?'Non-transferable':defaultFrozen?'Default frozen':transferHook?'Transfer hook':'Normal',nonTransfer||defaultFrozen||hookMalicious?'bad':transferHook?'warn':'good',nonTransfer?'Transfers are disabled by token design.':defaultFrozen?'New accounts default to frozen.':transferHook?`A transfer hook is configured${hookMalicious?' and its address is flagged malicious':''}.`:'No non-transferable/default-frozen warning was detected.',gp?'GoPlus':'Salt'),
    token2022Controls:metric(balanceMutable?'Balance mutable':closable?'Closable':feePct!=null?`${feePct.toFixed(2)}% transfer fee`:'No major flag',balanceMutable||closable?'bad':feePct!=null&&feePct>5?'warn':gp?'good':'unknown',balanceMutable?'An authority may be able to alter user token balances.':closable?'The token program configuration is reported as closable.':feePct!=null?`Current transfer fee is approximately ${feePct.toFixed(2)}%.`:'No additional SPL-2022 control warning was returned.',gp?'GoPlus':'Salt'),
    duplicates:metric('Needs identity graph','unknown','Dupe detection needs official website/social CA matching plus competing token metadata.','Salt'),
    creatorHistory:metric(maliciousCreator===true?'Creator flagged':maliciousCreator===false?'No flag found':'Unknown',maliciousCreator?'bad':maliciousCreator===false?'good':'unknown',maliciousCreator?'The provider flags a creator address as malicious.':'No malicious-creator flag was returned; this is not a full deployer-history audit.','GoPlus')
  };
}
function decodeUint(hex){try{return BigInt(hex||'0x0');}catch{return null;}}
function decodeAddress(hex){if(!hex||hex==='0x'||hex.length<66)return null;return '0x'+hex.slice(-40).toLowerCase();}
function decodeString(hex){try{if(!hex||hex==='0x')return null;const raw=hex.slice(2);if(raw.length===64){return Buffer.from(raw,'hex').toString('utf8').replace(/\0/g,'').trim()||null;}if(raw.length<128)return null;const offset=Number(BigInt('0x'+raw.slice(0,64)))*2;const len=Number(BigInt('0x'+raw.slice(offset,offset+64)));return Buffer.from(raw.slice(offset+64,offset+64+len*2),'hex').toString('utf8').replace(/\0/g,'').trim()||null;}catch{return null;}}
async function safeCall(url,to,data){try{return await jsonRpc(url,'eth_call',[{to,data},'latest']);}catch{return null;}}
async function evmExists(url,address){try{const c=await jsonRpc(url,'eth_getCode',[address,'latest']);return !!c&&c!=='0x'&&c!=='0x0';}catch{return false;}}
async function detectEvm(address,preferred){if(preferred==='ethereum')return{chain:'ethereum',url:ETH_RPC,id:'1'};if(preferred==='bnb')return{chain:'bnb',url:BNB_RPC,id:'56'};const [eth,bnb]=await Promise.all([evmExists(ETH_RPC,address),evmExists(BNB_RPC,address)]);if(eth&&bnb)throw new Error('This address has code on both Ethereum and BNB Chain. Choose the chain from the dropdown and scan again.');if(eth)return{chain:'ethereum',url:ETH_RPC,id:'1'};if(bnb)return{chain:'bnb',url:BNB_RPC,id:'56'};throw new Error('Salt could not find a deployed token contract at that address on Ethereum or BNB Chain.');}
async function scanEvm(address,chain,url,chainId){
  if(!(await evmExists(url,address)))throw new Error(`No deployed contract was found at that address on ${chain==='ethereum'?'Ethereum':'BNB Chain'}.`);
  const [nameHex,symbolHex,supplyHex,ownerHex,implHex,gp]=await Promise.all([
    safeCall(url,address,'0x06fdde03'),safeCall(url,address,'0x95d89b41'),safeCall(url,address,'0x18160ddd'),safeCall(url,address,'0x8da5cb5b'),jsonRpc(url,'eth_getStorageAt',[address,IMPL_SLOT,'latest']).catch(()=>null),goPlusEvm(address,chainId)
  ]);
  const name=gp?.token_name||decodeString(nameHex)||`${chain==='ethereum'?'Ethereum':'BNB'} token`;
  const symbol=gp?.token_symbol||decodeString(symbolHex)||'TOKEN';const supplyRaw=decodeUint(supplyHex);
  const rpcOwner=decodeAddress(ownerHex);const ownerAddr=gp?.owner_address??rpcOwner;const ownerKnown=ownerAddr!==undefined&&ownerAddr!==null&&ownerAddr!=='';const ownerRenounced=ownerKnown&&(String(ownerAddr).toLowerCase()===ZERO||String(gp?.owner_type||'').toLowerCase()==='blackhole');
  const proxyGp=yn(gp?.is_proxy);const proxySlot=!!implHex&&implHex!=='0x'&&(()=>{try{return BigInt(implHex)!==0n}catch{return false}})();const proxy=proxyGp??proxySlot;
  const openSource=yn(gp?.is_open_source);const honeypot=yn(gp?.is_honeypot);const cannotSell=yn(gp?.cannot_sell_all);const cannotBuy=yn(gp?.cannot_buy);const mintable=yn(gp?.is_mintable);const pausable=yn(gp?.transfer_pausable);const blacklist=yn(gp?.is_blacklisted);const hiddenOwner=yn(gp?.hidden_owner);const ownerChangeBalance=yn(gp?.owner_change_balance);const takeBack=yn(gp?.can_take_back_ownership);
  const buyTax=pct(gp?.buy_tax),sellTax=pct(gp?.sell_tax),transferTax=pct(gp?.transfer_tax);const holders=Array.isArray(gp?.holders)?gp.holders:[];const top10=holderTop10(holders);const holderCount=num(gp?.holder_count);const creatorPct=pct(gp?.creator_percent??gp?.owner_percent);const dex=bestEvmDex(gp);const liquidity=num(dex?._liq??dex?.liquidity);const inDex=yn(gp?.is_in_dex);const fakeToken=gp?.fake_token&&Number(gp.fake_token.value)===1;const trusted=yn(gp?.trust_list)===true||gp?.is_in_cex?.listed==='1';
  const taxRisk=Math.max(buyTax??0,sellTax??0,transferTax??0);const checks=[
    {known:true,weight:7,risk:0},
    {known:openSource!=null,weight:8,risk:openSource?0:70},
    {known:honeypot!=null,weight:15,risk:honeypot?100:0},
    {known:cannotSell!=null||cannotBuy!=null,weight:10,risk:(cannotSell||cannotBuy)?100:0},
    {known:buyTax!=null||sellTax!=null,weight:10,risk:taxRisk>=50?100:taxRisk>=20?75:taxRisk>=10?45:taxRisk>=5?20:0},
    {known:ownerKnown,weight:8,risk:ownerRenounced?0:45},
    {known:mintable!=null,weight:9,risk:mintable?75:0},
    {known:pausable!=null||blacklist!=null,weight:8,risk:(pausable||blacklist)?75:0},
    {known:ownerChangeBalance!=null||hiddenOwner!=null||takeBack!=null,weight:9,risk:(ownerChangeBalance||hiddenOwner||takeBack)?100:0},
    {known:top10!=null,weight:10,risk:top10==null?0:top10>=70?100:top10>=50?80:top10>=35?55:top10>=20?25:5},
    {known:liquidity!=null||inDex!=null,weight:10,risk:liquidity!=null?(liquidity<5000?100:liquidity<20000?75:liquidity<50000?45:liquidity<150000?20:5):(inDex?25:100)},
    {known:proxy!=null,weight:6,risk:proxy?35:0},
    {known:creatorPct!=null,weight:7,risk:creatorPct==null?0:creatorPct>=20?95:creatorPct>=10?60:creatorPct>=5?30:5},
    {known:fakeToken||gp!=null,weight:8,risk:fakeToken?100:0}
  ];
  const critical=honeypot===true||cannotSell===true||ownerChangeBalance===true||fakeToken===true;const s=finalize(checks,critical);
  const chainLabel=chain==='ethereum'?'Ethereum':'BNB Chain';const taxKnown=buyTax!=null||sellTax!=null;const topStatus=statusFromPct(top10,20,40);const liqStatus=liquidity==null?'unknown':liquidity>=100000?'good':liquidity>=20000?'warn':'bad';const creatorStatus=creatorPct==null?'unknown':creatorPct<5?'good':creatorPct<12?'warn':'bad';
  const riskBits=[];if(honeypot)riskBits.push('honeypot behavior');if(cannotSell)riskBits.push('sell restrictions');if(taxRisk>=20)riskBits.push('very high taxes');if(mintable)riskBits.push('mint capability');if(pausable)riskBits.push('pausable transfers');if(blacklist)riskBits.push('blacklist controls');if(ownerChangeBalance)riskBits.push('owner balance controls');if(top10!=null&&top10>=40)riskBits.push('concentrated ownership');if(liquidity!=null&&liquidity<20000)riskBits.push('thin liquidity');
  const summary=riskBits.length?`Salt verified ${s.checksCompleted} of ${s.checksTotal} core ${chainLabel} checks and found ${riskBits.slice(0,3).join(', ')}${riskBits.length>3?' plus other warnings':''}. Review the high-risk items before connecting a wallet.`:`Salt verified ${s.checksCompleted} of ${s.checksTotal} core ${chainLabel} checks and found no major warning in the data currently available. Data Confidence shows how complete that conclusion is.`;
  return{mint:address,chain,name,symbol,verified:trusted,...s,summary,
    authenticity:metric(fakeToken?'Possible fake':trusted?'Known token':'Contract confirmed',fakeToken?'bad':trusted?'good':'unknown',fakeToken?`GoPlus marks this as a possible counterfeit${gp?.fake_token?.true_token_address?` and points to ${gp.fake_token.true_token_address}`:''}.`:trusted?'The token is marked as trusted/listed by the current security data.':`A deployed contract exists on ${chainLabel}, but official-project identity still needs website/social CA matching.`,'GoPlus + RPC'),
    sellable:metric(honeypot?'Honeypot':cannotSell?'Restricted':inDex===true?'DEX trade found':'Not confirmed',honeypot||cannotSell?'bad':inDex===true?'good':'unknown',honeypot?'The security provider identifies honeypot behavior.':cannotSell?'The contract is reported to restrict selling all tokens.':inDex===true?'The token is reported as trading on a DEX.':'A sell route was not confirmed.','GoPlus'),
    honeypot:metric(honeypot==null?'Unknown':honeypot?'Detected':'Not detected',honeypot==null?'unknown':honeypot?'bad':'good',honeypot?'The token is flagged as a honeypot.':honeypot===false?'No honeypot flag was returned by the current security analysis. This is still not a guarantee for every wallet/state.':'No honeypot result was available.','GoPlus'),
    taxes:metric(taxKnown?`${buyTax==null?'?':buyTax.toFixed(1)}% buy / ${sellTax==null?'?':sellTax.toFixed(1)}% sell`:'Unknown',taxKnown?(taxRisk>=20?'bad':taxRisk>=8?'warn':'good'):'unknown',taxKnown?`Measured token taxes${transferTax!=null?` include ${transferTax.toFixed(1)}% transfer tax`:''}.`:'Tax data was not returned for this token.','GoPlus'),
    ownerControl:metric(!ownerKnown?'Unknown':ownerRenounced?'Renounced':'Active',!ownerKnown?'unknown':ownerRenounced?'good':'warn',!ownerKnown?'Ownership could not be reliably read.':ownerRenounced?'The recognized owner is a zero/black-hole address. Other roles may still exist.':`Recognized owner: ${String(ownerAddr).slice(0,8)}…${String(ownerAddr).slice(-6)}.`,'GoPlus + RPC'),
    proxyRisk:metric(proxy==null?'Unknown':proxy?'Upgradeable / proxy':'No proxy flag',proxy==null?'unknown':proxy?'warn':'good',proxy?'Proxy/upgradable behavior was detected.':'No proxy flag was detected by GoPlus or the standard EIP-1967 slot check.','GoPlus + RPC'),
    contractSource:metric(openSource==null?'Unknown':openSource?'Open source':'Closed source',openSource==null?'unknown':openSource?'good':'bad',openSource===false?'Closed-source contracts can hide behavior that scanners cannot inspect.':openSource?'Contract source is reported as verified/open.':'Source status was not available.','GoPlus'),
    mintAuthority:metric(mintable==null?'Unknown':mintable?'Mintable':'Not mintable',mintable==null?'unknown':mintable?'bad':'good',mintable?'The contract is reported to have token-minting ability.':'No mint function risk was detected.','GoPlus'),
    transferControl:metric(ownerChangeBalance?'Balance control':pausable?'Pausable':blacklist?'Blacklist':'No major flag',ownerChangeBalance?'bad':pausable||blacklist?'warn':gp?'good':'unknown',ownerChangeBalance?'Owner/admin may be able to change holder balances.':pausable?'Transfers can be paused.':blacklist?'Blacklist functionality was detected.':'No pause/blacklist/balance-control warning was returned.','GoPlus'),
    top10:metric(top10==null?'Unknown':`${top10.toFixed(1)}%`,topStatus,top10==null?'Indexed top-holder concentration was not returned.':`The indexed top 10 holders control about ${top10.toFixed(1)}% of supply.`,'GoPlus'),
    owner:metric(creatorPct==null?'Unknown':`${creatorPct.toFixed(1)}%`,creatorStatus,creatorPct==null?'Creator/owner supply percentage was not returned.':`Creator/owner-linked percentage reported by the provider is about ${creatorPct.toFixed(1)}%.`,'GoPlus'),
    bundled:metric('Needs wallet graph','unknown','True bundled supply requires funding-source and linked-wallet clustering; Salt does not fake this number.','Salt'),
    snipers:metric('Needs launch history','unknown','Sniper share requires launch-block transaction ordering and early-buyer attribution.','Salt'),
    liquidity:metric(liquidity==null?(inDex?'DEX listed':'Unknown'):money(liquidity),liqStatus,liquidity==null?(inDex?'A DEX market is reported, but USD liquidity was not returned.':'No usable DEX liquidity figure was returned.'):`Largest reported pool${dex?.name?` (${dex.name})`:''} has about ${money(liquidity)} liquidity.`,'GoPlus'),
    holders:metric(holderCount==null?'Unknown':count(holderCount),holderCount==null?'unknown':'good',holderCount==null?'Total holder count was not returned.':'Indexed token holder count.','GoPlus'),
    duplicates:metric(fakeToken?'Counterfeit flag':'Needs identity graph',fakeToken?'bad':'unknown',fakeToken?'A counterfeit-token warning was returned.':'Full meme-coin dupe detection still needs official website/social CA matching and competing-token comparison.','GoPlus + Salt'),
    creatorHistory:metric(gp?.other_potential_risks?'Risk note found':'No full history',gp?.other_potential_risks?'warn':'unknown',gp?.other_potential_risks||'A complete deployer launch-history profile still requires address-history attribution.','GoPlus + Salt')
  };
}
module.exports=async function handler(req,res){
  const mint=String(req.query?.mint||'').trim();const preferred=String(req.query?.chain||'auto').toLowerCase();
  res.setHeader('Cache-Control','s-maxage=15, stale-while-revalidate=45');
  try{const isSol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);const isEvm=/^0x[a-fA-F0-9]{40}$/.test(mint);if(!isSol&&!isEvm)return res.status(400).json({error:'Paste a valid Solana mint or 0x Ethereum / BNB Chain contract address.'});
    if(preferred==='solana'||(preferred==='auto'&&isSol)){if(!isSol)return res.status(400).json({error:'That does not look like a Solana mint address.'});return res.status(200).json(await scanSolana(mint));}
    if(isEvm){const target=await detectEvm(mint,preferred);return res.status(200).json(await scanEvm(mint.toLowerCase(),target.chain,target.url,target.id));}
    return res.status(400).json({error:'The selected chain does not match that contract-address format.'});
  }catch(e){return res.status(500).json({error:`Scan failed: ${errText(e?.message??e)}`,code:'SCAN_FAILED'});}
};
