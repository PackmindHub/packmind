import { MARKETPLACE_DESCRIPTOR_PATHS } from '../MarketplaceDescriptorFilename';
import { MarketplaceDescriptorNotFoundError } from './MarketplaceDescriptorNotFoundError';

describe('MarketplaceDescriptorNotFoundError', () => {
  const error = new MarketplaceDescriptorNotFoundError('acme', 'plugins');

  it('names the repository', () => {
    expect(error.message).toContain('acme/plugins');
  });

  it.each(MARKETPLACE_DESCRIPTOR_PATHS)(
    'names every probed path, including %s',
    (path) => {
      expect(error.message).toContain(path);
    },
  );
});
