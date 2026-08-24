import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { StatusDot } from '../ui/StatusDot';

/**
 * CommandResultRenderer — renders a Core command reply intelligently.
 *
 * The backend execution path (POST /chat → intent engine) returns a textual
 * ``reply``. Many commands embed key/value lines, lists or JSON blocks; this
 * renderer detects those shapes instead of dumping raw text/JSON.
 */

export type ResultTone = 'success' | 'warning' | 'error' | 'info' | 'pending';

export function detectTone(text: string, isError?: boolean): ResultTone {
  if (isError) {
    return 'error';
  }
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) {
    return 'pending';
  }
  if (t.includes('unavailable') || t.includes('degraded') || t.includes('warning')) {
    return 'warning';
  }
  if (t.startsWith('error') || t.includes('failed') || t.includes('not found') || t.includes('traceback')) {
    return 'error';
  }
  if (t.includes('unknown command') || t.includes('command not found')) {
    return 'error';
  }
  return 'success';
}

const toneMeta: Record<ResultTone, { label: string; icon: string }> = {
  success: { label: 'Success', icon: '✓' },
  warning: { label: 'Warning', icon: '▲' },
  error: { label: 'Error', icon: '×' },
  info: { label: 'Info', icon: '○' },
  pending: { label: 'Running', icon: '◌' },
};

interface KeyValueRow {
  key: string;
  value: string;
}

function parseKeyValueBlock(lines: string[]): KeyValueRow[] | null {
  if (lines.length < 2 || lines.length > 24) {
    return null;
  }
  const rows: KeyValueRow[] = [];
  for (const line of lines) {
    const match = line.match(/^([\w .\-/]+?):\s*(.+)$/);
    if (!match) {
      return null;
    }
    rows.push({ key: match[1].trim(), value: match[2].trim() });
  }
  return rows;
}

function KeyValueTable({ rows }: { rows: KeyValueRow[] }) {
  return (
    <div className="cmd-kv">
      {rows.map((row) => (
        <div key={row.key + row.value} className="cmd-kv__row">
          <span className="cmd-kv__key">{row.key}</span>
          <span className="cmd-kv__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="cmd-json">{JSON.stringify(data, null, 2)}</pre>
  );
}

/** Try to extract fenced ```json blocks and render them structurally. */
function extractJsonBlocks(text: string): Array<{ kind: 'text'; value: string } | { kind: 'json'; value: unknown }> {
  const segments: Array<{ kind: 'text'; value: string } | { kind: 'json'; value: unknown }> = [];
  const fence = /```(?:json)?\s*([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    }
    try {
      segments.push({ kind: 'json', value: JSON.parse(match[1]) });
    } catch {
      segments.push({ kind: 'text', value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

function renderTextSegment(segment: string, index: number): ReactNode {
  const lines = segment.replace(/\r/g, '').split('\n');
  const trimmed = lines.filter((line) => line.trim().length > 0);
  // Key/value block detection (status-style output)
  const kv = parseKeyValueBlock(trimmed);
  if (kv) {
    return <KeyValueTable key={index} rows={kv} />;
  }
  return (
    <div key={index} className="cmd-text">
      {lines.map((line, lineIndex) => (
        line.trim() ? <div key={lineIndex} className="cmd-text__line">{line}</div> : null
      ))}
    </div>
  );
}

export function CommandResultBody({ text }: { text: string }) {
  const segments = extractJsonBlocks(text ?? '');
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'json' ? (
          <JsonBlock key={index} data={segment.value} />
        ) : (
          renderTextSegment(segment.value, index)
        ),
      )}
    </>
  );
}

export function CommandResultRenderer({
  command,
  output,
  error,
  pending,
}: {
  command?: string;
  output?: string;
  error?: string;
  pending?: boolean;
}) {
  const tone: ResultTone = pending ? 'pending' : detectTone(output ?? '', Boolean(error));
  const meta = toneMeta[tone];
  const bodyText = error ?? output ?? '';
  return (
    <section className={cn('cmd-result', `cmd-result--${tone}`)} aria-live="polite">
      <header className="cmd-result__header">
        <StatusDot kind={tone === 'success' ? 'ok' : tone === 'warning' ? 'warn' : tone === 'error' ? 'danger' : 'idle'} />
        <span className="cmd-result__state">
          {meta.icon} {meta.label}
        </span>
        {command && <code className="cmd-result__command">{command}</code>}
      </header>
      <div className="cmd-result__body">
        {!bodyText.trim() ? (
          <div className="cmd-result__empty">No output returned.</div>
        ) : (
          <CommandResultBody text={bodyText} />
        )}
      </div>
    </section>
  );
}
