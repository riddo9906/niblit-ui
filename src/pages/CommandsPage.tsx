import { useEffect, useMemo, useState } from 'react';
import {
  type CommandInfo,
  type CommandExecutionResult,
  type CommandState,
  type CommandSurfaceResponse,
  type GovernedCommand,
  type GovernedRegistryResponse,
  filterCommands,
  fetchCommandSurface,
  fetchGovernedCommands,
  executeGovernedCommand,
  initialArgumentValues,
  parseArgumentValues,
  stateLabel,
} from '../services/commandsApi';
import { sendChat } from '../services/niblitApi';
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
    const known = commands.find((c) => trimmed.toLowerCase().startsWith(c.name.toLowerCase()));
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
      const response = await sendChat(trimmed);
      onResult({
        id: `${Date.now()}`,
        command: trimmed,
        output: response.reply,
        error: response.error,
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
        <code>{command.name}</code>
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
            {command.execution_enabled
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
              <input
                className="cmd-arg__input"
                type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                value={argValues[key] ?? ''}
                onChange={(event) => onArgChange(key, event.target.value)}
                placeholder={prop.description ?? ''}
                aria-label={`Argument ${key}`}
              />
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
            <pre className="cmd-result__json">{JSON.stringify(lastResult.result, null, 2)}</pre>
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
      c.description.toLowerCase().includes(q),
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
    void fetchGovernedCommands().then((payload) => {
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
  }, []);

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
  }, []);

  const commands = registry?.commands ?? [];
  const filtered = useMemo(() => filterGoverned(commands, query), [commands, query]);
  const grouped = useMemo(() => groupGoverned(filtered), [filtered]);
  const budgets = registry?.research_budgets;
  const selectedArgs = selected
    ? (argValues[selected.name] ?? initialArgumentValues(selected))
    : {};

  function select(command: GovernedCommand) {
    setSelected(command);
    setArgValues((current) => ({
      ...current,
      [command.name]: argValues[command.name] ?? initialArgumentValues(command),
    }));
  }

  async function runSelected(): Promise<void> {
    if (!selected || executingName !== null) return;
    setExecutingName(selected.name);
    try {
      const args = parseArgumentValues(selected, selectedArgs);
      const outcome = await executeGovernedCommand(selected.name, args);
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
        meta={loading ? undefined : `${commands.length} governed capabilities`}
      />
      <div className="commands-layout">
        <div className="commands-master">
          <input
            className="cmd-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search governed commands…"
            aria-label="Search commands"
          />
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
                    <code className="cmd-row__name">{command.name}</code>
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
              Research budgets (structural): {budgets.max_searches} searches ·{' '}
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

