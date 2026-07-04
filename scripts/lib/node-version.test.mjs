import { describe, expect, it } from 'vitest';
import { checkNodeVersion } from './node-version.mjs';

// checkNodeVersion takes the version string as a parameter rather than reading
// process.version itself, so these cases exercise every value process.version
// could plausibly hold without needing to stub the global.
describe('checkNodeVersion', () => {
  it('accepts an exact patch match against a wildcard requirement', () => {
    expect(checkNodeVersion('v22.22.0', '22.22.x').ok).toBe(true);
  });

  it('accepts any patch against a wildcard requirement', () => {
    expect(checkNodeVersion('v22.22.7', '22.22.x').ok).toBe(true);
  });

  it('rejects a different minor version', () => {
    const result = checkNodeVersion('v22.20.0', '22.22.x');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('does not satisfy');
  });

  it('rejects a different major version', () => {
    expect(checkNodeVersion('v20.11.0', '22.22.x').ok).toBe(false);
  });

  it('rejects a patch mismatch against an exact requirement', () => {
    expect(checkNodeVersion('v22.22.1', '22.22.0').ok).toBe(false);
  });

  it('accepts an exact patch match against an exact requirement', () => {
    expect(checkNodeVersion('v22.22.0', '22.22.0').ok).toBe(true);
  });

  it('includes nvm and nvm-windows install hints in the mismatch message', () => {
    const result = checkNodeVersion('v18.0.0', '22.22.x');
    expect(result.message).toContain('nvm install 22.22.0');
    expect(result.message).toContain('nvm-windows');
  });

  it('throws a clear error for an unparseable version string', () => {
    expect(() => checkNodeVersion('not-a-version', '22.22.x')).toThrow(/Cannot parse/);
  });
});
