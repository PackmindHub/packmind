import {
  buildPluginContentHash,
  PluginContentEntry,
} from './buildPluginContentHash';

describe('buildPluginContentHash', () => {
  const entries: PluginContentEntry[] = [
    { path: 'plugin.json', content: '{"name":"sample"}' },
    { path: 'commands/foo.md', content: '# foo' },
    { path: 'skills/bar.md', content: '# bar' },
  ];

  describe('stability', () => {
    let firstHash: string;
    let secondHash: string;

    beforeEach(() => {
      firstHash = buildPluginContentHash(entries);
      secondHash = buildPluginContentHash([...entries]);
    });

    it('returns the same hash for the same input', () => {
      expect(firstHash).toBe(secondHash);
    });

    it('returns a 64-character hex sha256 digest', () => {
      expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('order-independence', () => {
    let hashA: string;
    let hashB: string;

    beforeEach(() => {
      hashA = buildPluginContentHash(entries);
      hashB = buildPluginContentHash([...entries].reverse());
    });

    it('produces the same hash regardless of input order', () => {
      expect(hashA).toBe(hashB);
    });
  });

  describe('tamper-evidence', () => {
    let baseline: string;

    beforeEach(() => {
      baseline = buildPluginContentHash(entries);
    });

    describe('when a content byte changes', () => {
      let tamperedHash: string;

      beforeEach(() => {
        const tampered: PluginContentEntry[] = entries.map((entry, idx) =>
          idx === 0 ? { ...entry, content: entry.content + 'X' } : entry,
        );
        tamperedHash = buildPluginContentHash(tampered);
      });

      it('changes the hash', () => {
        expect(tamperedHash).not.toBe(baseline);
      });
    });

    describe('when a path changes', () => {
      let tamperedHash: string;

      beforeEach(() => {
        const tampered: PluginContentEntry[] = entries.map((entry, idx) =>
          idx === 0 ? { ...entry, path: entry.path + '-renamed' } : entry,
        );
        tamperedHash = buildPluginContentHash(tampered);
      });

      it('changes the hash', () => {
        expect(tamperedHash).not.toBe(baseline);
      });
    });
  });

  describe('framing', () => {
    it('does not collide for inputs that share concatenated bytes', () => {
      const collisionAttemptA: PluginContentEntry[] = [
        { path: 'a', content: 'b' },
      ];
      const collisionAttemptB: PluginContentEntry[] = [
        { path: 'ab', content: '' },
      ];

      expect(buildPluginContentHash(collisionAttemptA)).not.toBe(
        buildPluginContentHash(collisionAttemptB),
      );
    });
  });

  describe('empty input', () => {
    it('returns a stable hash for an empty entry list', () => {
      const firstHash = buildPluginContentHash([]);
      const secondHash = buildPluginContentHash([]);
      expect(firstHash).toBe(secondHash);
    });
  });
});
