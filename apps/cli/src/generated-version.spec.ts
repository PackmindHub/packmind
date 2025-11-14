import { CLI_VERSION } from './generated-version';

describe('CLI Version', () => {
  it('exports CLI_VERSION constant', () => {
    expect(CLI_VERSION).toBeDefined();
  });

  it('CLI_VERSION is a non-empty string', () => {
    expect(typeof CLI_VERSION).toBe('string');
    expect(CLI_VERSION.length).toBeGreaterThan(0);
  });

  it('CLI_VERSION follows semantic versioning format', () => {
    // Should match pattern like "0.3.3" or "1.0.0-beta.1"
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    expect(CLI_VERSION).toMatch(semverPattern);
  });
});
