const labels={authenticity:'Real contract?',sellable:'Can I sell it?',honeypot:'Honeypot / sell block',taxes:'Buy / sell taxes',contractSource:'Contract source',mintAuthority:'Can more coins be created?',freezeAuthority:'Can wallets be frozen?',ownerControl:'Owner / admin control',proxyRisk:'Upgradeable contract?',transferControl:'Transfer controls',token2022Controls:'SPL-2022 controls',top10:'Top 10 wallets',owner:'Creator / owner share',bundled:'Possible bundled supply',snipers:'Early sniper share',liquidity:'Liquidity',holders:'Holders',duplicates:'Duplicate / fake coin',creatorHistory:'Creator history'};
const explain={top10:'If a few wallets own too much, one big sell can hurt everyone.',owner:'Shows how much supply may still be controlled by the creator or owner.',bundled:'Connected wallets can make ownership look more spread out than it really is.',snipers:'Very early buyers can hold cheap supply and dump into later buyers.',liquidity:'More liquidity generally makes it easier to enter and exit without huge price impact.',ownerControl:'An active owner can sometimes change fees, limits or other token settings.',proxyRisk:'Upgradeable contracts can change behavior after launch.',honeypot:'A honeypot may let people buy but block or heavily punish selling.',taxes:'Very high token taxes can make a coin difficult or expensive to exit.',transferControl:'Pause, blacklist, hooks or balance controls can interfere with normal transfers.',token2022Controls:'SPL-2022 adds useful features, but some authorities can create extra token-specific risks.'};
const $=id=>document.getElementById(id);let currentMint='';
const SOL_RPCS=['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com','https://api.mainnet.solana.com'];
const ETH_RPCS=['https://ethereum-rpc.publicnode.com','https://eth.llamarpc.com'];
const BNB_RPCS=['https://bsc-dataseed.binance.org','https://bsc-rpc.publicnode.com'];
const GOPLUS='https://api.gopluslabs.io/api/v1';
const metric=(value,status,detail,source='Salt')=>({value,status,detail,source});
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>{const n=Number(v);return Number.isFinite(n)?(n<=1?n*100:n):null};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const yn=v=>v==='1'||v===1||v===true?true:v==='0'||v===0||v===false?false:null;
const money=n=>{n=Number(n);if(!Number.isFinite(n))return null;if(n>=1e9)return `$${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(n<10?2:0)}`};
const count=n=>{n=Number(n);if(!Number.isFinite(n))return null;return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US')};
function chainName(c){return c==='ethereum'?'Ethereum':c==='bnb'?'BNB Chain':'Solana'}function payAsset(c){return c==='ethereum'?'◆ ETH':c==='bnb'?'⬡ BNB':'◎ SOL'}
function render(data){const symbol=data.symbol||'TOKEN';currentMint=data.mint||'';$('tokenIcon').textContent=symbol.slice(0,2).toUpperCase();$('tokenName').textContent=data.name||'On-chain token';$('tokenSymbol').textContent='$'+symbol;$('receiveSymbol').innerHTML=`${esc(symbol)} <span>⌄</span>`;$('tokenCA').textContent=data.mint?`${data.mint.slice(0,12)}…${data.mint.slice(-8)}`:'Unknown contract';$('verifiedBadge').classList.toggle('hidden',!data.verified);const nb=$('networkBadge');nb.textContent=chainName(data.chain);nb.className=`networkBadge ${data.chain||''}`;$('paySymbol').innerHTML=`${payAsset(data.chain)} <span>⌄</span>`;$('scoreBox').className=`scoreBox ${data.tone||'unknown'}`;$('scoreNum').textContent=data.score??'—';$('scoreLabel').textContent=data.label||'PRELIMINARY';$('swapLabel').textContent=data.label||'PRELIMINARY';$('scoreHint').textContent=data.confidence<45?'Salt needs more verified checks before treating this score as conclusive.':data.tone==='good'?'No major warning in the checks Salt could verify.':data.tone==='warn'?'There are risks worth reviewing before you trade.':data.tone==='bad'?'Serious warning signs were detected.':'Salt only scores checks it can actually verify.';$('confidenceNum').textContent=`${data.confidence??0}%`;$('confidenceFill').style.width=`${Math.max(0,Math.min(100,data.confidence??0))}%`;$('confidenceChecks').textContent=`${data.checksCompleted??0}/${data.checksTotal??0} core checks completed`;$('summaryText').textContent=data.summary||'Salt does not have enough data to summarize this token yet.';$('qAuthenticity').textContent=data.authenticity?.value||'Unknown';$('qOwnership').textContent=data.top10?.value||'Unknown';$('qBundles').textContent=data.bundled?.value||'Needs wallet graph';$('qLiquidity').textContent=data.liquidity?.value||'Unknown';$('metrics').innerHTML=Object.keys(labels).filter(k=>data[k]).map(k=>{const v=data[k];const icon=v.status==='good'?'✓':v.status==='bad'?'!':v.status==='warn'?'⚠':'?';return `<div class="metric ${esc(v.status||'unknown')}"><div class="metricTop"><span>${icon}</span><span class="metricLabel">${esc(labels[k])}</span><strong>${esc(v.value)}</strong></div><p>${esc(v.detail)}</p>${explain[k]?`<small><b>Why it matters:</b> ${esc(explain[k])}</small>`:''}${v.source?`<small class="metricSource">Source: ${esc(v.source)}</small>`:''}</div>`}).join('');$('results').classList.remove('hidden');setTimeout(()=>$('results').scrollIntoView({behavior:'smooth',block:'start'}),70)}
function readableError(value){if(value==null)return 'Scan failed.';if(typeof value==='string')return value;if(value instanceof Error)return readableError(value.message);if(typeof value==='object'){const preferred=value.message??value.error?.message??value.error?.detail??value.error?.reason??value.error??value.details?.message??value.details??value.reason??value.statusText;if(preferred!=null&&preferred!==value)return readableError(preferred);try{const s=JSON.stringify(value);return s&&s!=='{}'?s:'Scan failed.'}catch{return 'Scan failed.'}}return String(value)}
function showError(message){const e=$('error');if(!e)return;e.textContent=readableError(message);e.classList.remove('hidden')}function clearError(){const e=$('error');if(e)e.classList.add('hidden')}
async function scan(){
  const input=$('mintInput'), chainEl=$('chainSelect'), btn=$('scanBtn');
  const mint=input?.value.trim(), pref=chainEl?.value||'auto';
  clearError();
  if(!mint){showError('Paste a meme coin contract address first.');input?.focus();return;}
  btn.disabled=true;btn.textContent='Scanning…';
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    let response;
    try{response=await fetch(`/api/scan?mint=${encodeURIComponent(mint)}&chain=${encodeURIComponent(pref)}&_=${Date.now()}`,{signal:controller.signal,headers:{accept:'application/json'}})}
    finally{clearTimeout(timer)}
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{throw new Error(`Salt scanner returned an invalid response (HTTP ${response.status}).`)}
    if(!response.ok){const detail=readableError(data?.error??data?.message??data);throw new Error(detail&&detail!=='{}'?detail:`Salt scanner failed (HTTP ${response.status}).`);}
    render(data);
  }catch(e){
    if(e?.name==='AbortError')showError('The Salt scanner timed out. Try again.');
    else if(String(e?.message||'').includes('Failed to fetch'))showError('Salt could not reach its scanner backend. Make sure the api folder is present in GitHub and Vercel redeployed it.');
    else showError(e);
  }finally{btn.disabled=false;btn.textContent='Salt Check';}
}
function walletNotice(){alert('Wallet connection and live swaps are the next product layer. V1.5 focuses on reliable multi-chain meme coin scanning with protected data-provider keys.');}
function initSalt(){
  const b=$('scanBtn');if(!b)return;b.type='button';b.addEventListener('click',scan);
  $('mintInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();scan();}});
  $('walletBtn')?.addEventListener('click',walletNotice);$('swapWalletBtn')?.addEventListener('click',walletNotice);
  $('newScanBtn')?.addEventListener('click',()=>{$('results')?.classList.add('hidden');$('mintInput').value='';$('mintInput').focus();window.scrollTo({top:0,behavior:'smooth'});});
  $('copyCA')?.addEventListener('click',async()=>{if(!currentMint)return;try{await navigator.clipboard.writeText(currentMint);const x=$('copyCA')?.querySelector('b');if(x){const old=x.textContent;x.textContent='Copied';setTimeout(()=>x.textContent=old,1100);}}catch{}});
  document.querySelectorAll('[data-coming]').forEach(btn=>btn.addEventListener('click',()=>alert(`${btn.dataset.coming} is on the Salt Swap roadmap.`)));
  window.saltScan=scan;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSalt,{once:true});else initSalt();
