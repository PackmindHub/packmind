import { MarketplaceDescriptor } from '@packmind/types';
import {
  applyPluginDescriptorMutation,
  removePluginDescriptorEntry,
} from './PluginDescriptorMutator';

describe('applyPluginDescriptorMutation', () => {
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

  afterEach(() => jest.clearAllMocks());

  describe('when the plugin slug is new (first publish)', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
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
  });

  describe('when the plugin slug already exists (republish)', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      const descriptorWithEntry: MarketplaceDescriptor = {
        ...baseDescriptor,
        plugins: [
          ...baseDescriptor.plugins,
          { slug: 'security', name: 'Security old', version: '0.1.0' },
        ],
      };

      result = applyPluginDescriptorMutation(descriptorWithEntry, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.2.0',
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
  });

  describe('when an unmanaged plugin is already present under a different slug', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
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
        });
        second = applyPluginDescriptorMutation(first, {
          pluginSlug: 'security',
          pluginName: 'Security',
          pluginVersion: '0.1.0',
        });
      });

      it('produces identical output', () => {
        expect(second).toEqual(first);
      });
    });
  });

  describe('immutability', () => {
    it('does not mutate the input plugins array', () => {
      const snapshot = [...baseDescriptor.plugins];
      applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
      });
      expect(baseDescriptor.plugins).toEqual(snapshot);
    });
  });
});

describe('removePluginDescriptorEntry', () => {
  const descriptorWithSecurity: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'sample-marketplace',
    version: '1.0.0',
    plugins: [
      {
        slug: 'existing-unmanaged',
        name: 'Existing Unmanaged',
        version: '2.0.0',
      },
      { slug: 'security', name: 'Security', version: '0.1.0' },
    ],
    raw: { name: 'sample-marketplace' },
  };

  afterEach(() => jest.clearAllMocks());

  describe('when the slug is present', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = removePluginDescriptorEntry(descriptorWithSecurity, 'security');
    });

    it('drops the matching entry from descriptor.plugins[]', () => {
      expect(result.plugins.some((p) => p.slug === 'security')).toBe(false);
    });

    it('keeps unmanaged plugin entries', () => {
      expect(result.plugins.some((p) => p.slug === 'existing-unmanaged')).toBe(
        true,
      );
    });
  });

  describe('when the slug is already absent', () => {
    it('returns the same set of plugins (idempotent)', () => {
      const result = removePluginDescriptorEntry(
        descriptorWithSecurity,
        'never-published',
      );
      expect(result.plugins).toHaveLength(2);
    });
  });

  describe('immutability', () => {
    it('does not mutate the input descriptor plugins', () => {
      const snapshot = [...descriptorWithSecurity.plugins];
      removePluginDescriptorEntry(descriptorWithSecurity, 'security');
      expect(descriptorWithSecurity.plugins).toEqual(snapshot);
    });
  });
});
