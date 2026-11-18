import { afterEach, expect, it, vi } from 'vitest';
import { responseText, sendChat, researchReceipt } from '../services/niblitApi';
afterEach(() => vi.unstubAllGlobals());
it('renders structured backend errors as readable text instead of crashing chat', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:502,json:async()=>({error:{code:'request_failed',message:'The file could not be inspected.'}})}));
  const result = await sendChat('Explain calculator.py');
  expect(result.error).toBe('The file could not be inspected.');
  expect(result.error?.split(' ')).toContain('file');
});
it('normalizes restored and structured model content at the rendering boundary', () => {
  expect(responseText({text:'A completed answer'})).toBe('A completed answer');
  expect(responseText(null)).toBe('');
  expect(responseText({status:'unavailable'})).toBe('{"status":"unavailable"}');
});

it('binds cancellation to the same tab session and exact research request', async () => {
  const storage = new Map<string,string>();
  vi.stubGlobal('sessionStorage', { getItem:(key:string)=>storage.get(key) ?? null, setItem:(key:string,value:string)=>storage.set(key,value) });
  const fetcher = vi.fn().mockResolvedValue({ok:true,json:async()=>({reply:'ok',job_id:'owned-request',status:'cancelled',terminal:true})});
  vi.stubGlobal('fetch',fetcher);
  await sendChat('Research inventory and learn for subject test.research',undefined,'niblit',[],'owned-request');
  await researchReceipt('owned-request',true);
  const request=fetcher.mock.calls[0][1]; const cancel=fetcher.mock.calls[1][1];
  expect(JSON.parse(request.body).request_id).toBe('owned-request');
  expect(cancel.headers['X-Niblit-Research-Session']).toBe(request.headers['X-Niblit-Research-Session']);
  expect(JSON.parse(cancel.body)).toEqual({job_id:'owned-request'});
  expect(cancel.body).not.toContain(cancel.headers['X-Niblit-Research-Session']);
});
