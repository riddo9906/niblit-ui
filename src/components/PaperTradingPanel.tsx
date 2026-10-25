import {useCallback,useEffect,useRef,useState} from 'react';
import {usePreferences} from '../lib/preferences';
import {paperRequest,type PaperStatus} from '../services/paperTradingApi';

export default function PaperTradingPanel(){
  const prefs=usePreferences();
  const [state,setState]=useState<PaperStatus|null>(null),[error,setError]=useState('');
  const [connectionError,setConnectionError]=useState('');
  const [busy,setBusy]=useState(false),[stake,setStake]=useState(100),[steps,setSteps]=useState(50);
  const [useAi,setUseAi]=useState(true),[completed,setCompleted]=useState(0);
  const [dataset,setDataset]=useState(''),[strategy,setStrategy]=useState(''),[outcome,setOutcome]=useState<unknown>(null);
  const stop=useRef(false),mounted=useRef(true),polling=useRef(false);
  const refresh=useCallback(async()=>{
    if(polling.current)return;polling.current=true;
    try{const result=await paperRequest<PaperStatus>('status');if(mounted.current){setState(result);setConnectionError('');setDataset(v=>v||result.strategy.dataset);setStrategy(v=>v||result.strategy.strategy);}}
    catch(e){if(mounted.current)setConnectionError(e instanceof Error?e.message:String(e));}finally{polling.current=false;}
  },[]);
  useEffect(()=>{mounted.current=true;void refresh();const timer=prefs.liveUpdates?window.setInterval(()=>void refresh(),prefs.refreshSeconds*1000):null;
    return()=>{mounted.current=false;stop.current=true;if(timer)clearInterval(timer);};},[refresh,prefs.liveUpdates,prefs.refreshSeconds]);
  async function operate(path:string,payload:unknown){
    setBusy(true);setError('');try{const result=await paperRequest(path,payload);setOutcome(path==='replay'?Object.fromEntries(Object.entries(result).filter(([key])=>key!=='candles')):result);await refresh();}
    catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  async function run(count:number){
    stop.current=false;setBusy(true);setCompleted(0);setError('');
    try{for(let i=0;i<count&&!stop.current;i++){
      const result=await paperRequest<{outcome:Record<string,unknown>;observation:{done:boolean}}>('step',{stake_amount:stake,use_ai:useAi});
      if(!mounted.current)break;setOutcome(result.outcome);setCompleted(i+1);
      if(i%10===0||result.observation.done)await refresh();if(result.observation.done)break;
    }}catch(e){if(mounted.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(mounted.current){await refresh();setBusy(false);}}
  }
  const balance=state?.account.balances[0],armed=state?.mode==='paper';
  const open=state?.account.positions.filter(p=>p.status==='open')||[];
  const position=open.find(p=>p.symbol===state?.strategy.symbol);
  const money=(v:number|undefined)=>v===undefined?'—':v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  function intent(action:'enter_long'|'exit_long'){
    if(prefs.confirmActions&&!window.confirm(action==='enter_long'?'Create this simulated paper entry?':'Close the full simulated paper position?'))return;
    void operate('decision',{action,stake_amount:action==='exit_long'?position?.stake_amount:stake,decision_id:'operator-'+crypto.randomUUID()});
  }
  return <section className="trading-workspace">
    <div className="section-toolbar"><p>Core policy → strategy → risk checks → paper fills → durable portfolio</p><button disabled={busy} onClick={()=>void refresh()}>Refresh account</button></div>
    {(error||connectionError)&&<p className="error" role="alert">{error||connectionError}</p>}
    {!state&&<p>Waiting for the integrated paper runtime. Start the full paper build to use these controls.</p>}
    {state&&<>
      <div className="paper-metrics">{[['Equity',state.account.equity],['Available',balance?.free],['Reserved',balance?.used],['Realized net PnL',state.account.realized_pnl],['Fees paid',state.account.fees]].map(([label,value])=><article className="panel" key={String(label)}><small>{label}</small><strong>{money(typeof value==='number'?value:undefined)}</strong><span>{balance?.currency}</span></article>)}</div>
      <div className="panel"><div className="section-toolbar"><h2>Paper session · {armed?'Orders enabled':'Observing'}</h2><button disabled={busy} onClick={()=>void operate('control',{enabled:!armed})}>{armed?'Pause orders':'Enable paper trading'}</button></div>
        <p>Historical replay · {state.strategy.symbol} · {state.strategy.strategy}</p><p>Recorded candle close: <strong>{state.strategy.as_of}</strong> · price {money(state.strategy.last)} · candle {state.strategy.cursor+1}/{state.strategy.total_candles}</p>
        <div className="toolbar-actions"><label>Stake ({balance?.currency})<input aria-label="Paper stake" type="number" min="1" max="100000000" value={stake} disabled={busy} onChange={e=>setStake(Number(e.target.value))}/></label>
          <button disabled={busy||!armed||!!position} onClick={()=>intent('enter_long')}>Create paper entry</button><button disabled={busy||!armed||!position} onClick={()=>intent('exit_long')}>Close paper position</button>
          <button disabled={busy} onClick={()=>void operate('advice',{action:position?'exit_long':'enter_long',stake_amount:stake})}>Ask local AI</button></div><small>Fills use recorded candle closes and 0.1% fees in a simulated ledger.</small></div>
      <div className="panel"><h2>Strategy replay</h2><div className="toolbar-actions">
        <label>Dataset<select aria-label="Replay dataset" value={dataset} disabled={busy||open.length>0} onChange={e=>setDataset(e.target.value)}>{state.available.datasets.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Strategy<select aria-label="Replay strategy" value={strategy} disabled={busy||open.length>0} onChange={e=>setStrategy(e.target.value)}>{state.available.strategies.map(v=><option key={v}>{v}</option>)}</select></label>
        <button disabled={busy||open.length>0} onClick={()=>void operate('replay',{dataset,strategy,cursor:199})}>Load replay</button>
        <label><input type="checkbox" checked={useAi} disabled={busy} onChange={e=>setUseAi(e.target.checked)}/>Require local AI approval</label></div>
        <div className="toolbar-actions"><label>Candles<input aria-label="Replay steps" type="number" min="1" max="520" value={steps} disabled={busy} onChange={e=>setSteps(Math.max(1,Math.min(520,Number(e.target.value)||1)))}/></label>
          <button disabled={busy||!armed||state.strategy.done} onClick={()=>void run(1)}>Advance one candle</button><button disabled={busy||!armed||state.strategy.done} onClick={()=>void run(steps)}>Run recorded candles</button>
          {busy&&<button onClick={()=>{stop.current=true;}}>Stop after current step</button>}<span role="status">{completed} completed steps{busy?' · running':''}{state.strategy.pending?' · pending candle is recoverable':''}</span></div>
        <small>Only past candles are supplied to each decision. Interrupted steps are retried with the same decision ID.</small></div>
      <div className="panel"><h2>Positions</h2><div className="table-scroll"><table className="catalogue-table"><thead><tr><th>Pair / source</th><th>Status</th><th>Stake</th><th>Entry</th><th>Mark</th><th>Net PnL</th></tr></thead><tbody>{state.account.positions.slice(-30).reverse().map(p=><tr key={p.position_id}><td>{p.symbol}<small>{p.strategy}</small></td><td>{p.status}</td><td>{money(p.stake_amount)}</td><td>{money(p.entry_price)}</td><td>{money(p.current_price)}</td><td>{money(p.profit_amount)}</td></tr>)}</tbody></table>{!state.account.positions.length&&<p>No paper positions have been created.</p>}</div></div>
      <details className="panel"><summary>Recorded fills · {state.account.executions.length}</summary><pre className="snapshot-raw">{JSON.stringify(state.account.executions.slice(-30),null,2)}</pre></details>
      {outcome!==null&&<div className="panel"><h2>Last backend outcome</h2><pre className="snapshot-raw">{JSON.stringify(outcome,null,2)}</pre></div>}
      <p>Performance target: $100/month net after fees. Historical replay does not establish future monthly returns.</p>
    </>}
  </section>;
}
