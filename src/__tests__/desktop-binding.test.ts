import { beforeEach, afterEach, expect, it, vi } from 'vitest';
beforeEach(()=>{vi.resetModules(); const w=new EventTarget() as EventTarget & {fetch:typeof fetch;location:{href:string}};w.fetch=vi.fn();w.location={href:'http://tauri.localhost/'};vi.stubGlobal('window',w);vi.stubGlobal('CustomEvent',class extends Event {detail:unknown;constructor(name:string,options:any){super(name);this.detail=options.detail;}});});
afterEach(()=>vi.unstubAllGlobals());
const value={core_url:'http://127.0.0.1:5347',cloud_url:'http://127.0.0.1:8347',core_pid:123,instance:'a'.repeat(32),release:'fixture-only'};
it('uses runtime endpoints and retains existing session headers',async()=>{
 const raw=vi.mocked(window.fetch);raw.mockResolvedValueOnce(new Response(JSON.stringify({service:'niblit',core_bound:true,process_id:123,desktop_instance:value.instance}))).mockResolvedValueOnce(new Response('{"reply":"fixture"}'));
 const m=await import('../runtimeBinding');m.installDesktopBinding(value);
 await window.fetch(value.core_url+'/chat',{method:'POST',headers:{'X-Niblit-Research-Session':'fixture-session'},body:'{}'});
 expect(raw.mock.calls[0][0]).toBe(value.core_url+'/health');const init=raw.mock.calls[1][1]!;expect(new Headers(init.headers).get('X-Niblit-Desktop-Instance')).toBe(value.instance);expect(new Headers(init.headers).get('X-Niblit-Research-Session')).toBe('fixture-session');
});
it.each(['wrong_pid','wrong_instance','unbound'])('refuses another Core: %s',async(kind)=>{
 const raw=vi.mocked(window.fetch);raw.mockResolvedValue(new Response(JSON.stringify({service:'niblit',core_bound:kind!=='unbound',process_id:kind==='wrong_pid'?456:123,desktop_instance:kind==='wrong_instance'?'b'.repeat(32):value.instance})));
 const m=await import('../runtimeBinding');m.installDesktopBinding(value);await expect(window.fetch(value.core_url+'/chat')).rejects.toThrow('identity mismatch');expect(raw).toHaveBeenCalledTimes(1);
});
it('recovers after temporary unavailability without changing the approved binding',async()=>{
 const raw=vi.mocked(window.fetch);raw.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(JSON.stringify({service:'niblit',core_bound:true,process_id:123,desktop_instance:value.instance}))).mockResolvedValueOnce(new Response('{}'));
 const m=await import('../runtimeBinding');m.installDesktopBinding(value);await expect(window.fetch(value.core_url+'/api/status')).rejects.toThrow('offline');expect((await window.fetch(value.core_url+'/api/status')).ok).toBe(true);expect(m.desktopBinding()?.core_url).toBe(value.core_url);
});
it('rejects nonlocal endpoints and incomplete identity',async()=>{const m=await import('../runtimeBinding');expect(()=>m.installDesktopBinding({...value,core_url:'http://example.com'})).toThrow();expect(()=>m.installDesktopBinding({...value,instance:''})).toThrow();});
