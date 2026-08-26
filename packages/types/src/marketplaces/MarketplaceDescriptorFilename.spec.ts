import {
  MARKETPLACE_DESCRIPTOR_CANDIDATES,
  MARKETPLACE_DESCRIPTOR_PATHS,
} from './MarketplaceDescriptorFilename';

describe('MARKETPLACE_DESCRIPTOR_PATHS', () => {
  it('keeps the same paths, in the same order, as MARKETPLACE_DESCRIPTOR_CANDIDATES', () => {
    expect(MARKETPLACE_DESCRIPTOR_PATHS).toEqual(
      MARKETPLACE_DESCRIPTOR_CANDIDATES.map((candidate) => candidate.path),
    );
  });
});
