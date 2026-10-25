import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CommandCatalogue from '../components/commands/CommandCatalogue';
import { usePreferences } from '../lib/preferences';
import {
  type CommandInfo,
  type CommandExecutionResult,
  type CommandState,
  type CommandSurfaceResponse,
  type GovernedCommand,
  type GovernedRegistryResponse,
  type AuditedCommand,
  filterCommands,
  fetchCommandSurface,
  fetchDesktopCommands,
  executeOperatorCommand,
  executeGovernedCommand,
  initialArgumentValues,
  parseArgumentValues,
  stateLabel,
} from '../services/commandsApi';
import { SectionHeader, EmptyState } from '../components/ui/States';

export interface HistoryEntry {
  id: string;
  command: string;
  output: string;
  error?: string;
  /** Truthful execution status from the governed endpoint (Phase 5E). */
  status?: string;
  at: number;
}

export function CommandDetail({ command }: { command: CommandInfo }) {
  return (
    <aside className="cmd-detail">
      <div className="cmd-detail__name">
        <code>{command.label}</code>
      </div>
      <p className="cmd-detail__desc">
        {command.description || 'No description provided by the runtime catalogue.'}
      </p>
      <dl className="cmd-meta">
        <div className="cmd-meta__row">
          <dt>Usage</dt>
          <dd><code>{command.requiresInput ? command.label : command.name}</code></dd>
        </div>
        <div className="cmd-meta__row">
          <dt>Arguments</dt>
          <dd>
            {command.requiresInput ? (
              <>
                <code>{command.argumentHint ?? 'input'}</code>
                <span className="cmd-meta__req">Required</span>
              </>
            ) : (
              <span className="cmd-meta__none">None</span>
            )}
          </dd>
        </div>
        <div className="cmd-meta__row">
          <dt>Category</dt>
          <dd>{command.category}</dd>
        </div>
        <div className="cmd-meta__row">
          <dt>Execution</dt>
          <dd>Governed by Core registry</dd>
        </div>
      </dl>
    </aside>
  );
}

/** Shared command-execution hook used by both the panel and the palette. */
export function useCommandRunner(
  commands: CommandInfo[],
  onResult: (entry: HistoryEntry) => void,
) {
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  async function execute(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || pendingCommand !== null) return;
    const known = [...commands].sort((a,b)=>b.name.length-a.name.length).find((c) => trimmed.toLowerCase() === c.name.toLowerCase()
      || trimmed.toLowerCase().startsWith(`${c.name.toLowerCase()} `));
    if (!known && commands.length > 0) {
      const suggestions = filterCommands(commands, trimmed).slice(0, 3).map((c) => c.name);
      onResult({
        id: `${Date.now()}-unknown`,
        command: trimmed,
        output: '',
        error:
          suggestions.length > 0
            ? `Unknown command. Possible commands: ${suggestions.join(', ')}`
            : 'Unknown command. Try "help" to list available commands.',
        at: Date.now(),
      });
      return;
    }
    setPendingCommand(trimmed);
    try {
      if (!known) throw new Error('Select a known command before execution.');
      const response = await executeOperatorCommand(known.name,{text:trimmed.slice(known.name.length).trim()});
      onResult({
        id: `${Date.now()}`,
        command: trimmed,
        output: typeof response.result === 'string' ? response.result : JSON.stringify(response.result,null,2),
        error: response.error || undefined,
        status: response.status,
        at: Date.now(),
      });
    } catch {
      onResult({
        id: `${Date.now()}`,
        command: trimmed,
        output: '',
        error: 'Core did not respond to the command request.',
        at: Date.now(),
      });
    } finally {
      setPendingCommand(null);
    }
  }

  return { execute, pendingCommand };
}

// ─── Governed command surface (Phase 5E) ─────────────────────────────────────

const stateKindClass: Record<CommandState, string> = {
  EXECUTABLE: 'ok',
  REQUIRES_AUTHORIZATION: 'warn',
  UNAVAILABLE: 'danger',
  BLOCKED: 'danger',
  REGISTERED: 'idle',
};

const stateGlyph: Record<CommandState, string> = {
  EXECUTABLE: '\u25BA',
  REQUIRES_AUTHORIZATION: '\u25B2',
  UNAVAILABLE: '\u00D7',
  BLOCKED: '\u00D7',
  REGISTERED: '\u25CB',
};

/** Truthful state badge: never communicates state by color alone. */
export function GovernedBadge({ state }: { state: CommandState }) {
  return (
    <span
      className={`cmd-state cmd-state--${stateKindClass[state]}`}
      data-state={state}
      title={stateLabel(state)}
    >
      <span aria-hidden="true">{stateGlyph[state]}</span> {stateLabel(state)}
    </span>
  );
}

/** Detail pane for a governed command: schema, governance, arguments, execute. */
export function GovernedDetail({
  command,
  argValues,
  onArgChange,
  onExecute,
  executing,
  lastResult,
}: {
  command: GovernedCommand;
  argValues: Record<string, string>;
  onArgChange: (key: string, value: string) => void;
  onExecute: () => void;
  executing: boolean;
  lastResult: CommandExecutionResult | null;
}) {
  const properties = command.input_schema.properties ?? {};
  const required = new Set(command.input_schema.required ?? []);
  const canRun = command.execution_enabled && !executing;
  return (
    <aside className="cmd-detail">
      <div className="cmd-detail__name">
        <code>{command.original_name || command.name}</code>
        <GovernedBadge state={command.state} />
      </div>
      <p className="cmd-detail__desc">
        {command.description || 'No description provided by the governed registry.'}
      </p>
      {!command.execution_enabled && command.unavailable_reason && (
        <p className="cmd-detail__unavailable" role="status">
          Unavailable: {command.unavailable_reason}
        </p>
      )}
      <dl className="cmd-meta">
        <div className="cmd-meta__row">
          <dt>Category</dt>
          <dd>{command.category}</dd>
        </div>
        <div className="cmd-meta__row">
          <dt>Risk</dt>
          <dd>
            {command.audit_risk_class ?? command.risk_class} ·{' '}
            {command.audit_side_effect_level ?? command.side_effect_level}
          </dd>
        </div>
        {command.side_effect_detail && (
          <div className="cmd-meta__row">
            <dt>Side effects</dt>
            <dd>{command.side_effect_detail}</dd>
          </div>
        )}
        <div className="cmd-meta__row">
          <dt>Authorization</dt>
          <dd>
            {command.requires_authorization
              ? `Required (${command.authorization_action ?? 'operator grant'})`
              : 'Not required'}
          </dd>
        </div>
        <div className="cmd-meta__row">
          <dt>LLM access</dt>
          <dd>
            {command.execution_channel === 'operator' ? 'Desktop operator only; not exposed to the assistant' : command.execution_enabled
              ? 'Available on the governed assistant tool loop'
              : 'Not exposed to the assistant (operator/runtime only)'}
          </dd>
        </div>
        {command.original_name && command.original_name !== command.name && (
          <div className="cmd-meta__row">
            <dt>Original</dt>
            <dd>
              <code>{command.original_name}</code>
              {command.aliases && command.aliases.length > 0 && (
                <span className="cmd-meta__none"> · aliases: {command.aliases.join(', ')}</span>
              )}
            </dd>
          </div>
        )}
        {command.evidence && (
          <div className="cmd-meta__row">
            <dt>Evidence</dt>
            <dd>{command.evidence}</dd>
          </div>
        )}
        {command.source_symbol && (
          <div className="cmd-meta__row">
            <dt>Source</dt>
            <dd>
              <code>{command.source_symbol}</code>
            </dd>
          </div>
        )}
        {command.authorization_action && (
          <div className="cmd-meta__row">
            <dt>Permission</dt>
            <dd><code>{command.authorization_action}</code></dd>
          </div>
        )}
      </dl>

      {Object.keys(properties).length > 0 && (
        <div className="cmd-args">
          <div className="cmd-args__title">Arguments</div>
          {Object.entries(properties).map(([key, prop]) => (
            <label key={key} className="cmd-arg">
              <span className="cmd-arg__label">
                <code>{key}</code>
                {required.has(key) && <span className="cmd-meta__req">Required</span>}
              </span>
              {prop.enum || prop.type === 'boolean' ? <select aria-label={`Argument ${key}`} className="cmd-arg__input" value={argValues[key] ?? ''} onChange={event => onArgChange(key, event.target.value)}><option value="">Select a value</option>{(prop.enum || [true, false]).map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select> : prop.type === 'array' || prop.type === 'object' ? <textarea aria-label={`Argument ${key}`} className="cmd-arg__input" value={argValues[key] ?? ''} onChange={event => onArgChange(key, event.target.value)} placeholder={prop.type === 'array' ? '["value"]' : '{"key": "value"}'} /> : <input
                className="cmd-arg__input"
                type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                step={prop.type === 'integer' ? 1 : 'any'}
                min={prop.minimum}
                max={prop.maximum}
                value={argValues[key] ?? ''}
                onChange={(event) => onArgChange(key, event.target.value)}
                placeholder={prop.description ?? ''}
                aria-label={`Argument ${key}`}
              />}
            </label>
          ))}
        </div>
      )}

      <div className="cmd-execute">
        <button
          type="button"
          className="cmd-run-btn"
          onClick={onExecute}
          disabled={!canRun}
          title={
            command.state === 'REQUIRES_AUTHORIZATION'
              ? 'This capability requires an explicit operator grant before it will execute.'
              : command.state === 'UNAVAILABLE'
                ? 'A required runtime dependency is currently unavailable.'
                : undefined
          }
        >
          {executing ? 'Executing…' : 'Execute'}
        </button>
        {!command.execution_enabled && (
          <span className="cmd-detail__blocked-note">{stateLabel(command.state)}</span>
        )}
      </div>

      {lastResult && lastResult.command === command.name && (
        <div className="cmd-result">
          <div className={`cmd-result__status cmd-result__status--${lastResult.status}`}>
            {lastResult.status}
            {typeof lastResult.duration_ms === 'number' && ` · ${lastResult.duration_ms} ms`}
          </div>
          {lastResult.error && (
            <div className="cmd-result__error">{lastResult.error}</div>
          )}
          {lastResult.result !== null && lastResult.result !== undefined && (
            <pre className="cmd-result__json">{typeof lastResult.result === 'string' ? lastResult.result
              : lastResult.result && typeof lastResult.result === 'object' && 'summary' in lastResult.result && typeof lastResult.result.summary === 'string'
                ? lastResult.result.summary : JSON.stringify(lastResult.result, null, 2)}</pre>
          )}
          {lastResult.governance && (
            <div className="cmd-result__gov">
              via {lastResult.governance.executor} · schema-validated: {String(lastResult.governance.schema_validated)}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/** Case-insensitive search over governed command name/category/description. */
export function filterGoverned(commands: GovernedCommand[], query: string): GovernedCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.original_name || '').toLowerCase().includes(q) ||
      (c.aliases || []).some(alias => alias.toLowerCase().includes(q)),
  );
}

/** Group governed commands by category, preserving registry order. */
export function groupGoverned(
  commands: GovernedCommand[],
): Array<{ category: string; commands: GovernedCommand[] }> {
  const map = new Map<string, GovernedCommand[]>();
  for (const command of commands) {
    const list = map.get(command.category);
    if (list) list.push(command);
    else map.set(command.category, [command]);
  }
  return Array.from(map.entries()).map(([category, cmds]) => ({ category, commands: cmds }));
}

const historyGlyph: Record<string, string> = {
  success: '\u2713',
  rejected: '\u00D7',
  authorization_required: '\u25B3',
  unavailable: '\u00D7',
  error: '\u00D7',
};

export default function CommandsPage() {
  const preferences = usePreferences();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'actions' | 'catalogue'>('actions');
  const [reloadCounter, setReloadCounter] = useState(0);
  const [stateFilter, setStateFilter] = useState('');
  const [confirmRequested, setConfirmRequested] = useState(false);
  const [registry, setRegistry] = useState<GovernedRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GovernedCommand | null>(null);
  const [argValues, setArgValues] = useState<Record<string, Record<string, string>>>({});
  const [executingName, setExecutingName] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CommandExecutionResult>>({});
  const [history, setHistory] = useState<CommandExecutionResult[]>([]);
  const [surface, setSurface] = useState<CommandSurfaceResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    void fetchDesktopCommands().then((payload) => {
      if (cancelled) return;
      if (!payload || payload.commands.length === 0) {
        setLoadError('Core governed command registry is unavailable.');
      }
      setRegistry(payload);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadCounter]);

  // Phase 5G: the read-only ORIGINAL surface audit. It is advisory: when the
  // core does not expose it, the governed registry alone still renders.
  useEffect(() => {
    let cancelled = false;
    void fetchCommandSurface().then((payload) => {
      if (!cancelled) setSurface(payload);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadCounter]);

  useEffect(() => {
    const requested = searchParams.get('q');
    if (!requested) return;
    setQuery(requested);
    const command = registry?.commands.find(c => c.name === requested || c.original_name === requested || c.aliases?.includes(requested));
    if (command) { setSelected(command); setView('actions'); }
    else if (registry) setView('catalogue');
  }, [searchParams, registry]);

  const commands = registry?.commands ?? [];
  const catalogue = useMemo(() => {
    const original=surface?.commands || [];
    const seen=new Set(original.map(c=>c.original_name));
    const added: AuditedCommand[]=commands.filter(c=>c.execution_channel==='operator'&&!seen.has(c.name)).map(c=>({
      original_name:c.name,canonical_id:c.name,category:c.category,description:c.description,aliases:c.aliases,
      risk_class:c.risk_class,side_effect_level:c.side_effect_level,llm_safe:false,governed_status:'OPERATOR_ONLY',
      classification_reason:'Original source handler; desktop operator access is separate from assistant tools.',
      implementation_exists:c.state!=='UNAVAILABLE',source:c.original_source,unavailable_reason:c.unavailable_reason,
    }));
    return [...original,...added];
  },[surface,commands]);
  const filtered = useMemo(() => filterGoverned(commands, query).filter(c => !stateFilter || c.state === stateFilter), [commands, query, stateFilter]);
  const grouped = useMemo(() => groupGoverned(filtered), [filtered]);
  const budgets = registry?.research_budgets;
  const selectedArgs = selected
    ? (argValues[selected.name] ?? initialArgumentValues(selected))
    : {};

  function select(command: GovernedCommand) {
    setConfirmRequested(false);
    setSelected(command);
    setArgValues((current) => ({
      ...current,
      [command.name]: argValues[command.name] ?? initialArgumentValues(command),
    }));
  }

  async function runSelected(confirmed = false): Promise<void> {
    if (!selected || executingName !== null) return;
    if (!confirmed && preferences.confirmActions && !['read_only', 'none', 'NONE'].includes(selected.side_effect_level)) {
      setConfirmRequested(true);
      return;
    }
    setConfirmRequested(false);
    setExecutingName(selected.name);
    try {
      const args = parseArgumentValues(selected, selectedArgs);
      const outcome = selected.execution_channel === 'operator'
        ? await executeOperatorCommand(selected.name,args)
        : await executeGovernedCommand(selected.name, args);
      setResults((current) => ({ ...current, [selected.name]: outcome }));
      setHistory((current) => [outcome, ...current].slice(0, 12));
    } catch (error) {
      const failure: CommandExecutionResult = {
        command: selected.name,
        request_id: '',
        status: 'error',
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
      setResults((current) => ({ ...current, [selected.name]: failure }));
      setHistory((current) => [failure, ...current].slice(0, 12));
    } finally {
      setExecutingName(null);
    }
  }

  return (
    <div className="commands-page">
      <SectionHeader
        title="Commands"
        meta={loading ? undefined : `${commands.length} original and assistant commands`}
      />
      <div className="toolbar-actions"><button aria-pressed={view === 'actions'} onClick={() => setView('actions')}>Run commands ({commands.length})</button><button aria-pressed={view === 'catalogue'} onClick={() => setView('catalogue')}>All commands ({catalogue.length})</button><button disabled={loading} onClick={() => setReloadCounter(value => value + 1)}>Refresh registry</button></div>
      {registry?.operator_available===false&&<p role="alert">This backend does not expose original operator commands. Restart the updated Core build.</p>}
      {confirmRequested && selected && <div className="panel" role="alertdialog" aria-label="Confirm command"><h3>Run {selected.name}?</h3><p>{selected.side_effect_detail || `This action has ${selected.side_effect_level} side effects.`} Backend authorization still applies.</p><button onClick={() => void runSelected(true)}>Confirm action</button><button onClick={() => setConfirmRequested(false)}>Cancel</button></div>}
      {view === 'catalogue' && <><input className="cmd-search" aria-label="Search complete command catalogue" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search every command and alias…" />
        {catalogue.length ? <CommandCatalogue commands={catalogue} query={query} canPrepare={entry=>commands.some(c=>c.name===entry.governed_tool||c.name===entry.original_name||c.aliases?.includes(entry.original_name))} onPrepare={entry => { const command = commands.find(c => c.name === entry.governed_tool || c.name === entry.original_name || c.aliases?.includes(entry.original_name)); if (command) { select(command); setView('actions'); setQuery(''); } }} /> : <EmptyState title="Complete catalogue unavailable" hint="Refresh after Core finishes starting." />}</>}
      <div className="commands-layout" style={{ display: view === 'catalogue' ? 'none' : undefined }}>
        <div className="commands-master">
          <input
            className="cmd-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search original commands, aliases and actions…"
            aria-label="Search commands"
          />
          <select aria-label="Filter command availability" value={stateFilter} onChange={e => setStateFilter(e.target.value)}><option value="">All availability states</option>{[...new Set(commands.map(c => c.state))].sort().map(state => <option key={state} value={state}>{stateLabel(state)}</option>)}</select>
          {loading ? (
            <EmptyState kind="loading" icon="◌" title="Retrieving governed registry…" />
          ) : loadError ? (
            <EmptyState kind="unavailable" icon="×" title="Registry unavailable" hint={loadError} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="○" title="No matching commands" hint={`Nothing matches "${query}".`} />
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="cmd-group">
                <div className="cmd-group__label">{group.category}</div>
                {group.commands.map((command) => (
                  <button
                    key={`${command.category}:${command.name}`}
                    type="button"
                    className={
                      selected && selected.name === command.name
                        ? 'cmd-row cmd-row--active'
                        : 'cmd-row'
                    }
                    onClick={() => select(command)}
                  >
                    <code className="cmd-row__name">{command.original_name || command.name}</code>
                    <GovernedBadge state={command.state} />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="commands-side">
          {selected ? (
            <GovernedDetail
              command={selected}
              argValues={selectedArgs}
              onArgChange={(key, value) =>
                setArgValues((current) => ({
                  ...current,
                  [selected.name]: { ...(current[selected.name] ?? {}), [key]: value },
                }))
              }
              onExecute={() => void runSelected()}
              executing={executingName === selected.name}
              lastResult={results[selected.name] ?? null}
            />
          ) : (
            <div className="cmd-detail cmd-detail--empty">
              <EmptyState icon="⌘" title="Select a command" hint="Inspect schema and arguments, then execute through the governed runtime." />
            </div>
          )}

          <div className="cmd-history">
            <SectionHeader title="History" meta={`${history.length}`} />
            {history.length === 0 ? (
              <EmptyState icon="○" title="No commands run yet" />
            ) : (
              history.map((entry, index) => (
                <button
                  key={`${entry.request_id}-${index}`}
                  type="button"
                  className="cmd-history__item"
                  onClick={() => {
                    const command = commands.find((c) => c.name === entry.command);
                    if (command) select(command);
                  }}
                  title="Inspect this command"
                >
                  <code>{entry.command}</code>
                  <span className={
                    entry.status === 'success'
                      ? 'cmd-history__state'
                      : 'cmd-history__state cmd-history__state--err'
                  }>
                    {historyGlyph[entry.status] ?? '×'} {entry.status}
                  </span>
                </button>
              ))
            )}
          </div>

          {budgets && (
            <p className="cmd-budgets">
              Assistant research budgets: {budgets.max_searches} searches ·{' '}
              {budgets.max_fetches} fetches · {budgets.max_rounds} rounds — the UI cannot
              raise them.
            </p>
          )}

          {surface && (
            <div className="cmd-surface">
              <p className="cmd-surface__line">
                Original surface (read-only audit): {surface.summary.total} commands ·{' '}
                {surface.summary.by_status.GOVERNED_EXECUTABLE ?? 0} governed ·{' '}
                {surface.summary.by_status.OPERATOR_ONLY ?? 0} operator-only ·{' '}
                {surface.summary.by_risk_class.TRADING ?? 0} trading (never LLM-exposed)
              </p>
              {surface.summary.unexplained.length === 0 ? (
                <p className="cmd-surface__line cmd-surface__line--ok">
                  Every original command is classified — no unexplained commands.
                </p>
              ) : (
                <p className="cmd-surface__line cmd-surface__line--warn" role="status">
                  {surface.summary.unexplained.length} command(s) need classification:{' '}
                  {surface.summary.unexplained.slice(0, 6).join(', ')}
                </p>
              )}
              {surface.conflicts.length > 0 && (
                <ul className="cmd-surface__conflicts">
                  {surface.conflicts.slice(0, 5).map((conflict, index) => (
                    <li key={index}>
                      {String(conflict.type ?? 'conflict')}:{' '}
                      {String(conflict.command ?? conflict.alias ?? conflict.canonical_id ?? '')}
                      {conflict.resolution ? ` — ${String(conflict.resolution)}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

