import {afterEach,describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {fetchDesktopCommands,executeOperatorCommand,normalizeCommand,filterCommands,type GovernedCommand} from '../services/commandsApi';
import {GovernedDetail} from '../pages/CommandsPage';
import CommandCatalogue from '../components/commands/CommandCatalogue';

afterEach(()=>vi.unstubAllGlobals());
const operator:GovernedCommand={name:'threads',original_name:'threads',execution_channel:'operator',
 description:'Original threads',category:'runtime',input_schema:{type:'object',properties:{text:{type:'string'}}},
 state:'EXECUTABLE',risk_class:'READ_ONLY',side_effect_level:'NONE',requires_authorization:false,execution_enabled:true};

describe('original operator commands',()=>{
 it('does not offer a dead prepare action for an unbound catalogue entry',()=>{
  const html=renderToStaticMarkup(<CommandCatalogue commands={[{original_name:'unbound',canonical_id:'unbound',risk_class:'INTERNAL',side_effect_level:'NONE',llm_safe:false,governed_status:'OPERATOR_ONLY',classification_reason:'CLI only'}]} query="" onPrepare={()=>{}} canPrepare={()=>false}/>);
  expect(html).toContain('No desktop handler is bound');expect(html).toContain('disabled=""');
 });
 it('uses real aliases instead of inventing aliases from words',()=>{
  const command=normalizeCommand({label:'knowledge stats',cmd:'knowledge stats',aliases:['kb-stats']},'memory');
  expect(command.aliases).toEqual(['kb-stats']);
  expect(filterCommands([command],'kb-stats')).toEqual([command]);
 });
 it('keeps assistant metadata and adds original-only commands',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith('/operator')?
   {commands:[operator,{...operator,name:'knowledge stats'}]}:
   {source:'governed',capability_path:'loop',commands:[{...operator,name:'knowledge_stats',original_name:'knowledge stats',execution_channel:undefined}],count:1}))));
  const result=await fetchDesktopCommands();
  expect(result?.commands.map(c=>c.name)).toEqual(['knowledge_stats','threads']);
  expect(result?.operator_available).toBe(true);
 });
 it('submits explicit operator intent to the operator endpoint, never chat',async()=>{
  const fetch=vi.fn(async()=>new Response(JSON.stringify({status:'success',result:'ok'})));
  vi.stubGlobal('fetch',fetch);
  await executeOperatorCommand('remember',{text:'Key: Value'});
  const [url,request]=fetch.mock.calls[0] as unknown as [string,{body:string}];
  expect(url).toContain('/api/commands/operator/execute');
  expect(JSON.parse(request.body)).toEqual({command:'remember',arguments:{text:'Key: Value'},confirmed:true});
 });
 it('does not confuse operator execution with assistant exposure',()=>{
  const html=renderToStaticMarkup(<GovernedDetail command={operator} argValues={{}} onArgChange={()=>{}} onExecute={()=>{}} executing={false} lastResult={null}/>);
  expect(html).toContain('Desktop operator only; not exposed to the assistant');
 });
});
