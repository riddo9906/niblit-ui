import { useState } from 'react';
import { apiUrl } from '../config/api';
import { useRuntimeStore } from '../state/runtimeStore';
import { statusKind } from '../components/ui/StatusDot';
import PaperTradingPanel from '../components/PaperTradingPanel';
import SubsystemPanel from '../components/SubsystemPanel';
export default function TradingPage() {
 const {layerStatus}=useRuntimeStore();
 const coreReady=statusKind(layerStatus.cognitive)==='ok';
 const [details,setDetails]=useState(false),[replay,setReplay]=useState(false);
 const [software,setSoftware]=useState('Not checked'),[busy,setBusy]=useState(false);
 async function inspectSoftware(rehearse=false) {
  setBusy(true);
  try {
   const response=await fetch(apiUrl(rehearse?'/chat':'/api/trading/software-readiness'),
    rehearse?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Run the governed execution rehearsal',model:'niblit'})}:undefined);
   const value=await response.json();
   if(!response.ok)throw new Error(value.detail||value.error||'Trading software unavailable');
   setSoftware(rehearse?value.reply:JSON.stringify(value,null,2));
  } catch(error) {setSoftware(error instanceof Error?error.message:'UNKNOWN');}
  finally {setBusy(false);}
 }

 return <div><h1>Trading</h1><p>Exchange market and account workspace · orders retain the engine’s explicit mode.</p><section aria-label="Execution software validation"><h2>Execution software</h2><p>Order delivery is governed separately. Rehearsals intercept every financial mutation.</p><button disabled={busy||!coreReady} onClick={()=>void inspectSoftware()}>Review execution software</button><button disabled={busy||!coreReady} onClick={()=>void inspectSoftware(true)}>Run intercepted rehearsal</button><pre role="status" style={{whiteSpace:'pre-wrap',maxHeight:400,overflow:'auto'}}>{busy?'Checking governed execution…':software}</pre></section><a href={apiUrl("/market-desk/")} target="_blank" rel="noreferrer">Open Market Desk in a separate window</a>{coreReady?<iframe title="Niblit Market Desk" src={apiUrl("/market-desk/")} style={{width:'100%',height:'80vh',border:0,marginTop:16}}/>:<p role="status">Core unavailable. Current broker observations are unavailable; Market Desk reconnects when Core returns.</p>}<button onClick={()=>setReplay(!replay)}>{replay?'Hide':'Open'} historical replay lab</button>{replay&&<PaperTradingPanel/>}<button onClick={()=>setDetails(!details)}>{details?'Hide':'Inspect'} runtime details</button>{details&&<SubsystemPanel section="trading" title="Authoritative runtime details"/>}</div>;
}
