import { useEffect, useMemo, useState } from 'react';
import {
  type CommandInfo,
  fetchCommands,
  filterCommands,
  groupCommands,
} from '../services/commandsApi';
import { sendChat } from '../services/niblitApi';
import { CommandResultRenderer } from '../components/commands/CommandResultRenderer';
import { SectionHeader, EmptyState } from '../components/ui/States';

export interface HistoryEntry {
  id: string;
  command: string;
  output: string;
  error?: string;
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

export default function CommandsPage() {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CommandInfo | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchCommands().then((items) => {
      if (cancelled) return;
      if (items.length === 0) {
        setLoadError('Core API did not return any commands.');
      }
      setCommands(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);
  const grouped = useMemo(() => groupCommands(filtered), [filtered]);
  const { execute, pendingCommand } = useCommandRunner(commands, (entry) => {
    setHistory((current) => [entry, ...current.filter((e) => e.id !== entry.id)]);
  });

  function select(command: CommandInfo) {
    setSelected(command);
    setInputValue(command.requiresInput ? `${command.name} ` : command.name);
  }

  return (
    <div className="commands-page">
      <SectionHeader title="Commands" meta={loading ? undefined : `${commands.length} registered`} />
      <div className="commands-layout">
        <div className="commands-master">
          <input
            className="cmd-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Niblit commands…"
            aria-label="Search commands"
          />
          {loading ? (
            <EmptyState kind="loading" icon="◌" title="Retrieving command catalogue…" />
          ) : loadError ? (
            <EmptyState kind="unavailable" icon="×" title="Catalogue unavailable" hint={loadError} />
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
                      selected && selected.name === command.name && selected.category === command.category
                        ? 'cmd-row cmd-row--active'
                        : 'cmd-row'
                    }
                    onClick={() => select(command)}
                  >
                    <code className="cmd-row__name">{command.label}</code>
                    <span className="cmd-row__desc">{command.description}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="commands-side">
          {selected ? (
            <CommandDetail command={selected} />
          ) : (
            <div className="cmd-detail cmd-detail--empty">
              <EmptyState icon="⌘" title="Select a command" hint="Inspect usage and arguments before running." />
            </div>
          )}

          <div className="cmd-execute">
            <textarea
              className="cmd-input"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void execute(inputValue);
                }
              }}
              rows={2}
              placeholder="Enter a governed Core command…"
              aria-label="Command input"
            />
            <button
              type="button"
              className="cmd-run-btn"
              onClick={() => void execute(inputValue)}
              disabled={!inputValue.trim() || pendingCommand !== null}
            >
              {pendingCommand ? 'Executing…' : 'Execute'}
            </button>
          </div>

          <div className="cmd-history">
            <SectionHeader title="History" meta={`${history.length}`} />
            {history.length === 0 ? (
              <EmptyState icon="○" title="No commands run yet" />
            ) : (
              history.slice(0, 12).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="cmd-history__item"
                  onClick={() => setInputValue(entry.command)}
                  title="Reuse this command"
                >
                  <code>{entry.command}</code>
                  <span className={entry.error ? 'cmd-history__state cmd-history__state--err' : 'cmd-history__state'}>
                    {entry.error ? '× Error' : '✓ Done'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {(pendingCommand !== null || history.length > 0) && (
        <div className="command-results">
          {pendingCommand !== null && <CommandResultRenderer command={pendingCommand} pending />}
          {history.slice(0, 3).map((entry) => (
            <CommandResultRenderer
              key={entry.id}
              command={entry.command}
              output={entry.output}
              error={entry.error}
            />
          ))}
        </div>
      )}
    </div>
  );
}

