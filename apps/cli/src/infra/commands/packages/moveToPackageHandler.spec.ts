import {
  moveToPackageHandler,
  MoveToPackageHandlerArgs,
  MoveToPackageHandlerDeps,
} from './moveToPackageHandler';
import { MoveToPackageUseCase } from '../../../application/useCases/MoveToPackageUseCase';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { IMoveToPackageResult } from '../../../domain/useCases/IMoveToPackageUseCase';
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

jest.mock('../../../application/useCases/MoveToPackageUseCase', () => ({
  MoveToPackageUseCase: jest.fn(),
}));

const mockLogConsole = logConsole as jest.Mock;
const mockLogErrorConsole = logErrorConsole as jest.Mock;
const mockLogInfoConsole = logInfoConsole as jest.Mock;
const mockLogSuccessConsole = logSuccessConsole as jest.Mock;
const MockUseCase = MoveToPackageUseCase as unknown as jest.Mock;

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

function givenResult(result: IMoveToPackageResult) {
  MockUseCase.mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(result),
  }));
}

function givenFailure(error: Error) {
  MockUseCase.mockImplementation(() => ({
    execute: jest.fn().mockRejectedValue(error),
  }));
}

function makeArgs(
  overrides: Partial<MoveToPackageHandlerArgs> = {},
): MoveToPackageHandlerArgs {
  return {
    to: parsePackageSlug('my-pkg'),
    itemType: 'command',
    itemSlugs: ['my-command'],
    ...overrides,
  };
}

function makeDeps(): MoveToPackageHandlerDeps & { mockExit: jest.Mock } {
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

describe('moveToPackageHandler', () => {
  beforeEach(() => {
    givenResult({
      targetPackageSlug: '@global/my-pkg',
      moved: [
        {
          slug: 'my-command',
          name: 'My command',
          addedToTarget: true,
          removedFrom: [],
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the command belonged to no package', () => {
    beforeEach(async () => {
      await moveToPackageHandler(makeArgs(), makeDeps());
    });

    it('reports the addition', () => {
      expect(mockLogSuccessConsole).toHaveBeenCalledWith(
        'Command "My command" has been added to package "@global/my-pkg"',
      );
    });

    it('does not mention any removal', () => {
      expect(mockLogConsole).not.toHaveBeenCalled();
    });

    it('hints at installing the target package', () => {
      expect(mockLogSuccessConsole).toHaveBeenCalledWith(
        `Run ${EXEC_NAME} install @global/my-pkg to install the changes`,
      );
    });
  });

  describe('when the command belonged to one other package', () => {
    beforeEach(async () => {
      givenResult({
        targetPackageSlug: '@global/my-pkg',
        moved: [
          {
            slug: 'my-command',
            name: 'My command',
            addedToTarget: true,
            removedFrom: ['@global/my-source-package'],
          },
        ],
      });
      await moveToPackageHandler(makeArgs(), makeDeps());
    });

    it('names the package inline', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It has been removed from "@global/my-source-package"',
      );
    });
  });

  describe('when the command belonged to several other packages', () => {
    beforeEach(async () => {
      givenResult({
        targetPackageSlug: '@global/my-pkg',
        moved: [
          {
            slug: 'my-command',
            name: 'My command',
            addedToTarget: true,
            removedFrom: [
              '@global/my-source-package',
              '@global/another-source-package',
            ],
          },
        ],
      });
      await moveToPackageHandler(makeArgs(), makeDeps());
    });

    it('introduces the list', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It has been removed from the following packages:',
      );
    });

    it('lists the first package', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        ' - @global/my-source-package',
      );
    });

    it('lists the second package', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        ' - @global/another-source-package',
      );
    });
  });

  describe('when the command already belonged to the target only', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      givenResult({
        targetPackageSlug: '@global/my-pkg',
        moved: [
          {
            slug: 'my-command',
            name: 'My command',
            addedToTarget: false,
            removedFrom: [],
          },
        ],
      });
      deps = makeDeps();
      await moveToPackageHandler(makeArgs(), deps);
    });

    it('says nothing changed', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'Command "My command" is already in package "@global/my-pkg", nothing changed',
      );
    });

    it('does not hint at installing', () => {
      expect(mockLogSuccessConsole).not.toHaveBeenCalled();
    });

    it('succeeds', () => {
      expect(deps.mockExit).not.toHaveBeenCalled();
    });
  });

  describe('when the command already belonged to the target and another package', () => {
    beforeEach(async () => {
      givenResult({
        targetPackageSlug: '@global/my-pkg',
        moved: [
          {
            slug: 'my-command',
            name: 'My command',
            addedToTarget: false,
            removedFrom: ['@global/my-source-package'],
          },
        ],
      });
      await moveToPackageHandler(makeArgs(), makeDeps());
    });

    it('does not claim it was added', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'Command "My command" is already in package "@global/my-pkg"',
      );
    });

    it('reports the removal', () => {
      expect(mockLogConsole).toHaveBeenCalledWith(
        'It has been removed from "@global/my-source-package"',
      );
    });
  });

  describe('when no item slug is provided', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      deps = makeDeps();
      await moveToPackageHandler(makeArgs({ itemSlugs: [] }), deps);
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });

    it('does not run the use case', () => {
      expect(MockUseCase).not.toHaveBeenCalled();
    });
  });

  describe('when the artefact is unknown', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      givenFailure(new ItemNotFoundError('command', 'my-command', 'global'));
      deps = makeDeps();
      await moveToPackageHandler(makeArgs(), deps);
    });

    it('logs the error', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        "command 'my-command' not found in space '@global'",
      );
    });

    it('hints at the listing command', () => {
      expect(mockLogInfoConsole).toHaveBeenCalledWith(
        `Run \`${EXEC_NAME} commands list --space global\` to display available commands`,
      );
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when --to is a plain slug and multiple spaces exist', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      deps = makeDeps();
      (deps.hexa.getSpaces as jest.Mock).mockResolvedValue([
        SPACE_GLOBAL,
        SPACE_TEAM,
      ]);
      await moveToPackageHandler(makeArgs(), deps);
    });

    it('logs a disambiguation error', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('multiple spaces'),
      );
    });

    it('shows a --to example per space', () => {
      expect(mockLogInfoConsole).toHaveBeenCalledWith('  --to @team/my-pkg');
    });

    it('calls exit(1)', () => {
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });
});
