import {
  detectPluginMode,
  readMarketplace,
  writeMarketplace,
  classifySource,
  findPluginEntry,
  upsertPluginEntry,
  removePluginEntry,
  Marketplace,
} from './pluginsContext';
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('detectPluginMode', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'pm-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('when only marketplace.json exists', () => {
    it('returns marketplace mode with the manifest path', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        '{"plugins":[]}',
      );

      expect(detectPluginMode(tmp)).toEqual({
        mode: 'marketplace',
        manifestPath: join(tmp, '.claude-plugin/marketplace.json'),
      });
    });
  });

  describe('when only plugin.json exists', () => {
    it('returns standalone mode', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/plugin.json'),
        '{"name":"security"}',
      );

      expect(detectPluginMode(tmp).mode).toBe('standalone');
    });
  });

  describe('when both manifests exist', () => {
    it('returns marketplace mode', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        '{"plugins":[]}',
      );
      writeFileSync(
        join(tmp, '.claude-plugin/plugin.json'),
        '{"name":"security"}',
      );

      expect(detectPluginMode(tmp).mode).toBe('marketplace');
    });
  });

  describe('when neither manifest exists', () => {
    it('returns none mode', () => {
      expect(detectPluginMode(tmp).mode).toBe('none');
    });
  });
});

describe('marketplace.json helpers', () => {
  let tmp: string;
  let manifestPath: string;

  const fixture: Marketplace = {
    name: 'my-marketplace',
    plugins: [
      { name: 'backend', source: './plugins/backend', description: 'Backend' },
      {
        name: 'frontend',
        source: './plugins/frontend',
        description: 'Frontend',
      },
    ],
  };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'pm-'));
    manifestPath = join(tmp, 'marketplace.json');
    writeFileSync(manifestPath, JSON.stringify(fixture, null, 2));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('readMarketplace', () => {
    it('parses the plugins array with the correct length', () => {
      const mp = readMarketplace(manifestPath);

      expect(mp.plugins).toHaveLength(2);
    });

    it('parses the plugins array with the correct names', () => {
      const mp = readMarketplace(manifestPath);

      expect(mp.plugins.map((p) => p.name)).toEqual(['backend', 'frontend']);
    });
  });

  describe('classifySource', () => {
    it('returns local for ./-prefixed relative paths', () => {
      expect(classifySource('./plugins/security')).toBe('local');
    });

    it('returns local for nested ./-prefixed relative paths', () => {
      expect(classifySource('./backend/plugins/security')).toBe('local');
    });

    it('returns remote for github object sources', () => {
      expect(classifySource({ source: 'github', repo: 'org/repo' })).toBe(
        'remote',
      );
    });

    it('returns remote for url object sources', () => {
      expect(
        classifySource({ source: 'url', url: 'https://example.com/x.git' }),
      ).toBe('remote');
    });

    it('returns remote for git-subdir object sources', () => {
      expect(
        classifySource({
          source: 'git-subdir',
          url: 'https://example.com/x.git',
          path: 'plugins/a',
        }),
      ).toBe('remote');
    });

    it('returns remote for npm object sources', () => {
      expect(classifySource({ source: 'npm', package: '@scope/pkg' })).toBe(
        'remote',
      );
    });

    it('returns local for absolute paths', () => {
      expect(classifySource('/plugins/security')).toBe('local');
    });

    it('returns remote for github: string shortcut format', () => {
      expect(classifySource('github:owner/repo')).toBe('remote');
    });

    it('returns remote for https raw URLs', () => {
      expect(classifySource('https://github.com/org/repo.git')).toBe('remote');
    });

    it('returns remote for git@ raw URLs', () => {
      expect(classifySource('git@my-provider.com/security-repo.git')).toBe(
        'remote',
      );
    });

    it('returns remote for bare relative paths', () => {
      expect(classifySource('plugins/security')).toBe('remote');
    });
  });

  describe('findPluginEntry', () => {
    it('returns the matching entry by name', () => {
      const mp = readMarketplace(manifestPath);

      expect(findPluginEntry(mp, 'frontend')).toEqual({
        name: 'frontend',
        source: './plugins/frontend',
        description: 'Frontend',
      });
    });

    describe('when no entry matches', () => {
      it('returns undefined', () => {
        const mp = readMarketplace(manifestPath);

        expect(findPluginEntry(mp, 'security')).toBeUndefined();
      });
    });
  });

  describe('upsertPluginEntry', () => {
    it('adds a new entry preserving siblings length', () => {
      const mp = readMarketplace(manifestPath);

      const updated = upsertPluginEntry(mp, {
        name: 'security',
        source: './plugins/security',
        description: 'Security',
      });

      expect(updated.plugins).toHaveLength(3);
    });

    it('adds a new entry preserving siblings names', () => {
      const mp = readMarketplace(manifestPath);

      const updated = upsertPluginEntry(mp, {
        name: 'security',
        source: './plugins/security',
        description: 'Security',
      });

      expect(updated.plugins.map((p) => p.name)).toEqual([
        'backend',
        'frontend',
        'security',
      ]);
    });

    it('overwrites an existing entry by name preserving length', () => {
      const mp = readMarketplace(manifestPath);

      const updated = upsertPluginEntry(mp, {
        name: 'frontend',
        source: './plugins/frontend',
        description: 'Updated frontend',
      });

      expect(updated.plugins).toHaveLength(2);
    });

    it('overwrites an existing entry by name updating description', () => {
      const mp = readMarketplace(manifestPath);

      const updated = upsertPluginEntry(mp, {
        name: 'frontend',
        source: './plugins/frontend',
        description: 'Updated frontend',
      });

      expect(findPluginEntry(updated, 'frontend')?.description).toBe(
        'Updated frontend',
      );
    });

    it('overwrites an existing entry by name preserving siblings', () => {
      const mp = readMarketplace(manifestPath);

      const updated = upsertPluginEntry(mp, {
        name: 'frontend',
        source: './plugins/frontend',
        description: 'Updated frontend',
      });

      expect(findPluginEntry(updated, 'backend')?.description).toBe('Backend');
    });

    it('does not mutate the original marketplace', () => {
      const mp = readMarketplace(manifestPath);

      upsertPluginEntry(mp, {
        name: 'security',
        source: './plugins/security',
      });

      expect(mp.plugins).toHaveLength(2);
    });
  });

  describe('removePluginEntry', () => {
    it('removes by name and preserves siblings', () => {
      const mp = readMarketplace(manifestPath);

      const updated = removePluginEntry(mp, 'backend');

      expect(updated.plugins.map((p) => p.name)).toEqual(['frontend']);
    });

    it('does not mutate the original marketplace', () => {
      const mp = readMarketplace(manifestPath);

      removePluginEntry(mp, 'backend');

      expect(mp.plugins).toHaveLength(2);
    });
  });

  describe('writeMarketplace', () => {
    it('serializes JSON with a trailing newline', () => {
      const mp = readMarketplace(manifestPath);
      const outPath = join(tmp, 'out.json');

      writeMarketplace(outPath, mp);

      const raw = readFileSync(outPath, 'utf8');
      expect(raw.endsWith('\n')).toBe(true);
    });

    it('serializes JSON with 2-space indent', () => {
      const mp = readMarketplace(manifestPath);
      const outPath = join(tmp, 'out.json');

      writeMarketplace(outPath, mp);

      const raw = readFileSync(outPath, 'utf8');
      expect(raw).toBe(`${JSON.stringify(mp, null, 2)}\n`);
    });
  });
});
