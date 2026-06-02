import {
  MarketplaceDescriptor,
  MarketplaceDescriptorPackmindLockEntry,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  applyPluginDescriptorMutation,
  buildPluginLockEntry,
} from './PluginDescriptorMutator';

describe('applyPluginDescriptorMutation', () => {
  const userId = createUserId(uuidv4());

  const baseDescriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'sample-marketplace',
    version: '1.0.0',
    plugins: [
      {
        slug: 'existing-unmanaged',
        name: 'Existing Unmanaged',
        version: '2.0.0',
      },
    ],
    raw: {
      name: 'sample-marketplace',
      version: '1.0.0',
      plugins: [
        {
          slug: 'existing-unmanaged',
          name: 'Existing Unmanaged',
          version: '2.0.0',
        },
      ],
    },
  };

  const lockEntry: MarketplaceDescriptorPackmindLockEntry = {
    version: '0.1.0',
    contentHash: 'hash-1',
    lastPublishedAt: '2026-06-01T10:00:00.000Z',
    lastPublishedBy: userId,
  };

  describe('first publish (lock absent)', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        lockEntry,
      });
    });

    it('appends a new plugin entry to descriptor.plugins[]', () => {
      expect(result.plugins).toHaveLength(2);
    });

    it('keeps the unmanaged plugin entry untouched', () => {
      expect(result.plugins[0]).toEqual(baseDescriptor.plugins[0]);
    });

    it('inserts the newly managed plugin in descriptor.plugins[]', () => {
      expect(result.plugins[1]).toEqual({
        slug: 'security',
        name: 'Security',
        version: '0.1.0',
      });
    });

    it('initializes the packmindLock with schemaVersion 1', () => {
      expect(result.packmindLock?.schemaVersion).toBe(1);
    });

    it('writes the lock entry under the plugin slug', () => {
      expect(result.packmindLock?.plugins['security']).toEqual(lockEntry);
    });
  });

  describe('republish (lock present)', () => {
    let result: MarketplaceDescriptor;
    const previousLockEntry: MarketplaceDescriptorPackmindLockEntry = {
      version: '0.1.0',
      contentHash: 'old-hash',
      lastPublishedAt: '2026-05-30T10:00:00.000Z',
      lastPublishedBy: userId,
    };

    beforeEach(() => {
      const descriptorWithLock: MarketplaceDescriptor = {
        ...baseDescriptor,
        plugins: [
          ...baseDescriptor.plugins,
          { slug: 'security', name: 'Security old', version: '0.1.0' },
        ],
        packmindLock: {
          schemaVersion: 1,
          plugins: { security: previousLockEntry },
        },
      };

      result = applyPluginDescriptorMutation(descriptorWithLock, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.2.0',
        lockEntry,
      });
    });

    it('preserves the total plugin count', () => {
      expect(result.plugins).toHaveLength(2);
    });

    it('updates the existing plugin entry in place', () => {
      const updated = result.plugins.find((p) => p.slug === 'security');
      expect(updated).toEqual({
        slug: 'security',
        name: 'Security',
        version: '0.2.0',
      });
    });

    it('overwrites the lock entry with the latest values', () => {
      expect(result.packmindLock?.plugins['security']).toEqual(lockEntry);
    });
  });

  describe('preserves unmanaged entries', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        lockEntry,
      });
    });

    it('keeps the unmanaged plugin entry in place', () => {
      const unmanaged = result.plugins.find(
        (p) => p.slug === 'existing-unmanaged',
      );
      expect(unmanaged).toEqual({
        slug: 'existing-unmanaged',
        name: 'Existing Unmanaged',
        version: '2.0.0',
      });
    });

    it('does not register the unmanaged plugin into packmindLock', () => {
      expect(
        result.packmindLock?.plugins['existing-unmanaged'],
      ).toBeUndefined();
    });
  });

  describe('idempotency', () => {
    describe('when called twice with the same input', () => {
      let first: MarketplaceDescriptor;
      let second: MarketplaceDescriptor;

      beforeEach(() => {
        first = applyPluginDescriptorMutation(baseDescriptor, {
          pluginSlug: 'security',
          pluginName: 'Security',
          pluginVersion: '0.1.0',
          lockEntry,
        });
        second = applyPluginDescriptorMutation(first, {
          pluginSlug: 'security',
          pluginName: 'Security',
          pluginVersion: '0.1.0',
          lockEntry,
        });
      });

      it('produces identical output', () => {
        expect(second).toEqual(first);
      });
    });
  });

  describe('does not mutate the input descriptor', () => {
    it('leaves the input plugins array unchanged', () => {
      const inputPluginsSnapshot = [...baseDescriptor.plugins];
      applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        lockEntry,
      });
      expect(baseDescriptor.plugins).toEqual(inputPluginsSnapshot);
    });

    it('leaves the input packmindLock unchanged', () => {
      const descriptorWithLock: MarketplaceDescriptor = {
        ...baseDescriptor,
        packmindLock: {
          schemaVersion: 1,
          plugins: { other: lockEntry },
        },
      };
      const before = JSON.stringify(descriptorWithLock.packmindLock);
      applyPluginDescriptorMutation(descriptorWithLock, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        lockEntry,
      });
      expect(JSON.stringify(descriptorWithLock.packmindLock)).toBe(before);
    });
  });
});

describe('buildPluginLockEntry', () => {
  const userId = createUserId(uuidv4());
  const publishedAt = new Date('2026-06-02T12:00:00.000Z');
  let entry: MarketplaceDescriptorPackmindLockEntry;

  beforeEach(() => {
    entry = buildPluginLockEntry({
      pluginVersion: '0.1.0',
      contentHash: 'abc123',
      lastPublishedAt: publishedAt,
      lastPublishedBy: userId,
    });
  });

  it('serializes lastPublishedAt as an ISO 8601 string', () => {
    expect(entry.lastPublishedAt).toBe('2026-06-02T12:00:00.000Z');
  });

  it('captures the plugin version', () => {
    expect(entry.version).toBe('0.1.0');
  });

  it('captures the content hash', () => {
    expect(entry.contentHash).toBe('abc123');
  });

  it('captures the publishing user id', () => {
    expect(entry.lastPublishedBy).toBe(userId);
  });
});
