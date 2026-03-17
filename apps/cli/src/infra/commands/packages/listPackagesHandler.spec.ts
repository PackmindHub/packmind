import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  ListHandlerDependencies,
  listPackagesHandler,
} from './listPackagesHandler';
import * as consoleLogger from '../../utils/consoleLogger';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '@packmind/deployments/test';

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  formatSlug: jest.fn((slug: string) => slug),
  formatLabel: jest.fn((label: string) => label),
  formatCommand: jest.fn((cmd: string) => cmd),
}));

describe('listPackagesHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let deps: ListHandlerDependencies;

  const defaultSpace = spaceFactory({ name: 'Default', slug: 'default' });

  beforeEach(() => {
    mockPackmindCliHexa = {
      listPackages: jest.fn(),
      getSpaces: jest.fn().mockResolvedValue([defaultSpace]),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when packages are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({
          slug: 'zebra',
          name: 'Zebra Package',
          description: 'A zebra package',
        }),
        packageFactory({
          slug: 'alpha',
          name: 'Alpha Package',
          description: 'An alpha package',
        }),
      ]);

      await listPackagesHandler({}, deps);
    });

    it('logs fetching message', () => {
      expect(consoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Fetching available packages...',
      );
    });

    it('logs available packages header', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        '\nAvailable packages:\n',
      );
    });

    it('displays packages sorted alphabetically', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('alpha'),
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no packages are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockResolvedValue([]);
      await listPackagesHandler({}, deps);
    });

    it('displays no packages message', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        'No packages found.',
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when spaces are available', () => {
    const space = spaceFactory({ name: 'Global', slug: 'global' });

    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([space]);
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({ slug: 'backend', name: 'Backend', spaceId: space.id }),
        packageFactory({ slug: 'alpha', name: 'Alpha', spaceId: space.id }),
      ]);

      await listPackagesHandler({}, deps);
    });

    it('displays space header', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        'Space "Global":\n',
      );
    });

    it('displays packages with @space/slug format', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('@global/alpha'),
      );
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('@global/backend'),
      );
    });

    it('uses @space/slug format in install example', () => {
      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('packmind-cli install @global/alpha'),
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when filtering by space slug', () => {
    const spaceA = spaceFactory({ name: 'Backend', slug: 'backend' });
    const spaceB = spaceFactory({ name: 'Frontend', slug: 'frontend' });

    beforeEach(() => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({ slug: 'api', name: 'API', spaceId: spaceA.id }),
        packageFactory({ slug: 'ui', name: 'UI', spaceId: spaceB.id }),
      ]);
    });

    it('only shows packages from the requested space', async () => {
      await listPackagesHandler({ space: 'backend' }, deps);

      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('@backend/api'),
      );
      expect(consoleLogger.logConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('@frontend/ui'),
      );
    });

    it('supports @-prefixed space slug', async () => {
      await listPackagesHandler({ space: '@backend' }, deps);

      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('@backend/api'),
      );
      expect(consoleLogger.logConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('@frontend/ui'),
      );
    });

    it('exits with 1 when the space slug does not exist', async () => {
      await listPackagesHandler({ space: 'unknown' }, deps);

      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Space "unknown" not found.',
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('shows no-packages message when the space has no packages', async () => {
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({ slug: 'ui', name: 'UI', spaceId: spaceB.id }),
      ]);

      await listPackagesHandler({ space: 'backend' }, deps);

      expect(consoleLogger.logConsole).toHaveBeenCalledWith(
        'No packages found in space "backend".',
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when spaces cannot be fetched', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([]);
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({ slug: 'api', name: 'API' }),
      ]);
      await listPackagesHandler({}, deps);
    });

    it('displays unable to list spaces message', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Unable to list organization spaces.',
      );
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when listing fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockRejectedValue(
        new Error('Network error'),
      );
      await listPackagesHandler({}, deps);
    });

    it('displays failed to list packages message', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Failed to list packages:',
      );
    });

    it('displays error message', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Network error',
      );
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
