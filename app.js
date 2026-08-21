const labels={authenticity:'Real contract?',sellable:'Can I sell it?',mintAuthority:'Can more coins be created?',freezeAuthority:'Can wallets be frozen?',ownerControl:'Owner / admin control',proxyRisk:'Upgradeable contract?',honeypot:'Honeypot / sell block',taxes:'Buy / sell taxes',top10:'Top 10 wallets',owner:'Creator / owner share',bundled:'Possible bundled supply',snipers:'Early sniper share',liquidity:'Liquidity',holders:'Holders',duplicates:'Duplicate coins',creatorHistory:'Creator history'};
const explain={top10:'If a few wallets own too much, one big sell can hurt everyone.',owner:'Shows how much supply may still be controlled by the creator or linked wallets.',bundled:'Connected wallets can make ownership look more spread out than it really is.',snipers:'Very early buyers can hold cheap supply and dump into later buyers.',liquidity:'More liquidity generally makes it easier to enter and exit without huge price impact.',ownerControl:'An active owner can sometimes change fees, limits or other token settings.',proxyRisk:'Upgradeable contracts can change behavior after launch.',honeypot:'A honeypot may let people buy but block or heavily punish selling.',taxes:'Very high transfer taxes can make a token difficult or expensive to exit.'};
const $=id=>document.getElementById(id);
let currentMint='';
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function chainName(c){return c==='ethereum'?'Ethereum':c==='bnb'?'BNB Chain':'Solana';}
function payAsset(c){return c==='ethereum'?'◆ ETH':c==='bnb'?'⬡ BNB':'◎ SOL';}
function render(data){
  const symbol=data.symbol||'TOKEN'; currentMint=data.mint||'';
  $('tokenIcon').textContent=symbol.slice(0,2).toUpperCase();
  $('tokenName').textContent=data.name||'On-chain token';
  $('tokenSymbol').textContent='$'+symbol;
  $('receiveSymbol').innerHTML=`${esc(symbol)} <span>⌄</span>`;
  $('tokenCA').textContent=data.mint?`${data.mint.slice(0,12)}…${data.mint.slice(-8)}`:'Unknown contract';
  $('verifiedBadge').classList.toggle('hidden',!data.verified);
  const nb=$('networkBadge'); nb.textContent=chainName(data.chain); nb.className=`networkBadge ${data.chain||''}`;
  $('paySymbol').innerHTML=`${payAsset(data.chain)} <span>⌄</span>`;
  $('scoreBox').className=`scoreBox ${data.tone||'unknown'}`;
  $('scoreNum').textContent=data.score??'—';
  $('scoreLabel').textContent=data.label||'NOT ENOUGH DATA';
  $('swapLabel').textContent=data.label||'UNKNOWN';
  $('scoreHint').textContent=data.tone==='good'?'No major warning in the checks Salt can verify.':data.tone==='warn'?'There are risks worth reviewing before you trade.':data.tone==='bad'?'Serious warning signs were detected.':'Salt only scores checks it can actually verify.';
  $('summaryText').textContent=data.summary||'Salt does not have enough data to summarize this token yet.';
  $('qAuthenticity').textContent=data.authenticity?.value||'Unknown';
  $('qOwnership').textContent=data.top10?.value||'Needs deeper scan';
  $('qBundles').textContent=data.bundled?.value||'Needs deeper scan';
  $('qLiquidity').textContent=data.liquidity?.value||'Needs deeper scan';
  $('metrics').innerHTML=Object.keys(labels).filter(k=>data[k]).map(k=>{const v=data[k];const icon=v.status==='good'?'✓':v.status==='bad'?'!':v.status==='warn'?'⚠':'?';return `<div class="metric ${esc(v.status||'unknown')}"><div class="metricTop"><span>${icon}</span><span class="metricLabel">${esc(labels[k])}</span><strong>${esc(v.value)}</strong></div><p>${esc(v.detail)}</p>${explain[k]?`<small><b>Why it matters:</b> ${esc(explain[k])}</small>`:''}</div>`;}).join('');
  $('results').classList.remove('hidden');
  setTimeout(()=>$('results').scrollIntoView({behavior:'smooth',block:'start'}),70);
}
async function scan(){
  const mint=$('mintInput').value.trim(); const chain=$('chainSelect').value;
  $('error').classList.add('hidden');
  if(!mint){$('error').textContent='Paste a meme coin contract address first.';$('error').classList.remove('hidden');return;}
  $('scanBtn').disabled=true;$('scanBtn').textContent='Checking…';
  try{const r=await fetch(`/api/scan?mint=${encodeURIComponent(mint)}&chain=${encodeURIComponent(chain)}`);const body=await r.json();if(!r.ok)throw new Error(body.error||'Scan failed');render(body);}catch(e){$('error').textContent=e.message||'Scan failed';$('error').classList.remove('hidden');}
  finally{$('scanBtn').disabled=false;$('scanBtn').textContent='Salt Check';}
}
function walletNotice(){alert('Multi-chain wallet connection and live swaps are coming next. This build focuses on the meme coin check.');}
$('scanBtn').addEventListener('click',scan);$('mintInput').addEventListener('keydown',e=>{if(e.key==='Enter')scan();});$('walletBtn').addEventListener('click',walletNotice);$('swapWalletBtn').addEventListener('click',walletNotice);
$('newScanBtn').addEventListener('click',()=>{$('results').classList.add('hidden');$('mintInput').value='';$('mintInput').focus();window.scrollTo({top:0,behavior:'smooth'});});
$('copyCA').addEventListener('click',async()=>{if(!currentMint)return;try{await navigator.clipboard.writeText(currentMint);const b=$('copyCA').querySelector('b');const old=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=old,1100);}catch{}});
document.querySelectorAll('[data-coming]').forEach(btn=>btn.addEventListener('click',()=>alert(`${btn.dataset.coming} is part of the Salt Swap roadmap. The multi-chain meme coin scanner is the focus of V1.2.`)));
