import {
  removeFromPackageHandler,
  RemoveFromPackageHandlerArgs,
  RemoveFromPackageHandlerDeps,
} from './removeFromPackageHandler';
import { RemoveFromPackageUseCase } from '../../../application/useCases/RemoveFromPackageUseCase';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { IRemoveFromPackageResult } from '../../../domain/useCases/IRemoveFromPackageUseCase';
import {
  logConsole,
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import { parsePackageSlug } from '../../../domain/entities/PackageSlug';
import { EXEC_NAME } from '../../utils/execName';

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  formatCommand: (text: string) => text,
}));

jest.mock('../../../application/useCases/RemoveFromPackageUseCase', () => ({
  RemoveFromPackageUseCase: jest.fn(),
}));

const mockLogConsole = logConsole as jest.Mock;
const mockLogErrorConsole = logErrorConsole as jest.Mock;
const mockLogInfoConsole = logInfoConsole as jest.Mock;
const mockLogSuccessConsole = logSuccessConsole as jest.Mock;
const MockUseCase = RemoveFromPackageUseCase as unknown as jest.Mock;

const SPACE_GLOBAL = {
  id: 'space-1',
  slug: 'global',
  name: 'Global',
  isDefaultSpace: true,
};
const SPACE_TEAM = {
  id: 'space-2',
  slug: 'team',
  name: 'Team',
  isDefaultSpace: false,
};

function givenResult(result: IRemoveFromPackageResult) {
  MockUseCase.mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(result),
  }));
}

function makeArgs(
  overrides: Partial<RemoveFromPackageHandlerArgs> = {},
): RemoveFromPackageHandlerArgs {
  return {
    from: parsePackageSlug('my-pkg'),
    itemType: 'command',
    itemSlugs: ['my-command'],
    ...overrides,
  };
}

function makeDeps(): RemoveFromPackageHandlerDeps & { mockExit: jest.Mock } {
  const mockExit = jest.fn();
  return {
    hexa: {
      getSpaces: jest.fn().mockResolvedValue([SPACE_GLOBAL]),
      getPackmindGateway: jest.fn().mockReturnValue({}),
      getSpaceService: jest.fn().mockReturnValue({}),
    },
    exit: mockExit,
    mockExit,
  };
}

describe('removeFromPackageHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the command was the package only', () => {
    beforeEach(async () => {
      givenResult({
        packageSlug: '@global/my-pkg',
        removed: [
          {
            slug: 'my-command',
            name: 'My command',
            removed: true,
            remainingPackageSlugs: [],
          },
        ],
      });
      await removeFromPackageHandler(makeArgs(), makeDeps());
    });

    it('reports the removal', () => {
      expect(mockLogSuccessConsole).toHaveBeenCalledWith(
        'Command "My command" has been removed from package "@global/my-pkg"',
      );
    });

    it('says it now belongs to no package', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It does not belong to any package anymore',
      );
    });
  });

  describe('when the command was not in the package', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      givenResult({
        packageSlug: '@global/my-pkg',
        removed: [
          {
            slug: 'my-command',
            name: 'My command',
            removed: false,
            remainingPackageSlugs: [],
          },
        ],
      });
      deps = makeDeps();
      await removeFromPackageHandler(makeArgs(), deps);
    });

    it('says nothing changed', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'Command "My command" is not in package "@global/my-pkg", nothing changed',
      );
    });

    it('succeeds', () => {
      expect(deps.mockExit).not.toHaveBeenCalled();
    });
  });

  describe('when the command still belongs to one other package', () => {
    beforeEach(async () => {
      givenResult({
        packageSlug: '@global/my-pkg',
        removed: [
          {
            slug: 'my-command',
            name: 'My command',
            removed: true,
            remainingPackageSlugs: ['@global/other'],
          },
        ],
      });
      await removeFromPackageHandler(makeArgs(), makeDeps());
    });

    it('names that package inline', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It still belongs to package "@global/other"',
      );
    });
  });

  describe('when the command still belongs to several packages', () => {
    beforeEach(async () => {
      givenResult({
        packageSlug: '@global/my-pkg',
        removed: [
          {
            slug: 'my-command',
            name: 'My command',
            removed: true,
            remainingPackageSlugs: ['@global/other', '@global/another'],
          },
        ],
      });
      await removeFromPackageHandler(makeArgs(), makeDeps());
    });

    it('introduces the list', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It still belongs to the following packages:',
      );
    });

    it('lists the first package', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(' - @global/other');
    });

    it('lists the second package', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(' - @global/another');
    });
  });

  describe('when no item slug is provided', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      deps = makeDeps();
      await removeFromPackageHandler(makeArgs({ itemSlugs: [] }), deps);
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });

    it('does not run the use case', () => {
      expect(MockUseCase).not.toHaveBeenCalled();
    });
  });

  describe('when the package is unknown', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      MockUseCase.mockImplementation(() => ({
        execute: jest
          .fn()
          .mockRejectedValue(new ItemNotFoundError('package', 'my-pkg')),
      }));
      deps = makeDeps();
      await removeFromPackageHandler(makeArgs(), deps);
    });

    it('logs the error', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        "package 'my-pkg' not found",
      );
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when --from is a plain slug and multiple spaces exist', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      deps = makeDeps();
      (deps.hexa.getSpaces as jest.Mock).mockResolvedValue([
        SPACE_GLOBAL,
        SPACE_TEAM,
      ]);
      await removeFromPackageHandler(makeArgs(), deps);
    });

    it('shows a --from example per space', () => {
      expect(mockLogInfoConsole).toHaveBeenCalledWith('  --from @team/my-pkg');
    });

    it('hints to run packages list', () => {
      expect(mockLogInfoConsole).toHaveBeenCalledWith(
        `Run \`${EXEC_NAME} packages list\` to see available packages per space.`,
      );
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });
});
