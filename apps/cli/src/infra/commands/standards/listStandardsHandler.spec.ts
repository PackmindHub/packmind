import {
  listStandardsHandler,
  ListStandardsHandlerDependencies,
} from './listStandardsHandler';
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

describe('listStandardsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let deps: ListStandardsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listStandards: jest.fn(),
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
    describe('when standards exist across multiple spaces', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([
          {
            id: 'id-z',
            slug: 'zebra-standard',
            name: 'Zebra Standard',
            description: 'Desc Z',
            spaceId: 'space-a',
          },
          {
            id: 'id-a',
            slug: 'alpha-standard',
            name: 'Alpha Standard',
            description: 'Desc A',
            spaceId: 'space-b',
          },
        ]);

        await listStandardsHandler({}, deps);
      });

      it('calls listStandards without spaceId', () => {
        expect(mockPackmindCliHexa.listStandards).toHaveBeenCalledWith({});
      });

      it('displays header with total count', () => {
        const logCalls = (console.log as jest.Mock).mock.calls.map(
          (c) => c[0] as string,
        );
        expect(logCalls.find((c) => c.includes('Standards (2)'))).toBeDefined();
      });

      it('displays space group headers', () => {
        const logCalls = (console.log as jest.Mock).mock.calls.map(
          (c) => c[0] as string,
        );
        expect(
          logCalls.find((c) => c.includes('Space "Space A"')),
        ).toBeDefined();
        expect(
          logCalls.find((c) => c.includes('Space "Space B"')),
        ).toBeDefined();
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
        expect(console.log).toHaveBeenCalledWith('No standards found.');
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
          {
            id: 'id-a',
            slug: 'alpha-standard',
            name: 'Alpha Standard',
            description: 'Desc A',
            spaceId: 'space-a',
          },
        ]);

        await listStandardsHandler({ space: 'space-a' }, deps);
      });

      it('calls listStandards with the resolved spaceId', () => {
        expect(mockPackmindCliHexa.listStandards).toHaveBeenCalledWith({
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

    describe('when no standards found in the space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([]);
        await listStandardsHandler({ space: 'space-a' }, deps);
      });

      it('displays space-specific empty message', () => {
        expect(console.log).toHaveBeenCalledWith(
          'No standards found in space "space-a".',
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
        expect(console.error).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('Space "unknown-space" not found.'),
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
