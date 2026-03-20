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

const PACKAGE_IN_FRONTEND = {
  id: 'pkg-2',
  slug: 'backend',
  name: 'Backend Frontend',
  spaceId: 'space-2',
};

const PACKAGE_SUMMARY_GLOBAL = {
  name: 'Backend',
  slug: 'backend',
  description: 'A backend package',
  standards: [{ name: 'Standard 1', summary: 'A standard' }],
  recipes: [{ name: 'Recipe 1', summary: 'A recipe' }],
};

const PACKAGE_SUMMARY_FRONTEND = {
  name: 'Backend Frontend',
  slug: 'backend',
  description: 'A frontend backend package',
  standards: [{ name: 'Frontend Standard', summary: 'A frontend standard' }],
  recipes: [{ name: 'Frontend Recipe', summary: 'A frontend recipe' }],
};

describe('showPackageHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let deps: ShowPackageHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      getSpaces: jest.fn(),
      listPackages: jest.fn(),
      getPackageBySlug: jest.fn().mockResolvedValue(PACKAGE_SUMMARY_GLOBAL),
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

        await showPackageHandler({ slug: '@global/backend' }, deps);
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

      it('displays a space-not-found error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining("Space '@unknown-space' not found"),
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

      it('displays a package-not-in-space error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            "Package 'backend' not found in space '@frontend'",
          ),
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('and two spaces have a package with the same slug', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([
          SPACE_GLOBAL,
          SPACE_FRONTEND,
        ]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          PACKAGE_IN_GLOBAL,
          PACKAGE_IN_FRONTEND,
        ]);
        mockPackmindCliHexa.getPackageBySlug.mockResolvedValue(
          PACKAGE_SUMMARY_FRONTEND,
        );

        await showPackageHandler({ slug: '@frontend/backend' }, deps);
      });

      it('calls getPackageBySlug with the full space-qualified slug', () => {
        expect(mockPackmindCliHexa.getPackageBySlug).toHaveBeenCalledWith({
          slug: '@frontend/backend',
        });
      });

      it('displays the package from the requested space', () => {
        expect(mockLogConsole).toHaveBeenCalledWith(
          '\nBackend Frontend (@frontend/backend):\n',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when slug is unprefixed', () => {
    describe('and a single space exists', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getSpaces.mockResolvedValue([SPACE_GLOBAL]);
        mockPackmindCliHexa.listPackages.mockResolvedValue([PACKAGE_IN_GLOBAL]);

        await showPackageHandler({ slug: 'backend' }, deps);
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
            "Package 'backend' not found in space '@global'",
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
