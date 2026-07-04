import { describe, expect, it } from 'vitest';
import { getPingResponse } from './ping';

describe('getPingResponse', () => {
  it('returns a pong message with an ISO timestamp', () => {
    const result = getPingResponse();

    expect(result.message).toContain('pong');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
