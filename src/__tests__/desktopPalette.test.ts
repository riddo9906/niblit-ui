import { describe, expect, it, vi, afterEach } from 'vitest';
import { desktopPaletteCommands, fetchDesktopCommands, filterCommands, groupCommands } from '../services/commandsApi';

afterEach(() => vi.unstubAllGlobals());

describe('original desktop palette', () => {
  it('does not hide an original operator behind an assistant tool original_name', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ok:true,json:async()=>String(url).endsWith('/operator') ?
      {commands:[{name:'status',category:'Core',description:'Original status',aliases:['health-status'],state:'EXECUTABLE',input_schema:{properties:{text:{type:'string'}}}}]} :
      {commands:[{name:'runtime_status',original_name:'status',category:'Runtime',description:'Tool status',state:'EXECUTABLE',input_schema:{}}]}})));
    const registry = await fetchDesktopCommands();
    const commands = desktopPaletteCommands(registry!);
    expect(commands.map(command=>command.name)).toEqual(['status','runtime_status']);
    expect(filterCommands(commands,'health-status')[0].name).toBe('status');
  });

  it('keeps keyboard order equal to the displayed group order', () => {
    const commands = desktopPaletteCommands({source:'test',capability_path:'Core',count:3,commands:[
      {name:'a',category:'Core',description:'',state:'EXECUTABLE',input_schema:{}},
      {name:'b',category:'Memory',description:'',state:'EXECUTABLE',input_schema:{}},
      {name:'c',category:'Core',description:'',state:'UNAVAILABLE',input_schema:{}},
    ] as never[]});
    expect(groupCommands(commands).flatMap(group=>group.commands).map(command=>command.name)).toEqual(['a','c','b']);
  });
});
