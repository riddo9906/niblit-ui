import { apiUrl } from '../config/api';
import { responseText } from './niblitApi';
export interface PaperPosition {
  position_id:string; symbol:string; side:string; status:string; stake_amount:number;
  entry_price:number; current_price:number; profit_amount:number; strategy?:string;
}
export interface PaperStatus {
  mode:string;state:string;backend:string;
  account:{equity:number;realized_pnl:number;fees:number;
    balances:Array<{currency:string;free:number;used:number;total:number}>;
    positions:PaperPosition[];executions:Array<Record<string,unknown>>};
  strategy:{strategy:string;symbol:string;as_of:string;source:string;dataset:string;
    cursor:number;total_candles:number;last:number;done:boolean;pending:boolean};
  available:{strategies:string[];datasets:string[]};
}
export async function paperRequest<T=Record<string,unknown>>(path:string,payload?:unknown):Promise<T>{
  const response=await fetch(apiUrl(`/api/trading/paper/${path}`),{method:payload===undefined?'GET':'POST',
    headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(!response.ok)throw new Error(responseText(result.error??result.detail)||`Core returned ${response.status}`);
  return result as T;
}
