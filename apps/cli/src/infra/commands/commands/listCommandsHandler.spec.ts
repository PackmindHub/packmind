import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './listCommandsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { SpaceType } from '@packmind/types';

const mockSpaceA = {
  id: 'space-a',
  slug: 'space-a',
  name: 'Space A',
  type: SpaceType.open,
  organizationId: 'org-id',
  isDefaultSpace: true,
};

const mockSpaceB = {
  id: 'space-b',
  slug: 'space-b',
  name: 'Space B',
  type: SpaceType.open,
  organizationId: 'org-id',
  isDefaultSpace: false,
};

describe('listCommandsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listCommands: jest.fn(),
      getSpaces: jest.fn().mockResolvedValue([mockSpaceA, mockSpaceB]),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
    };

    jest.spyOn(console, 'log').mockReturnValue(undefined);
    jest.spyOn(console, 'error').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no space filter is provided', () => {
    describe('when commands exist across multiple spaces', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          {
            id: 'id-z',
            slug: 'zebra-command',
            name: 'Zebra Command',
            spaceId: 'space-a',
          },
          {
            id: 'id-a',
            slug: 'alpha-command',
            name: 'Alpha Command',
            spaceId: 'space-b',
          },
        ]);

        await listCommandsHandler({}, deps);
      });

      it('calls listCommands without spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({});
      });

      it('displays header with total count', () => {
        const logCalls = (console.log as jest.Mock).mock.calls.map(
          (c) => c[0] as string,
        );
        expect(logCalls.find((c) => c.includes('Commands (2)'))).toBeDefined();
      });

      describe('displays space group headers', () => {
        let logCalls: string[];

        beforeEach(() => {
          logCalls = (console.log as jest.Mock).mock.calls.map(
            (c) => c[0] as string,
          );
        });

        it('displays Space A header', () => {
          expect(
            logCalls.find((c) => c.includes('Space "Space A"')),
          ).toBeDefined();
        });

        it('displays Space B header', () => {
          expect(
            logCalls.find((c) => c.includes('Space "Space B"')),
          ).toBeDefined();
        });
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no commands found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([]);
        await listCommandsHandler({}, deps);
      });

      it('displays empty message', () => {
        expect(console.log).toHaveBeenCalledWith('No commands found.');
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when a space filter is provided', () => {
    describe('when the space exists', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          {
            id: 'id-a',
            slug: 'alpha-command',
            name: 'Alpha Command',
            spaceId: 'space-a',
          },
        ]);

        await listCommandsHandler({ space: 'space-a' }, deps);
      });

      it('calls listCommands with the resolved spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({
          spaceId: mockSpaceA.id,
        });
      });

      it('displays the space group header', () => {
        const logCalls = (console.log as jest.Mock).mock.calls.map(
          (c) => c[0] as string,
        );
        expect(
          logCalls.find((c) => c.includes('Space "Space A"')),
        ).toBeDefined();
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no commands found in the space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([]);
        await listCommandsHandler({ space: 'space-a' }, deps);
      });

      it('displays space-specific empty message', () => {
        expect(console.log).toHaveBeenCalledWith(
          'No commands found in space "@space-a".',
        );
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when the space does not exist', () => {
      beforeEach(async () => {
        await listCommandsHandler({ space: 'unknown-space' }, deps);
      });

      it('displays an error message', () => {
        expect(console.error).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('Space "@unknown-space" not found.'),
        );
      });

      it('exits with code 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockRejectedValue(
        new Error('Network error'),
      );

      await listCommandsHandler({}, deps);
    });

    it('displays error message', () => {
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Network error'),
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
