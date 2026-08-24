import { describe, it, expect } from 'vitest';
import { detectTone } from '../components/commands/CommandResultRenderer';

describe('command result tone detection', () => {
  it('flags explicit errors first', () => {
    expect(detectTone('', true)).toBe('error');
    expect(detectTone('Error: something failed')).toBe('error');
  });

  it('detects unknown-command replies as errors', () => {
    expect(detectTone('Unknown command. Try "help" to list available commands.')).toBe('error');
    expect(detectTone('Command not found. Possible commands: status, help')).toBe('error');
  });

  it('detects availability / degradation warnings', () => {
    expect(detectTone('Trading Runtime unavailable.')).toBe('warning');
    expect(detectTone('Memory service degraded.')).toBe('warning');
  });

  it('treats normal output as success', () => {
    expect(detectTone('Core: Ready\nCloud: Ready\nMemory: Connected')).toBe('success');
  });

  it('treats empty output as pending', () => {
    expect(detectTone('   ')).toBe('pending');
  });
});
