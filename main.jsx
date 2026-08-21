import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShieldCheck, Search, ArrowDown, Wallet, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink, ChevronDown, Copy, Activity, Users, Droplets, Fingerprint, Link2, BadgeCheck} from 'lucide-react';
import './styles.css';

const demo = {
  mint:'SALTdemo11111111111111111111111111111111111', name:'Salty Pepe', symbol:'SPEPE', age:'42 minutes', verified:false,
  score:72, label:'BE CAREFUL', tone:'warn', summary:'This appears tradeable and the contract controls look good, but ownership is concentrated enough that a few wallets could move the price quickly.',
  authenticity:{value:'Likely real',status:'good',detail:'Official links and contract identity are consistent in this demo.'},
  sellable:{value:'Yes',status:'good',detail:'A sell route is currently available.'},
  mintAuthority:{value:'Disabled',status:'good',detail:'No additional tokens can be minted by a mint authority.'},
  freezeAuthority:{value:'Disabled',status:'good',detail:'The token cannot be frozen by a freeze authority.'},
  top10:{value:'28.4%',status:'warn',detail:'The 10 largest token accounts control 28.4% of supply.'},
  owner:{value:'3.1%',status:'good',detail:'Estimated creator-linked holdings in this demo are modest.'},
  bundled:{value:'17.8%',status:'bad',detail:'Demo clustering finds several wallets that appear related.'},
  snipers:{value:'8.6%',status:'warn',detail:'A noticeable share was purchased very early.'},
  liquidity:{value:'$184K',status:'good',detail:'Enough liquidity for ordinary small trades, but still volatile.'},
  holders:{value:'1,842',status:'good',detail:'Holder count is broad enough to be useful, though not proof of safety.'},
  duplicates:{value:'6 found',status:'warn',detail:'Several tokens share similar branding. Always use the exact mint address.'},
  creatorHistory:{value:'Mixed',status:'warn',detail:'Demo creator launched 5 prior tokens; 2 became inactive quickly.'}
};

const statusIcon = s => s==='good'?<CheckCircle2 size={18}/>:s==='bad'?<XCircle size={18}/>:s==='warn'?<AlertTriangle size={18}/>:<HelpCircle size={18}/>;
const metricLabels={authenticity:'Real contract?',sellable:'Can I sell it?',mintAuthority:'Can more coins be created?',freezeAuthority:'Can wallets be frozen?',top10:'Top 10 wallets',owner:'Creator / owner share',bundled:'Possible bundled supply',snipers:'Early sniper share',liquidity:'Liquidity',holders:'Holders',duplicates:'Duplicate coins',creatorHistory:'Creator history'};
const metricExplain={top10:'If a few wallets own too much, one big sell can hurt everyone.',owner:'Shows how much supply may still be controlled by the creator or linked wallets.',bundled:'Connected wallets can make ownership look more spread out than it really is.',snipers:'Very early buyers can hold cheap supply and dump into later buyers.',liquidity:'More liquidity generally makes it easier to enter and exit without huge price impact.'};

function RiskCard({k,v}){return <div className={`metric ${v.status}`}><div className="metricTop"><span className="mi">{statusIcon(v.status)}</span><span className="metricLabel">{metricLabels[k]}</span><strong>{v.value}</strong></div><p>{v.detail}</p>{metricExplain[k]&&<small><b>Why it matters:</b> {metricExplain[k]}</small>}</div>}

function App(){
 const [address,setAddress]=useState(''); const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [tab,setTab]=useState('scan');
 async function scan(mint=address){ setError(''); if(!mint.trim()) return; setLoading(true); try{ const r=await fetch(`/api/scan/${mint.trim()}`); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Scan failed'); setData(j);}catch(e){setError(e.message)} finally{setLoading(false)} }
 const shown=data||demo;
 return <div className="app">
  <header><div className="brand"><div className="salt">S</div><div><b>SALT</b><span>SWAP</span></div></div><nav><button className={tab==='swap'?'active':''} onClick={()=>setTab('swap')}>Swap</button><button className={tab==='scan'?'active':''} onClick={()=>setTab('scan')}>Scan</button><button>Explore</button><button>Verified</button></nav><button className="wallet"><Wallet size={17}/> Connect Wallet</button></header>
  <main>
   <section className="hero"><div className="eyebrow"><ShieldCheck size={16}/> CRYPTO DATA, WITHOUT THE CRYPTO CONFUSION</div><h1>See the risk <em>before</em> you swap.</h1><p>Paste any Solana contract address. Salt translates on-chain risk into plain English.</p>
    <div className="search"><Search/><input value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==='Enter'&&scan()} placeholder="Paste Solana contract address…"/><button onClick={()=>scan()} disabled={loading}>{loading?'Scanning…':'Salt Check'}</button></div>
    {error&&<div className="error">{error}</div>}
    <button className="demoBtn" onClick={()=>{setData(demo);setAddress('')}}>Preview with demo token</button>
   </section>
   <section className="resultGrid">
    <div className="scoreCard">
      <div className="tokenRow"><div className="tokenIcon">{shown.symbol?.slice(0,2)||'?'}</div><div><h2>{shown.name||'Unknown token'} <span>${shown.symbol||'TOKEN'}</span></h2><div className="ca">{shown.mint?.slice(0,9)}…{shown.mint?.slice(-7)} <Copy size={13}/></div></div>{shown.verified&&<div className="verified"><BadgeCheck size={16}/> Salt Verified</div>}</div>
      <div className={`score ${shown.tone||'unknown'}`}><div className="scoreNum">{shown.score ?? '—'}<span>/100</span></div><div><b>{shown.label||'NOT ENOUGH DATA'}</b><p>Salt Risk Score</p></div></div>
      <div className="summary"><b>Salt's take</b><p>{shown.summary}</p></div>
      <div className="quick">
        <div><Fingerprint/><span>Authenticity</span><b>{shown.authenticity?.value||'Unknown'}</b></div>
        <div><Users/><span>Ownership</span><b>{shown.top10?.value||'Unknown'}</b></div>
        <div><Link2/><span>Bundles</span><b>{shown.bundled?.value||'Unknown'}</b></div>
        <div><Droplets/><span>Liquidity</span><b>{shown.liquidity?.value||'Unknown'}</b></div>
      </div>
    </div>
    <div className="swapCard"><div className="swapTitle"><b>Swap</b><span>Powered by routing provider</span></div><label>YOU PAY</label><div className="amount"><input placeholder="0.00"/><button>◎ SOL <ChevronDown size={16}/></button></div><div className="arrow"><ArrowDown/></div><label>YOU RECEIVE</label><div className="amount"><input placeholder="0.00"/><button>{shown.symbol||'TOKEN'} <ChevronDown size={16}/></button></div><div className="swapSafety"><ShieldCheck size={17}/><span>Salt check: <b>{shown.label||'Unknown'}</b></span></div><button className="connect"><Wallet size={17}/> Connect wallet to swap</button><small>V1 keeps transaction signing in the user's wallet. Never paste a seed phrase or private key.</small></div>
   </section>
   <section className="details"><div className="sectionTitle"><div><h2>What you should know</h2><p>We translate the technical stuff. Tap into advanced data only when you want it.</p></div><button>Advanced view <ChevronDown size={16}/></button></div><div className="metrics">{Object.entries(metricLabels).map(([k])=>shown[k]&&<RiskCard key={k} k={k} v={shown[k]}/>)}</div></section>
   <section className="legend"><div><span className="dot green"></span><b>Looks healthy</b><p>No major issue detected in this check.</p></div><div><span className="dot yellow"></span><b>Be careful</b><p>There are risks worth understanding first.</p></div><div><span className="dot red"></span><b>High risk</b><p>Serious warning signs are present.</p></div><div><span className="dot gray"></span><b>Not enough data</b><p>Salt refuses to guess when evidence is missing.</p></div></section>
  </main><footer>Salt Swap V1 • Risk information is not financial advice. Crypto can lose value quickly.</footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
