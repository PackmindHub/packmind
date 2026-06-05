import {
  PackmindMarketplaceLock,
  PackmindMarketplaceLockPluginEntry,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  applyPackmindMarketplaceLockMutation,
  removePackmindMarketplaceLockEntry,
} from './applyPackmindMarketplaceLockMutation';

describe('applyPackmindMarketplaceLockMutation', () => {
  const userId = createUserId(uuidv4());
  const publishedAt = new Date('2026-06-02T12:00:00.000Z');

  afterEach(() => jest.clearAllMocks());

  describe('when the lock is previously empty (first publish)', () => {
    let result: PackmindMarketplaceLock;

    beforeEach(() => {
      result = applyPackmindMarketplaceLockMutation(
        { schemaVersion: 1, plugins: {} },
        {
          pluginSlug: 'security',
          pluginVersion: '0.1.0',
          contentHash: 'hash-1',
          lastPublishedAt: publishedAt,
          lastPublishedBy: userId,
        },
      );
    });

    it('keeps schemaVersion at 1', () => {
      expect(result.schemaVersion).toBe(1);
    });

    it('writes a single entry under the published slug', () => {
      expect(result.plugins).toEqual({
        security: {
          version: '0.1.0',
          contentHash: 'hash-1',
          lastPublishedAt: '2026-06-02T12:00:00.000Z',
          lastPublishedBy: userId,
        },
      });
    });
  });

  describe('when the lock already contains the same slug (republish)', () => {
    let result: PackmindMarketplaceLock;
    const previousEntry: PackmindMarketplaceLockPluginEntry = {
      version: '0.1.0',
      contentHash: 'old-hash',
      lastPublishedAt: '2026-05-30T10:00:00.000Z',
      lastPublishedBy: userId,
    };

    beforeEach(() => {
      result = applyPackmindMarketplaceLockMutation(
        {
          schemaVersion: 1,
          plugins: { security: previousEntry },
        },
        {
          pluginSlug: 'security',
          pluginVersion: '0.2.0',
          contentHash: 'new-hash',
          lastPublishedAt: publishedAt,
          lastPublishedBy: userId,
        },
      );
    });

    it('overwrites the entry with the latest values', () => {
      expect(result.plugins['security']).toEqual({
        version: '0.2.0',
        contentHash: 'new-hash',
        lastPublishedAt: '2026-06-02T12:00:00.000Z',
        lastPublishedBy: userId,
      });
    });
  });

  describe('when the lock contains other unrelated entries', () => {
    let result: PackmindMarketplaceLock;
    const otherEntry: PackmindMarketplaceLockPluginEntry = {
      version: '1.0.0',
      contentHash: 'other-hash',
      lastPublishedAt: '2026-05-20T00:00:00.000Z',
      lastPublishedBy: userId,
    };

    beforeEach(() => {
      result = applyPackmindMarketplaceLockMutation(
        {
          schemaVersion: 1,
          plugins: { observability: otherEntry },
        },
        {
          pluginSlug: 'security',
          pluginVersion: '0.1.0',
          contentHash: 'hash-1',
          lastPublishedAt: publishedAt,
          lastPublishedBy: userId,
        },
      );
    });

    it('preserves the unrelated entry verbatim', () => {
      expect(result.plugins['observability']).toEqual(otherEntry);
    });
  });

  describe('idempotency', () => {
    describe('when called twice with the same input', () => {
      let first: PackmindMarketplaceLock;
      let second: PackmindMarketplaceLock;

      beforeEach(() => {
        const lock: PackmindMarketplaceLock = {
          schemaVersion: 1,
          plugins: {},
        };
        first = applyPackmindMarketplaceLockMutation(lock, {
          pluginSlug: 'security',
          pluginVersion: '0.1.0',
          contentHash: 'hash-1',
          lastPublishedAt: publishedAt,
          lastPublishedBy: userId,
        });
        second = applyPackmindMarketplaceLockMutation(first, {
          pluginSlug: 'security',
          pluginVersion: '0.1.0',
          contentHash: 'hash-1',
          lastPublishedAt: publishedAt,
          lastPublishedBy: userId,
        });
      });

      it('produces the same lock', () => {
        expect(second).toEqual(first);
      });
    });
  });

  describe('immutability', () => {
    it('does not mutate the input lock', () => {
      const lock: PackmindMarketplaceLock = {
        schemaVersion: 1,
        plugins: {},
      };
      const snapshot = JSON.stringify(lock);
      applyPackmindMarketplaceLockMutation(lock, {
        pluginSlug: 'security',
        pluginVersion: '0.1.0',
        contentHash: 'hash-1',
        lastPublishedAt: publishedAt,
        lastPublishedBy: userId,
      });
      expect(JSON.stringify(lock)).toBe(snapshot);
    });
  });
});

describe('removePackmindMarketplaceLockEntry', () => {
  const userId = createUserId(uuidv4());
  const entry: PackmindMarketplaceLockPluginEntry = {
    version: '0.1.0',
    contentHash: 'hash-1',
    lastPublishedAt: '2026-06-01T10:00:00.000Z',
    lastPublishedBy: userId,
  };

  afterEach(() => jest.clearAllMocks());

  describe('when the slug is present', () => {
    it('removes the matching entry', () => {
      const result = removePackmindMarketplaceLockEntry(
        {
          schemaVersion: 1,
          plugins: { security: entry, observability: entry },
        },
        'security',
      );
      expect(result.plugins['security']).toBeUndefined();
    });
  });

  describe('when other entries remain', () => {
    it('preserves them', () => {
      const result = removePackmindMarketplaceLockEntry(
        {
          schemaVersion: 1,
          plugins: { security: entry, observability: entry },
        },
        'security',
      );
      expect(result.plugins['observability']).toEqual(entry);
    });
  });

  describe('when the slug is already absent', () => {
    it('returns a structurally equivalent lock', () => {
      const before: PackmindMarketplaceLock = {
        schemaVersion: 1,
        plugins: { observability: entry },
      };
      const after = removePackmindMarketplaceLockEntry(before, 'security');
      expect(after).toEqual(before);
    });
  });
});
