import {beforeEach,afterEach,it,expect,vi} from 'vitest';
let sockets:any[]=[];
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();sockets=[];vi.stubGlobal('window',Object.assign(new EventTarget(),{fetch:vi.fn(),location:{href:'http://tauri.localhost/'}}));vi.stubGlobal('localStorage',{getItem:()=>null});vi.stubGlobal('WebSocket',class {url:string;onclose:any;onopen:any;onmessage:any;onerror:any;constructor(url:string){this.url=url;sockets.push(this);}close(){}});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('bounds stream retries and keeps the launcher-selected URL',async()=>{
 const binding=await import('../runtimeBinding');binding.installDesktopBinding({core_url:'http://127.0.0.1:5347',cloud_url:'http://127.0.0.1:8347',core_pid:123,instance:'a'.repeat(32),release:'fixture'});
 const api=await import('../services/niblitApi');const errors=vi.fn();const stop=api.openRuntimeWebSocket(vi.fn(),errors);
 for(let i=0;i<7;i++){sockets[sockets.length-1].onclose({code:1006});await vi.advanceTimersByTimeAsync(31000);}
 expect(sockets).toHaveLength(7);expect(sockets.every(s=>s.url.startsWith('ws://127.0.0.1:5347/ws/runtime?desktop_instance='))).toBe(true);expect(errors).toHaveBeenLastCalledWith(expect.stringContaining('retry limit'));stop();
});
it('never retries an identity rejection and cancels pending recovery on disposal',async()=>{
 const api=await import('../services/niblitApi');const stop=api.openRuntimeWebSocket(vi.fn());sockets[0].onclose({code:1008});await vi.advanceTimersByTimeAsync(60000);expect(sockets).toHaveLength(1);stop();
 const stop2=api.openRuntimeWebSocket(vi.fn());sockets[1].onclose({code:1006});stop2();await vi.advanceTimersByTimeAsync(60000);expect(sockets).toHaveLength(2);
});

