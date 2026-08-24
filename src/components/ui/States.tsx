import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Section header with optional right-side meta, establishing clear text hierarchy. */
export function SectionHeader({
  title,
  meta,
  className,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('section-header', className)}>
      <div className="section-header__title">{title}</div>
      {meta !== undefined && meta !== null && <div className="section-header__meta">{meta}</div>}
      {children}
    </div>
  );
}

/** Consistent empty / loading / unavailable states so no panel is ever blank. */
export function EmptyState({
  icon = '◌',
  title,
  hint,
  kind = 'idle',
}: {
  icon?: string;
  title: ReactNode;
  hint?: ReactNode;
  kind?: 'idle' | 'loading' | 'unavailable';
}) {
  return (
    <div className={cn('empty-state', kind === 'loading' && 'empty-state--loading', kind === 'unavailable' && 'empty-state--unavailable')}>
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      {hint !== undefined && <div className="empty-state__hint">{hint}</div>}
    </div>
  );
}