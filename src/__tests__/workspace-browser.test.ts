import { afterEach, describe, expect, it, vi } from 'vitest';
import { listFiles, resolveWorkspaceFile } from '../services/fileBrowser';

afterEach(() => vi.unstubAllGlobals());
describe('workspace browser boundary', () => {
  it('lists through the governed workspace command instead of the process working directory', async () => {
    vi.stubGlobal('crypto', {randomUUID: () => 'workspace-test'});
    const fetcher = vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'success',result:{entries:[{name:'calculator.py',path:'calculator.py',type:'file',size:42}]}})});
    vi.stubGlobal('fetch',fetcher);
    expect(await listFiles('.')).toEqual([{name:'calculator.py',path:'calculator.py',extension:'',size:42,is_dir:false,modified:''}]);
    expect(fetcher.mock.calls[0][0]).toContain('/api/commands/execute');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).command).toBe('workspace_list');
  });
  it('resolves preview paths against the Core-reported workspace', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({runtime_configuration:{workspace_root:'C:\\test-workspace'}})}));
    expect(await resolveWorkspaceFile('src/main.py')).toBe('C:/test-workspace/src/main.py');
  });
  it.each(['../private.txt','C:\\private.txt','/private.txt'])('rejects paths outside the browser workspace: %s', async path => {
    await expect(resolveWorkspaceFile(path)).rejects.toThrow('configured workspace');
  });
});
