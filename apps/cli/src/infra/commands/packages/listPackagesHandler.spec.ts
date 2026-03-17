import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { InstallHandlerDependencies } from '../installPackagesHandler';
import { listPackagesHandler } from './listPackagesHandler';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '@packmind/deployments/test';

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../../utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
  formatSlug: jest.fn((slug: string) => slug),
  formatLabel: jest.fn((label: string) => label),
}));

describe('listPackagesHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: InstallHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listPackages: jest.fn(),
      getSpaces: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      getCwd: jest.fn().mockReturnValue('/project'),
      log: mockLog,
      error: mockError,
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
      expect(mockLog).toHaveBeenCalledWith('Fetching available packages...\n');
    });

    it('logs available packages header', () => {
      expect(mockLog).toHaveBeenCalledWith('Available packages:\n');
    });

    it('displays packages sorted alphabetically', () => {
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('alpha'));
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
      expect(mockLog).toHaveBeenCalledWith('No packages found.');
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
      expect(mockLog).toHaveBeenCalledWith('Space "Global":\n');
    });

    it('displays packages with @space/slug format', () => {
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('@global/alpha'),
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('@global/backend'),
      );
    });

    it('uses @space/slug format in install example', () => {
      expect(mockLog).toHaveBeenCalledWith(
        '  $ packmind-cli install @global/alpha',
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when listing fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockRejectedValue(
        new Error('Network error'),
      );
      await listPackagesHandler({}, deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list packages:');
    });

    it('displays error message', () => {
      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
