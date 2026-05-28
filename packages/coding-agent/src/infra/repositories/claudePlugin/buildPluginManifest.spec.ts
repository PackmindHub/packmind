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

  it('omits description when none provided', () => {
    const manifest = buildPluginManifest({
      name: 'security',
      version: '0.1.0',
    });
    const parsed = JSON.parse(manifest);
    expect(parsed).not.toHaveProperty('description');
  });

  it('formats JSON with 2-space indent and trailing newline', () => {
    const manifest = buildPluginManifest({
      name: 'security',
      version: '0.1.0',
    });
    expect(manifest.endsWith('\n')).toBe(true);
    expect(manifest).toContain('  "name"');
  });
});
