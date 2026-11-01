import { useState } from 'react';
import PaperTradingPanel from '../components/PaperTradingPanel';
import SubsystemPanel from '../components/SubsystemPanel';
export default function TradingPage() {
 const [details,setDetails]=useState(false),[replay,setReplay]=useState(false);
 return <div><h1>Trading</h1><p>Exchange market and account workspace · orders retain the engine’s explicit mode.</p><a href="http://127.0.0.1:8767/" target="_blank" rel="noreferrer">Open Market Desk in a separate window</a><iframe title="Niblit Market Desk" src="http://127.0.0.1:8767/" style={{width:'100%',height:'80vh',border:0,marginTop:16}}/><button onClick={()=>setReplay(!replay)}>{replay?'Hide':'Open'} historical replay lab</button>{replay&&<PaperTradingPanel/>}<button onClick={()=>setDetails(!details)}>{details?'Hide':'Inspect'} runtime details</button>{details&&<SubsystemPanel section="trading" title="Authoritative runtime details"/>}</div>;
}
