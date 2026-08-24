import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type CommandInfo,
  fetchCommands,
  filterCommands,
  groupCommands,
} from '../../services/commandsApi';
import { useCommandRunner, type HistoryEntry } from '../../pages/CommandsPage';
import { cn } from '../../lib/utils';

/**
 * CommandPalette — global Ctrl+K surface over the authoritative Core catalogue.
 * Keyboard: ↑/↓ navigate · Enter select/execute · Escape close.
 */
export default function CommandPalette({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult?: (entry: HistoryEntry) => void;
}) {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && commands.length === 0) {
      void fetchCommands().then(setCommands);
    }
  }, [open, commands.length]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = useMemo(() => filterCommands(commands, query).slice(0, 40), [commands, query]);
  const grouped = useMemo(() => groupCommands(filtered), [filtered]);
  const { execute } = useCommandRunner(commands, (entry) => onResult?.(entry));

  // Flatten for keyboard index math while preserving grouped display order.
  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    if (activeIndex >= flatList.length) {
      setActiveIndex(Math.max(0, flatList.length - 1));
    }
  }, [activeIndex, flatList.length]);

  if (!open) {
    return null;
  }

  function runCommand(command: CommandInfo) {
    void execute(command.requiresInput ? `${command.name} ` : command.name);
    // Commands needing input land in the Commands workspace where the
    // argument can be completed under governance.
    if (command.requiresInput) {
      navigate('/commands');
    }
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
            <div className="palette__empty">No matching commands.</div>
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
                      <span>{command.description}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <footer className="palette__hint">
          <span>↑↓ Navigate</span>
          <span>↵ Run</span>
          <span>Esc Close</span>
        </footer>
      </div>
    </div>
  );
}
