import { PluginRef } from './PluginRef';
import { deriveUnmanagedPlugins } from './UnmanagedPlugin';

function makePlugin(overrides: Partial<PluginRef> = {}): PluginRef {
  return {
    slug: 'third-party',
    name: 'Third Party',
    ...overrides,
  };
}

describe('deriveUnmanagedPlugins', () => {
  describe('when the descriptor has no plugins', () => {
    it('returns nothing', () => {
      expect(deriveUnmanagedPlugins([], ['mine'])).toEqual([]);
    });
  });

  describe('when the descriptor is missing entirely', () => {
    it('returns nothing', () => {
      expect(deriveUnmanagedPlugins(undefined, ['mine'])).toEqual([]);
    });
  });

  describe('when every descriptor entry is managed', () => {
    it('returns nothing', () => {
      const plugins = [makePlugin({ slug: 'a' }), makePlugin({ slug: 'b' })];

      expect(deriveUnmanagedPlugins(plugins, ['a', 'b'])).toEqual([]);
    });
  });

  describe('when Packmind manages none of the descriptor entries', () => {
    it('returns every entry', () => {
      const plugins = [makePlugin({ slug: 'a' }), makePlugin({ slug: 'b' })];

      expect(deriveUnmanagedPlugins(plugins, []).map((p) => p.slug)).toEqual([
        'a',
        'b',
      ]);
    });
  });

  describe('when the descriptor mixes managed and unmanaged entries', () => {
    const plugins = [
      makePlugin({ slug: 'theirs-1' }),
      makePlugin({ slug: 'ours' }),
      makePlugin({ slug: 'theirs-2' }),
    ];

    it('keeps only the unmanaged ones, in descriptor order', () => {
      expect(
        deriveUnmanagedPlugins(plugins, ['ours']).map((p) => p.slug),
      ).toEqual(['theirs-1', 'theirs-2']);
    });
  });

  describe('when Packmind tracks a slug the descriptor does not list', () => {
    it('reports the descriptor entries unaffected', () => {
      const plugins = [makePlugin({ slug: 'theirs' })];

      expect(
        deriveUnmanagedPlugins(plugins, ['published-not-merged-yet']).map(
          (p) => p.slug,
        ),
      ).toEqual(['theirs']);
    });
  });

  describe('when a slug appears twice in the descriptor', () => {
    it('keeps the first occurrence only', () => {
      const plugins = [
        makePlugin({ slug: 'dup', name: 'First' }),
        makePlugin({ slug: 'dup', name: 'Second' }),
      ];

      expect(deriveUnmanagedPlugins(plugins, []).map((p) => p.name)).toEqual([
        'First',
      ]);
    });
  });

  describe('when an entry carries no usable slug', () => {
    it('drops it', () => {
      const plugins = [
        makePlugin({ slug: '  ' }),
        makePlugin({ slug: undefined as unknown as string }),
        makePlugin({ slug: 'kept' }),
      ];

      expect(deriveUnmanagedPlugins(plugins, []).map((p) => p.slug)).toEqual([
        'kept',
      ]);
    });
  });

  describe('when a descriptor slug is padded with whitespace', () => {
    it('matches it against the managed slugs trimmed', () => {
      const plugins = [makePlugin({ slug: '  ours  ' })];

      expect(deriveUnmanagedPlugins(plugins, ['ours'])).toEqual([]);
    });
  });

  describe('when a managed slug is padded with whitespace', () => {
    it('matches it against the descriptor trimmed', () => {
      const plugins = [makePlugin({ slug: 'ours' })];

      expect(deriveUnmanagedPlugins(plugins, ['  ours  '])).toEqual([]);
    });
  });

  describe('when the managed slugs hold a blank entry', () => {
    it('does not let it match a slugless descriptor entry', () => {
      const plugins = [makePlugin({ slug: 'kept' }), makePlugin({ slug: '' })];

      expect(
        deriveUnmanagedPlugins(plugins, ['  ']).map((p) => p.slug),
      ).toEqual(['kept']);
    });
  });

  describe('when an entry has no name', () => {
    it('falls back to the slug', () => {
      const plugins = [makePlugin({ slug: 'no-name', name: '   ' })];

      expect(deriveUnmanagedPlugins(plugins, [])[0].name).toBe('no-name');
    });
  });

  describe('when an entry omits its optional fields', () => {
    const plugins = [
      makePlugin({ slug: 'bare', version: undefined, description: undefined }),
    ];

    it('reports no version', () => {
      expect(deriveUnmanagedPlugins(plugins, [])[0].version).toBeNull();
    });

    it('reports no description', () => {
      expect(deriveUnmanagedPlugins(plugins, [])[0].description).toBeNull();
    });
  });

  describe('when an entry carries blank optional fields', () => {
    const plugins = [
      makePlugin({ slug: 'blank', version: '  ', description: '' }),
    ];

    it('collapses the version to null', () => {
      expect(deriveUnmanagedPlugins(plugins, [])[0].version).toBeNull();
    });

    it('collapses the description to null', () => {
      expect(deriveUnmanagedPlugins(plugins, [])[0].description).toBeNull();
    });
  });

  describe('when an entry declares a source', () => {
    it('carries it through untouched', () => {
      const source = { source: 'npm', package: 'some-plugin' };
      const plugins = [makePlugin({ slug: 'with-source', source })];

      expect(deriveUnmanagedPlugins(plugins, [])[0].source).toBe(source);
    });
  });

  describe('when the managed slugs come from a Set', () => {
    it('accepts any iterable', () => {
      const plugins = [makePlugin({ slug: 'ours' })];

      expect(deriveUnmanagedPlugins(plugins, new Set(['ours']))).toEqual([]);
    });
  });
});
