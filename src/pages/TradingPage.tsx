import { useState } from 'react';
import PaperTradingPanel from '../components/PaperTradingPanel';
import SubsystemPanel from '../components/SubsystemPanel';
export default function TradingPage() {
 const [details,setDetails]=useState(false);
 return <div><h1>Trading</h1><PaperTradingPanel/><button onClick={()=>setDetails(!details)}>{details?'Hide':'Inspect'} runtime details</button>{details&&<SubsystemPanel section="trading" title="Authoritative runtime details"/>}</div>;
}
