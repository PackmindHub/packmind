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
  // The mapping itself is `editionFromDeploymentValue`, tested in
  // @packmind/types. What is worth pinning here is that the edition comes from
  // the config layer — which reads Infisical as well as the environment — and
  // not from process.env directly.
  describe('when the config layer answers proprietary', () => {
    it('resolves the enterprise edition', async () => {
      getConfig.mockResolvedValue('proprietary');

      await expect(resolvePackmindEdition()).resolves.toBe('enterprise');
    });

    it('asks the config layer for PACKMIND_EDITION', async () => {
      getConfig.mockResolvedValue('proprietary');

      await resolvePackmindEdition();

      expect(getConfig).toHaveBeenCalledWith('PACKMIND_EDITION');
    });
  });

  describe('when the config layer has no value', () => {
    it('resolves the community edition', async () => {
      getConfig.mockResolvedValue(null);

      await expect(resolvePackmindEdition()).resolves.toBe('community');
    });
  });
});
