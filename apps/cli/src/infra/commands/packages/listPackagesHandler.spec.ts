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
          spaceId: defaultSpace.id,
        }),
        packageFactory({
          slug: 'alpha',
          name: 'Alpha Package',
          description: 'An alpha package',
          spaceId: defaultSpace.id,
        }),
      ]);

      await listPackagesHandler({}, deps);
    });

    it('calls listPackages without space filter', () => {
      expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({});
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

    describe('displays packages with @space/slug format', () => {
      it('displays @global/alpha', () => {
        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('@global/alpha'),
        );
      });

      it('displays @global/backend', () => {
        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('@global/backend'),
        );
      });
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
    });

    describe('only shows packages from the requested space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          packageFactory({ slug: 'api', name: 'API', spaceId: spaceA.id }),
        ]);

        await listPackagesHandler({ space: 'backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('displays the matching package', () => {
        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('@backend/api'),
        );
      });

      it('does not display packages from other spaces', () => {
        expect(consoleLogger.logConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('@frontend/ui'),
        );
      });
    });

    describe('supports @-prefixed space slug', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          packageFactory({ slug: 'api', name: 'API', spaceId: spaceA.id }),
        ]);

        await listPackagesHandler({ space: '@backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('displays the matching package', () => {
        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('@backend/api'),
        );
      });

      it('does not display packages from other spaces', () => {
        expect(consoleLogger.logConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('@frontend/ui'),
        );
      });
    });

    describe('when the space slug does not exist', () => {
      beforeEach(async () => {
        await listPackagesHandler({ space: 'unknown' }, deps);
      });

      it('logs an error', () => {
        expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
          "Space '@unknown' not found.",
        );
      });

      it('does not call listPackages', () => {
        expect(mockPackmindCliHexa.listPackages).not.toHaveBeenCalled();
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when the space has no packages', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([]);

        await listPackagesHandler({ space: 'backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('shows no-packages message', () => {
        expect(consoleLogger.logConsole).toHaveBeenCalledWith(
          "No packages found in space '@backend'.",
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when filtering by an unknown space', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([
        spaceFactory({ slug: 'global', name: 'Global' }),
        spaceFactory({ slug: 'backend', name: 'Backend' }),
      ]);

      await listPackagesHandler({ space: 'unknown' }, deps);
    });

    it('logs space not found with @ prefix', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        "Space '@unknown' not found.",
      );
    });

    it('lists available spaces with @ prefix', () => {
      expect(consoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Available spaces: @global, @backend',
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when spaces cannot be fetched', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([]);
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
