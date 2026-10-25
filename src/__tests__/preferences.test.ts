import { describe, expect, it } from 'vitest';
import { normalizePreferences, validateCoreUrl } from '../lib/preferences';

describe('desktop preferences', () => {
  it('accepts local Core addresses and removes the trailing slash', () => {
    expect(validateCoreUrl('http://127.0.0.1:28500/')).toBe('http://127.0.0.1:28500');
  });
  it.each(['https://example.com', 'http://user:password@localhost:5000', 'http://localhost:5000/api', 'file:///tmp/core'])('rejects unsafe or ambiguous connection address %s', (url) => {
    expect(() => validateCoreUrl(url)).toThrow();
  });
  it('bounds saved values before they reach polling and model requests', () => {
    const result = normalizePreferences({ refreshSeconds: 0, maxTokens: 999999, temperature: -1, eventLimit: Infinity });
    expect(result.refreshSeconds).toBe(5);
    expect(result.maxTokens).toBe(4096);
    expect(result.temperature).toBe(0);
    expect(result.eventLimit).toBe(200);
  });
});
