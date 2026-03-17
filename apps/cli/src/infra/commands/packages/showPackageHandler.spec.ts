import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  showPackageHandler,
  ShowPackageHandlerDependencies,
} from './showPackageHandler';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logErrorConsole: jest.fn(),
}));

const mockLogConsole = logConsole as jest.Mock;
const mockLogInfoConsole = logInfoConsole as jest.Mock;
const mockLogErrorConsole = logErrorConsole as jest.Mock;

const SPACE_GLOBAL = { id: 'space-1', slug: 'global', name: 'Global' };
const SPACE_FRONTEND = { id: 'space-2', slug: 'frontend', name: 'Frontend' };

const PACKAGE_IN_GLOBAL = {
  id: 'pkg-1',
  slug: 'backend',
  name: 'Backend',
  spaceId: 'space-1',
};

const PACKAGE_SUMMARY = {
  name: 'Backend',
  slug: 'backend',
  description: 'A backend package',
  standards: [{ name: 'Standard 1', summary: 'A standard' }],
  recipes: [{ name: 'Recipe 1', summary: 'A recipe' }],
};

describe('showPackageHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let deps: ShowPackageHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      getPackageBySlug: jest.fn(),
      getSpaces: jest.fn(),
      listPackages: jest.fn(),
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

  describe('when slug is fully qualified (@space/pkg)', () => {
    describe('and the package exists in the given space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);
        mockPackmindCliHexa.getPackageBySlug.mockResolvedValue(PACKAGE_SUMMARY);

        await showPackageHandler({ slug: '@global/backend' }, deps);
      });

      it('calls getPackageBySlug with the simple slug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).toHaveBeenCalledWith({
          slug: 'backend',
        });
      });

      it('displays name with full slug', () => {
        expect(mockLogConsole).toHaveBeenCalledWith(
          '\nBackend (@global/backend):\n',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('and the space does not exist', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);

        await showPackageHandler({ slug: '@unknown-space/backend' }, deps);
      });

      it('does not call getPackageBySlug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).not.toHaveBeenCalled();
      });

      it('displays a space-not-found error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining("Space 'unknown-space' not found"),
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('and the package does not exist in the given space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([
          SPACE_GLOBAL,
          SPACE_FRONTEND,
        ]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);

        await showPackageHandler({ slug: '@frontend/backend' }, deps);
      });

      it('does not call getPackageBySlug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).not.toHaveBeenCalled();
      });

      it('displays a package-not-in-space error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            "Package 'backend' not found in space 'frontend'",
          ),
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when slug is unprefixed', () => {
    describe('and a single space exists', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);
        mockPackmindCliHexa.getPackageBySlug.mockResolvedValue(PACKAGE_SUMMARY);

        await showPackageHandler({ slug: 'backend' }, deps);
      });

      it('calls getPackageBySlug with the simple slug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).toHaveBeenCalledWith({
          slug: 'backend',
        });
      });

      it('displays name with resolved full slug', () => {
        expect(mockLogConsole).toHaveBeenCalledWith(
          '\nBackend (@global/backend):\n',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('and multiple spaces exist', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([
          SPACE_GLOBAL,
          SPACE_FRONTEND,
        ]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);

        await showPackageHandler({ slug: 'backend' }, deps);
      });

      it('does not call getPackageBySlug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).not.toHaveBeenCalled();
      });

      it('displays a disambiguation error with an example', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('@global/backend'),
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('and the package does not exist in the single space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([]);

        await showPackageHandler({ slug: 'backend' }, deps);
      });

      it('displays a package-not-found error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            "Package 'backend' not found in space 'global'",
          ),
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('package details display', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
      mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);
      mockPackmindCliHexa.getPackageBySlug.mockResolvedValue(PACKAGE_SUMMARY);

      await showPackageHandler({ slug: '@global/backend' }, deps);
    });

    it('logs fetching message', () => {
      expect(mockLogInfoConsole).toHaveBeenCalledWith(
        "Fetching package details for '@global/backend'...",
      );
    });

    it('logs description', () => {
      expect(mockLogConsole).toHaveBeenCalledWith('A backend package\n');
    });

    it('logs standards section', () => {
      expect(mockLogConsole).toHaveBeenCalledWith('Standards:');
    });

    it('logs commands section', () => {
      expect(mockLogConsole).toHaveBeenCalledWith('Commands:');
    });
  });
});
