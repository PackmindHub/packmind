import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './listCommandsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { createSpaceId, SpaceType } from '@packmind/types';
import { createMockOutputRepository } from '../../../mocks/createMockRepositories';
import { IOutput } from '../../../domain/repositories/IOutput';
import { recipeFactory } from '@packmind/recipes/test';

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
  let mockOutput: jest.Mocked<IOutput>;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockOutput = createMockOutputRepository();
    mockPackmindCliHexa = {
      listCommands: jest.fn(),
      getSpaces: jest.fn().mockResolvedValue([mockSpaceA, mockSpaceB]),
      output: mockOutput,
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no space filter is provided', () => {
    describe('when commands exist across multiple spaces', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          recipeFactory({
            slug: 'zebra-command',
            name: 'Zebra Command',
            spaceId: createSpaceId('space-a'),
          }),
          recipeFactory({
            slug: 'alpha-command',
            name: 'Alpha Command',
            spaceId: createSpaceId('space-b'),
          }),
        ]);

        await listCommandsHandler({}, deps);
      });

      it('calls listCommands without spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({});
      });

      it('displays the commands grouped by space', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Commands (2)'),
          [
            {
              title: 'Space "Space A" (@space-a)',
              artefacts: [
                expect.objectContaining({
                  title: 'Zebra Command',
                  slug: 'zebra-command',
                }),
              ],
            },
            {
              title: 'Space "Space B" (@space-b)',
              artefacts: [
                expect.objectContaining({
                  title: 'Alpha Command',
                  slug: 'alpha-command',
                }),
              ],
            },
          ],
        );
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
        expect(mockOutput.notifyWarning).toHaveBeenCalledWith(
          'No commands found.',
        );
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
          recipeFactory({
            slug: 'alpha-command',
            name: 'Alpha Command',
            spaceId: createSpaceId('space-a'),
          }),
        ]);

        await listCommandsHandler({ space: 'space-a' }, deps);
      });

      it('calls listCommands with the resolved spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({
          spaceId: mockSpaceA.id,
        });
      });

      it('displays the commands only for the required space', () => {
        expect(mockOutput.listArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Commands (1)'),
          [
            expect.objectContaining({
              title: 'Alpha Command',
              slug: 'alpha-command',
            }),
          ],
        );
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
        expect(mockOutput.notifyWarning).toHaveBeenCalledWith(
          'No commands found in space "space-a".',
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
        expect(mockOutput.notifyError).toHaveBeenCalledWith(
          expect.stringContaining('Space "unknown-space" not found.'),
          {
            content: `Available spaces:
 - Space A (@space-a)
 - Space B (@space-b)`,
            exampleCommand: 'packmind-cli commands list --space @space-a',
          },
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
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        'Failed to list commands:',
        {
          content: expect.stringContaining('Network error'),
        },
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
