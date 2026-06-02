import { buildPluginManifest } from './buildPluginManifest';

describe('buildPluginManifest', () => {
  it('produces a JSON string with name, description, and version', () => {
    const manifest = buildPluginManifest({
      name: 'security',
      description: 'Security helpers',
      version: '0.1.0',
    });
    const parsed = JSON.parse(manifest);
    expect(parsed).toEqual({
      name: 'security',
      description: 'Security helpers',
      version: '0.1.0',
    });
  });

  describe('when none provided', () => {
    it('omits description', () => {
      const manifest = buildPluginManifest({
        name: 'security',
        version: '0.1.0',
      });
      const parsed = JSON.parse(manifest);
      expect(parsed).not.toHaveProperty('description');
    });
  });

  describe('formats JSON', () => {
    let manifest: string;

    beforeEach(() => {
      manifest = buildPluginManifest({
        name: 'security',
        version: '0.1.0',
      });
    });

    it('adds a trailing newline', () => {
      expect(manifest.endsWith('\n')).toBe(true);
    });

    it('uses 2-space indent', () => {
      expect(manifest).toContain('  "name"');
    });
  });
});
