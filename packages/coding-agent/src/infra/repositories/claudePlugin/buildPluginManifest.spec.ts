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
    let parsed: Record<string, string>;

    beforeEach(() => {
      parsed = JSON.parse(
        buildPluginManifest({
          name: 'security',
          version: '0.1.0',
        }),
      );
    });

    it('omits description', () => {
      expect(parsed).not.toHaveProperty('description');
    });

    it('omits displayName', () => {
      expect(parsed).not.toHaveProperty('displayName');
    });
  });

  describe('when a display name is provided', () => {
    it('keeps the slug as name and adds the display name', () => {
      const parsed = JSON.parse(
        buildPluginManifest({
          name: 'security',
          displayName: 'sécurité',
          version: '1.0.0',
        }),
      );
      expect(parsed).toEqual({
        name: 'security',
        displayName: 'sécurité',
        version: '1.0.0',
      });
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
