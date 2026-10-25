import { useMemo, useState } from 'react';
import type { AuditedCommand } from '../../services/commandsApi';

export default function CommandCatalogue({ commands, query, onPrepare, canPrepare }: {
  commands: AuditedCommand[]; query: string; onPrepare: (command: AuditedCommand) => void;
  canPrepare?: (command: AuditedCommand) => boolean;
}) {
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => commands.filter(command => (!status || command.governed_status === status)
    && (!risk || command.risk_class === risk)
    && `${command.original_name} ${command.description} ${command.category} ${(command.aliases || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [commands, query, status, risk]);
  const lastPage = Math.max(0, Math.ceil(filtered.length / 40) - 1);
  const current = Math.min(page, lastPage);
  return <section className="panel"><h2>Complete command catalogue</h2><p>Inspect every discovered command, its risk, exposure, and dispatch path. Listing a command does not make it executable or grant permission.</p>
    <div className="toolbar-actions"><select aria-label="Filter exposure" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">All exposure states</option>{[...new Set(commands.map(c => c.governed_status))].sort().map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter risk" value={risk} onChange={e => { setRisk(e.target.value); setPage(0); }}><option value="">All risk levels</option>{[...new Set(commands.map(c => c.risk_class))].sort().map(value => <option key={value}>{value}</option>)}</select><span>{filtered.length} matching commands</span></div>
    <table className="catalogue-table"><thead><tr><th>Command</th><th>Exposure and risk</th><th>Details</th></tr></thead><tbody>{filtered.slice(current * 40, (current + 1) * 40).map((command, index) => <tr key={`${command.canonical_id}:${index}`}>
      <td><code>{command.original_name}</code><p>{command.description || command.category}</p><small>{(command.aliases || []).join(', ')}</small></td>
      <td>{command.governed_status.replace(/_/g, ' ')}<br /><small>{command.risk_class} · {command.side_effect_level}</small><p>Assistant exposure: {command.llm_safe ? 'Permitted by registry policy' : 'Not exposed'}</p></td>
      <td><details><summary>Inspect classification</summary><p>{command.classification_reason}</p>{command.unavailable_reason && <p>{command.unavailable_reason}</p>}<p>{command.side_effect_detail}</p><code>{command.actual_dispatch_path || command.handler_symbol || command.source || 'Dispatch path not reported'}</code></details>
        <button disabled={canPrepare ? !canPrepare(command) : false} title={canPrepare&&!canPrepare(command)?'No desktop handler is bound for this catalogue entry':undefined} onClick={() => onPrepare(command)}>Prepare command</button>
        <button onClick={() => { void navigator.clipboard.writeText(command.original_name).then(() => setNotice('Command name copied'), () => setNotice('Clipboard unavailable')); }}>Copy name</button></td>
    </tr>)}</tbody></table>
    {!filtered.length && <p>No commands match these filters.</p>}
    <div className="toolbar-actions"><button disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current + 1} of {lastPage + 1}</span><button disabled={current === lastPage} onClick={() => setPage(current + 1)}>Next</button><span role="status">{notice}</span></div>
  </section>;
}
