import { afterEach, expect, it, vi } from 'vitest';
import { responseText, sendChat } from '../services/niblitApi';
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
