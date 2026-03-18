import {
  addToPackageHandler,
  AddToPackageHandlerArgs,
  AddToPackageHandlerDeps,
} from './addToPackageHandler';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import {
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatCommand: (text: string) => text,
}));

jest.mock('../../../application/useCases/AddToPackageUseCase', () => ({
  AddToPackageUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ added: ['std-1'], skipped: [] }),
  })),
}));

const mockLogErrorConsole = logErrorConsole as jest.Mock;
const mockLogInfoConsole = logInfoConsole as jest.Mock;
const mockLogSuccessConsole = logSuccessConsole as jest.Mock;

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

function makeArgs(
  overrides: Partial<AddToPackageHandlerArgs> = {},
): AddToPackageHandlerArgs {
  return {
    to: 'my-pkg',
    itemType: 'standard',
    itemSlugs: ['std-1'],
    ...overrides,
  };
}

function makeDeps(
  overrides: Partial<AddToPackageHandlerDeps> = {},
): AddToPackageHandlerDeps & { mockExit: jest.Mock } {
  const mockExit = jest.fn();
  return {
    hexa: {
      getSpaces: jest.fn().mockResolvedValue([SPACE_GLOBAL]),
      getPackmindGateway: jest.fn().mockReturnValue({}),
      getSpaceService: jest.fn().mockReturnValue({}),
    },
    exit: mockExit,
    mockExit,
    ...overrides,
  };
}

describe('addToPackageHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Space / --to validation ────────────────────────────────────────────────

  describe('when --to is a plain slug', () => {
    describe('and a single space exists', () => {
      it('does not call exit', async () => {
        const deps = makeDeps();
        await addToPackageHandler(makeArgs({ to: 'my-pkg' }), deps);
        expect(deps.mockExit).not.toHaveBeenCalled();
      });
    });

    describe('and multiple spaces exist', () => {
      let deps: ReturnType<typeof makeDeps>;

      beforeEach(async () => {
        deps = makeDeps();
        (deps.hexa.getSpaces as jest.Mock).mockResolvedValue([
          SPACE_GLOBAL,
          SPACE_TEAM,
        ]);
        await addToPackageHandler(makeArgs({ to: 'my-pkg' }), deps);
      });

      it('logs a disambiguation error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('multiple spaces'),
        );
      });

      it('shows an example --to for each space', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('--to @global/my-pkg'),
        );
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('--to @team/my-pkg'),
        );
      });

      it('hints to run packages list', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('packmind-cli packages list'),
        );
      });

      it('calls exit(1)', () => {
        expect(deps.mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when --to uses @space/package format', () => {
    describe('and the space exists', () => {
      it('does not call exit', async () => {
        const deps = makeDeps();
        await addToPackageHandler(makeArgs({ to: '@global/my-pkg' }), deps);
        expect(deps.mockExit).not.toHaveBeenCalled();
      });

      it('resolves correctly when multiple spaces exist', async () => {
        const deps = makeDeps();
        (deps.hexa.getSpaces as jest.Mock).mockResolvedValue([
          SPACE_GLOBAL,
          SPACE_TEAM,
        ]);
        await addToPackageHandler(makeArgs({ to: '@team/my-pkg' }), deps);
        expect(deps.mockExit).not.toHaveBeenCalled();
      });
    });

    describe('and the space does not exist', () => {
      let deps: ReturnType<typeof makeDeps>;

      beforeEach(async () => {
        deps = makeDeps();
        await addToPackageHandler(makeArgs({ to: '@unknown/my-pkg' }), deps);
      });

      it('logs a space-not-found error', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining("Space 'unknown' not found"),
        );
      });

      it('lists the available spaces', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('@global'),
        );
      });

      it('calls exit(1)', () => {
        expect(deps.mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  // ─── Use-case result handling ───────────────────────────────────────────────

  describe('when items are added successfully', () => {
    let deps: ReturnType<typeof makeDeps>;

    beforeEach(async () => {
      deps = makeDeps();
      const { AddToPackageUseCase } = jest.requireMock(
        '../../../application/useCases/AddToPackageUseCase',
      );
      AddToPackageUseCase.mockImplementationOnce(() => ({
        execute: jest
          .fn()
          .mockResolvedValue({ added: ['std-1', 'std-2'], skipped: [] }),
      }));
      await addToPackageHandler(
        makeArgs({ to: '@global/my-pkg', itemSlugs: ['std-1', 'std-2'] }),
        deps,
      );
    });

    it('does not call exit', () => {
      expect(deps.mockExit).not.toHaveBeenCalled();
    });

    it('shows the install hint with the full @space/package slug', () => {
      expect(mockLogSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('packmind-cli install @global/my-pkg'),
      );
    });
  });

  describe('when no items are provided', () => {
    it('calls exit(1)', async () => {
      const deps = makeDeps();
      await addToPackageHandler(makeArgs({ itemSlugs: [] }), deps);
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when the use case fails', () => {
    it('calls exit(1)', async () => {
      const deps = makeDeps();
      const { AddToPackageUseCase } = jest.requireMock(
        '../../../application/useCases/AddToPackageUseCase',
      );
      AddToPackageUseCase.mockImplementationOnce(() => ({
        execute: jest.fn().mockRejectedValue(new Error('Package not found')),
      }));

      await addToPackageHandler(makeArgs(), deps);
      expect(deps.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an ItemNotFoundError is thrown', () => {
    describe('with a spaceSlug', () => {
      let deps: ReturnType<typeof makeDeps>;

      beforeEach(async () => {
        deps = makeDeps();
        const { AddToPackageUseCase } = jest.requireMock(
          '../../../application/useCases/AddToPackageUseCase',
        );
        AddToPackageUseCase.mockImplementationOnce(() => ({
          execute: jest
            .fn()
            .mockRejectedValue(
              new ItemNotFoundError('standard', 'missing-std', 'global'),
            ),
        }));
        await addToPackageHandler(makeArgs(), deps);
      });

      it('hints to run the list command with --space flag', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('packmind-cli standards list --space global'),
        );
      });

      it('calls exit(1)', () => {
        expect(deps.mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('without a spaceSlug', () => {
      let deps: ReturnType<typeof makeDeps>;

      beforeEach(async () => {
        deps = makeDeps();
        const { AddToPackageUseCase } = jest.requireMock(
          '../../../application/useCases/AddToPackageUseCase',
        );
        AddToPackageUseCase.mockImplementationOnce(() => ({
          execute: jest
            .fn()
            .mockRejectedValue(
              new ItemNotFoundError('standard', 'missing-std'),
            ),
        }));
        await addToPackageHandler(makeArgs(), deps);
      });

      it('hints to run the list command without --space flag', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('packmind-cli standards list'),
        );
        expect(mockLogInfoConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('--space'),
        );
      });

      it('calls exit(1)', () => {
        expect(deps.mockExit).toHaveBeenCalledWith(1);
      });
    });
  });
});
