import { cn } from '../../lib/utils';

/**
 * StatusDot — a small semantic status indicator.
 * Never communicates status by color alone: an icon glyph (● ▲ × ○) is always
 * rendered next to the dot so the state is readable without color.
 */
export type StatusKind = 'ok' | 'warn' | 'danger' | 'idle';

const dotClass: Record<StatusKind, string> = {
  ok: 'runtime-dot--ok',
  warn: 'runtime-dot--warn',
  danger: 'runtime-dot--danger',
  idle: 'runtime-dot--idle',
};

const glyph: Record<StatusKind, string> = {
  ok: '●',
  warn: '▲',
  danger: '×',
  idle: '○',
};

/** Map a raw runtime status string to a {@link StatusKind}.
 *  Order matters: disconnect/offline/error are checked before the positive
 *  'connected' match, otherwise 'disconnected' would wrongly classify as ok.
 */
export function statusKind(status?: string): StatusKind {
  const s = (status ?? '').toLowerCase();
  if (s.includes('offline') || s.includes('disconnect') || s.includes('error') || s.includes('unavailable') || s.includes('fail')) {
    return 'danger';
  }
  if (s.includes('degraded') || s.includes('warn') || s.includes('observe') || s.includes('paper')) {
    return 'warn';
  }
  if (s.includes('healthy') || s.includes('operational') || s.includes('connected') || s.includes('ready') || s.includes('active') || s.includes('online')) {
    return 'ok';
  }
  return 'idle';
}

export function StatusDot({
  status,
  kind,
  label,
  pulse = false,
  className,
}: {
  status?: string;
  kind?: StatusKind;
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  const k = kind ?? statusKind(status);
  return (
    <span className={cn('statusdot', pulse && 'statusdot--pulse', className)}>
      <span className={cn('runtime-dot', dotClass[k])} />
      <span className="statusdot__glyph">{glyph[k]}</span>
      {label !== undefined && <span className="statusdot__label">{label}</span>}
    </span>
  );
}