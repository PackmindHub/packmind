import { MarketplaceDescriptor, PluginSource } from '@packmind/types';
import {
  applyPluginDescriptorMutation,
  removePluginDescriptorEntry,
} from './PluginDescriptorMutator';

const sampleSource: PluginSource = {
  source: 'git-subdir',
  url: 'https://github.com/test-org/test-marketplace.git',
  path: 'plugins/security',
};

const otherSource: PluginSource = {
  source: 'git-subdir',
  url: 'https://github.com/test-org/test-marketplace.git',
  path: 'plugins/existing-unmanaged',
};

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
        source: otherSource,
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
        pluginSource: sampleSource,
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
        source: sampleSource,
      });
    });

    it('attaches the supplied source block on the new entry', () => {
      expect(result.plugins[1].source).toEqual(sampleSource);
    });
  });

  describe('when the plugin slug already exists (republish)', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      const descriptorWithEntry: MarketplaceDescriptor = {
        ...baseDescriptor,
        plugins: [
          ...baseDescriptor.plugins,
          {
            slug: 'security',
            name: 'Security old',
            version: '0.1.0',
            source: sampleSource,
          },
        ],
      };

      result = applyPluginDescriptorMutation(descriptorWithEntry, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.2.0',
        pluginSource: sampleSource,
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
        source: sampleSource,
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
        pluginSource: sampleSource,
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
        source: otherSource,
      });
    });

    it('preserves the existing source block on the other entry', () => {
      const unmanaged = result.plugins.find(
        (p) => p.slug === 'existing-unmanaged',
      );
      expect(unmanaged?.source).toEqual(otherSource);
    });
  });

  describe('when a plugin description is supplied', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        pluginDescription: 'Packmind - space @engineering: Security pack',
        pluginSource: sampleSource,
      });
    });

    it('writes the description onto the new plugin entry', () => {
      const inserted = result.plugins.find((p) => p.slug === 'security');
      expect(inserted?.description).toBe(
        'Packmind - space @engineering: Security pack',
      );
    });
  });

  describe('when no plugin description is supplied', () => {
    let result: MarketplaceDescriptor;

    beforeEach(() => {
      result = applyPluginDescriptorMutation(baseDescriptor, {
        pluginSlug: 'security',
        pluginName: 'Security',
        pluginVersion: '0.1.0',
        pluginSource: sampleSource,
      });
    });

    it('leaves description undefined on the new plugin entry', () => {
      const inserted = result.plugins.find((p) => p.slug === 'security');
      expect(inserted?.description).toBeUndefined();
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
          pluginSource: sampleSource,
        });
        second = applyPluginDescriptorMutation(first, {
          pluginSlug: 'security',
          pluginName: 'Security',
          pluginVersion: '0.1.0',
          pluginSource: sampleSource,
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
        pluginSource: sampleSource,
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
