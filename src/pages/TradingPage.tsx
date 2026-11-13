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
 return <div><h1>Trading</h1><p>Exchange market and account workspace · orders retain the engine’s explicit mode.</p><a href={apiUrl("/market-desk/")} target="_blank" rel="noreferrer">Open Market Desk in a separate window</a>{coreReady?<iframe title="Niblit Market Desk" src={apiUrl("/market-desk/")} style={{width:'100%',height:'80vh',border:0,marginTop:16}}/>:<p role="status">Core unavailable. Current broker observations are unavailable; Market Desk reconnects when Core returns.</p>}<button onClick={()=>setReplay(!replay)}>{replay?'Hide':'Open'} historical replay lab</button>{replay&&<PaperTradingPanel/>}<button onClick={()=>setDetails(!details)}>{details?'Hide':'Inspect'} runtime details</button>{details&&<SubsystemPanel section="trading" title="Authoritative runtime details"/>}</div>;
}
