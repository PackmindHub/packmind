import { PackmindCliHexa } from './PackmindCliHexa';
import * as consoleLogger from './infra/utils/consoleLogger';
import { Space } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test';

jest.mock('./PackmindCliHexaFactory', () => ({
  PackmindCliHexaFactory: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./infra/utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
}));

jest.mock('./infra/utils/credentials', () => ({
  loadCredentials: jest.fn(),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('PackmindCliHexa', () => {
  let hexa: PackmindCliHexa;

  beforeEach(() => {
    jest.clearAllMocks();
    hexa = new PackmindCliHexa();
  });

  describe('normalizePackageSlugs', () => {
    describe('when all slugs are already prefixed', () => {
      describe('returns slugs as-is without calling getSpaces', () => {
        let result: string[];
        let getSpacesSpy: jest.SpyInstance;

        beforeEach(async () => {
          getSpacesSpy = jest.spyOn(hexa, 'getSpaces');
          result = await hexa.normalizePackageSlugs([
            '@my-space/pkg-a',
            '@my-space/pkg-b',
          ]);
        });

        it('returns slugs as-is', () => {
          expect(result).toEqual(['@my-space/pkg-a', '@my-space/pkg-b']);
        });

        it('does not call getSpaces', () => {
          expect(getSpacesSpy).not.toHaveBeenCalled();
        });
      });
    });

    describe('when the Packmind instance does not support spaces (getSpaces throws)', () => {
      beforeEach(() => {
        jest.spyOn(hexa, 'getSpaces').mockRejectedValue(new Error('Not Found'));
      });

      it('returns slugs without any space prefix', async () => {
        const result = await hexa.normalizePackageSlugs([
          'my-package',
          'another-package',
        ]);

        expect(result).toEqual(['my-package', 'another-package']);
      });

      it('outputs a warning about the outdated Packmind instance', async () => {
        await hexa.normalizePackageSlugs(['my-package']);

        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('outdated'),
        );
      });

      it('does not prefix already-prefixed slugs either', async () => {
        const result = await hexa.normalizePackageSlugs([
          '@space/prefixed',
          'unprefixed',
        ]);

        expect(result).toEqual(['@space/prefixed', 'unprefixed']);
      });
    });

    describe('when the Packmind instance supports spaces', () => {
      const myOrgSpace: Space = spaceFactory({
        slug: 'my-org',
        name: 'My Org',
        isDefaultSpace: true,
      });

      beforeEach(() => {
        jest.spyOn(hexa, 'getSpaces').mockResolvedValue([myOrgSpace]);
        jest.spyOn(hexa, 'getDefaultSpace').mockResolvedValue(myOrgSpace);
      });

      it('prefixes unprefixed slugs with the default space slug', async () => {
        const result = await hexa.normalizePackageSlugs([
          'pkg-a',
          '@other/pkg-b',
        ]);

        expect(result).toEqual(['@my-org/pkg-a', '@other/pkg-b']);
      });

      it('returns an empty array unchanged', async () => {
        const result = await hexa.normalizePackageSlugs([]);

        expect(result).toEqual([]);
      });

      describe('when the organization has multiple spaces and any slug is unprefixed', () => {
        it('throws', async () => {
          jest.spyOn(hexa, 'getSpaces').mockResolvedValue([
            spaceFactory({
              slug: 'space-a',
              isDefaultSpace: true,
            }),
            spaceFactory({
              slug: 'space-b',
              isDefaultSpace: false,
            }),
          ]);

          await expect(
            hexa.normalizePackageSlugs(['unprefixed-pkg']),
          ).rejects.toThrow('@space-a/my-package');
        });
      });
    });
  });
});
