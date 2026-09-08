import { Configuration } from '@packmind/node-utils';

import { resolvePackmindEdition } from './edition';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const getConfig = Configuration.getConfig as jest.Mock;

describe('resolvePackmindEdition', () => {
  // PACKMIND_EDITION keeps the vocabulary the deployment tooling writes, which
  // is not the one the API publishes. This mapping is the whole join between
  // them, and `proprietary` is the value every enterprise deployment sets.
  describe.each(['proprietary', 'cloud', 'enterprise'])(
    'when PACKMIND_EDITION is %s',
    (raw) => {
      it('resolves the enterprise edition', async () => {
        getConfig.mockResolvedValue(raw);

        await expect(resolvePackmindEdition()).resolves.toBe('enterprise');
      });
    },
  );

  describe.each([
    ['oss', 'oss'],
    ['unset', undefined],
    ['empty', ''],
    ['a name nobody ships', 'starship'],
  ])('when PACKMIND_EDITION is %s', (_label, raw) => {
    it('resolves the community edition', async () => {
      getConfig.mockResolvedValue(raw);

      await expect(resolvePackmindEdition()).resolves.toBe('community');
    });
  });
});
