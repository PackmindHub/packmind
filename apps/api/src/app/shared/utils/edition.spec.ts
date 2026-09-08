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
  describe.each(['proprietary', 'cloud'])(
    'when PACKMIND_EDITION is %s',
    (raw) => {
      it('resolves the enterprise edition', async () => {
        getConfig.mockResolvedValue(raw);

        await expect(resolvePackmindEdition()).resolves.toBe('enterprise');
      });
    },
  );

  // The published name is not an accepted input: webpack builds the stubs for
  // anything but `proprietary`, so answering `enterprise` here would announce
  // routes the binary does not have.
  describe('when PACKMIND_EDITION is the published name enterprise', () => {
    it('resolves the community edition, matching what was built', async () => {
      getConfig.mockResolvedValue('enterprise');

      await expect(resolvePackmindEdition()).resolves.toBe('community');
    });
  });

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
