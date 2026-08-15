import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_BASE_URL, CLOUD_BASE_URL, apiUrl, cloudUrl } from '../config/api';

describe('api config', () => {
  it('defaults API_BASE_URL to 5000', () => {
    expect(API_BASE_URL).toBe('http://127.0.0.1:5000');
  });

  it('defaults CLOUD_BASE_URL to 8000', () => {
    expect(CLOUD_BASE_URL).toBe('http://127.0.0.1:8000');
  });

  it('apiUrl normalizes paths', () => {
    expect(apiUrl('/health')).toBe('http://127.0.0.1:5000/health');
    expect(apiUrl('health')).toBe('http://127.0.0.1:5000/health');
  });

  it('cloudUrl normalizes paths', () => {
    expect(cloudUrl('/v1/models')).toBe('http://127.0.0.1:8000/v1/models');
    expect(cloudUrl('v1/chat/completions')).toBe('http://127.0.0.1:8000/v1/chat/completions');
  });
});