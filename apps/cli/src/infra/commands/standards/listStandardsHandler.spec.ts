import {
  listStandardsHandler,
  ListStandardsHandlerDependencies,
} from './listStandardsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IOutput } from '../../../domain/repositories/IOutput';
import { createMockOutput } from '../../../mocks/createMockRepositories';
import { createSpaceId } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test';
import { standardFactory } from '@packmind/standards/test';

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

describe('listStandardsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockOutput: jest.Mocked<IOutput>;
  let mockExit: jest.Mock;
  let deps: ListStandardsHandlerDependencies;

  beforeEach(() => {
    mockOutput = createMockOutput();

    mockPackmindCliHexa = {
      listStandards: jest.fn(),
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
    describe('when standards exist across multiple spaces', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([
          standardFactory({
            slug: 'zebra-standard',
            name: 'Zebra Standard',
            spaceId: spaceAId,
          }),
          standardFactory({
            slug: 'alpha-standard',
            name: 'Alpha Standard',
            spaceId: spaceBId,
          }),
        ]);

        await listStandardsHandler({}, deps);
      });

      it('calls listStandards without spaceId', () => {
        expect(mockPackmindCliHexa.listStandards).toHaveBeenCalledWith({});
      });

      it('displays the standards grouped by spaces', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Standards (2)'),
          [
            {
              title: 'Space: Space A',
              artefacts: [
                expect.objectContaining({
                  slug: 'zebra-standard',
                  title: 'Zebra Standard',
                }),
              ],
            },
            {
              title: 'Space: Space B',
              artefacts: [
                expect.objectContaining({
                  slug: 'alpha-standard',
                  title: 'Alpha Standard',
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

    describe('when no standards found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([]);
        await listStandardsHandler({}, deps);
      });

      it('displays empty message', () => {
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          expect.stringContaining('No standards found.'),
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
        mockPackmindCliHexa.listStandards.mockResolvedValue([
          standardFactory({
            slug: 'alpha-standard',
            name: 'Alpha Standard',
            spaceId: spaceAId,
          }),
        ]);

        await listStandardsHandler({ space: 'space-a' }, deps);
      });

      it('calls listStandards with the resolved spaceId', () => {
        expect(mockPackmindCliHexa.listStandards).toHaveBeenCalledWith({
          spaceId: mockSpaceA.id,
        });
      });

      it('displays the space group', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.stringContaining('Standards (1)'),
          [
            {
              title: 'Space: Space A',
              artefacts: [
                expect.objectContaining({
                  slug: 'alpha-standard',
                  title: 'Alpha Standard',
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

    describe('when no standards found in the space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([]);
        await listStandardsHandler({ space: 'space-a' }, deps);
      });

      it('displays space-specific empty message', () => {
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          expect.stringContaining('No standards found in space "@space-a"'),
        );
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when the space does not exist', () => {
      beforeEach(async () => {
        await listStandardsHandler({ space: 'unknown-space' }, deps);
      });

      it('displays an error message', () => {
        expect(mockOutput.notifyError).toHaveBeenCalledWith(
          expect.stringContaining('Space "@unknown-space" not found.'),
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
      mockPackmindCliHexa.listStandards.mockRejectedValue(
        new Error('Network error'),
      );

      await listStandardsHandler({}, deps);
    });

    it('displays error message', () => {
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list standards:'),
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
