import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './listCommandsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IOutput } from '../../../domain/repositories/IOutput';
import { createMockOutput } from '../../../mocks/createMockRepositories';
import { spaceFactory } from '@packmind/spaces/test';
import { recipeFactory } from '@packmind/recipes/test';
import { createSpaceId } from '@packmind/types';

const spaceAId = createSpaceId('space-a');
const spaceBId = createSpaceId('space-b');

const mockSpaceA = spaceFactory({
  id: spaceAId,
  slug: 'space-a',
  name: 'Space A',
  isDefaultSpace: true,
});
const mockSpaceB = spaceFactory({
  id: spaceBId,
  slug: 'space-b',
  name: 'Space B',
});

describe('listCommandsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockOutput: jest.Mocked<IOutput>;
  let mockExit: jest.Mock;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockOutput = createMockOutput();

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

  describe('when no space filter is provided', () => {
    describe('when commands exist across multiple spaces', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          recipeFactory({
            slug: 'zebra-command',
            name: 'Zebra Command',
            spaceId: spaceAId,
          }),
          recipeFactory({
            slug: 'alpha-command',
            name: 'Alpha Command',
            spaceId: spaceBId,
          }),
        ]);

        await listCommandsHandler({}, deps);
      });

      it('calls listCommands without spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({});
      });

      it('displays the commands grouped by spaces', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Commands (2)'),
          [
            {
              title: 'Space: Space A',
              artefacts: [
                expect.objectContaining({
                  slug: 'zebra-command',
                  title: 'Zebra Command',
                }),
              ],
            },
            {
              title: 'Space: Space B',
              artefacts: [
                expect.objectContaining({
                  slug: 'alpha-command',
                  title: 'Alpha Command',
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
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          expect.stringContaining('No commands found.'),
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
            spaceId: spaceAId,
          }),
        ]);

        await listCommandsHandler({ space: 'space-a' }, deps);
      });

      it('calls listCommands with the resolved spaceId', () => {
        expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({
          spaceId: mockSpaceA.id,
        });
      });

      it('displays the space group', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Commands (1)'),
          [
            {
              title: 'Space: Space A',
              artefacts: [
                expect.objectContaining({
                  slug: 'alpha-command',
                  title: 'Alpha Command',
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

    describe('when no commands found in the space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([]);
        await listCommandsHandler({ space: 'space-a' }, deps);
      });

      it('displays space-specific empty message', () => {
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          expect.stringContaining('No commands found in space "@space-a"'),
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
          expect.stringContaining('Space "@unknown-space" not found'),
          {
            content: expect.stringContaining('Available spaces:'),
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
        expect.stringContaining('Failed to list commands:'),
        expect.objectContaining({
          content: expect.stringContaining('Network error'),
        }),
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
