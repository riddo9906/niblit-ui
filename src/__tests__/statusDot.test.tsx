import { describe, it, expect } from 'vitest';
import { StatusDot, statusKind, type StatusKind } from '../components/ui/StatusDot';

describe('statusKind', () => {
  it('maps healthy / operational / ready states to ok', () => {
    expect(statusKind('Healthy')).toBe('ok');
    expect(statusKind('operational')).toBe('ok');
    expect(statusKind('CONNECTED')).toBe('ok');
    expect(statusKind('ready')).toBe('ok');
    expect(statusKind('active')).toBe('ok');
    expect(statusKind('online')).toBe('ok');
  });

  it('maps degraded / observe / paper states to warn', () => {
    expect(statusKind('degraded')).toBe('warn');
    expect(statusKind('observe')).toBe('warn');
    expect(statusKind('paper')).toBe('warn');
    expect(statusKind('WARN')).toBe('warn');
  });

  it('maps offline / disconnected / error states to danger', () => {
    expect(statusKind('offline')).toBe('danger');
    expect(statusKind('disconnected')).toBe('danger');
    expect(statusKind('error')).toBe('danger');
    expect(statusKind('unavailable')).toBe('danger');
  });

  it('treats connecting / waiting / unknown as idle', () => {
    expect(statusKind('Connecting…')).toBe('idle');
    expect(statusKind('Waiting')).toBe('idle');
    expect(statusKind(undefined)).toBe('idle');
  });

  it('does not misclassify "connecting" as ok (regression guard)', () => {
    // 'connecting' contains 'connect' but must NOT match 'connected'
    expect(statusKind('connecting')).not.toBe('ok');
    expect(statusKind('connecting')).toBe('idle');
  });
});

describe('StatusDot primitive', () => {
  it('loads as a callable component and resolves a kind', () => {
    expect(typeof StatusDot).toBe('function');
    const kinds: StatusKind[] = ['ok', 'warn', 'danger', 'idle'];
    expect(kinds).toContain(statusKind('ready'));
  });
});

