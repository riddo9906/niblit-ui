import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type CommandInfo,
  fetchDesktopCommands,
  desktopPaletteCommands,
  filterCommands,
  groupCommands,
} from '../../services/commandsApi';
import { type HistoryEntry } from '../../pages/CommandsPage';
import { cn } from '../../lib/utils';

/**
 * CommandPalette — global Ctrl+K surface over the authoritative Core catalogue.
 * Keyboard: ↑/↓ navigate · Enter select/execute · Escape close.
 */
export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onResult?: (entry: HistoryEntry) => void;
}) {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError('');
    void fetchDesktopCommands().then(payload => {
      if (cancelled) return;
      setCommands(payload ? desktopPaletteCommands(payload) : []);
      if (!payload) setError('Core command catalogue unavailable. Reopen after Core is ready.');
    }).catch(() => { if (!cancelled) setError('Could not load Core commands.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);
  const grouped = useMemo(() => groupCommands(filtered), [filtered]);

  // Flatten for keyboard index math while preserving grouped display order.
  const flatList = useMemo(() => grouped.flatMap(group => group.commands), [grouped]);

  useEffect(() => {
    if (activeIndex >= flatList.length) {
      setActiveIndex(Math.max(0, flatList.length - 1));
    }
  }, [activeIndex, flatList.length]);

  if (!open) {
    return null;
  }

  function runCommand(command: CommandInfo) {
    // Selection prepares a command; execution always stays in the governed UI.
    navigate(`/commands?q=${encodeURIComponent(command.name)}`);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = flatList[activeIndex];
      if (command) {
        runCommand(command);
      }
    }
  }

  let renderedIndex = -1;

  return (
    <div className="palette-overlay" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search Niblit commands…"
          aria-label="Search commands"
        />
        <div className="palette__list">
          {flatList.length === 0 ? (
            <div className="palette__empty" role="status">{loading ? 'Loading original Core commands…' : error || 'No matching commands.'}</div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="cmd-group__label">{group.category}</div>
                {group.commands.map((command) => {
                  renderedIndex += 1;
                  const index = renderedIndex;
                  return (
                    <button
                      key={`${command.category}:${command.name}`}
                      type="button"
                      className={cn('palette__item', index === activeIndex && 'palette__item--active')}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => runCommand(command)}
                    >
                      <code>{command.label}</code>
                      <span>{command.description} {command.state && ` · ${command.state.toLowerCase().replace(/_/g, ' ')}`}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <footer className="palette__hint">
          <span>↑↓ Navigate</span>
          <span>↵ Prepare command</span>
          <span>{commands.length} commands</span>
          <span>Esc Close</span>
        </footer>
      </div>
    </div>
  );
}
