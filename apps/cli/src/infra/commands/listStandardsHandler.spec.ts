import {
  listStandardsHandler,
  ListStandardsHandlerDependencies,
} from './listStandardsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listStandardsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListStandardsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listStandards: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when standards exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockResolvedValue([
        {
          id: 'id-z',
          slug: 'zebra-standard',
          name: 'Zebra Standard',
          description: 'Desc Z',
        },
        {
          id: 'id-a',
          slug: 'alpha-standard',
          name: 'Alpha Standard',
          description: 'Desc A',
        },
      ]);

      await listStandardsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) =>
        c.includes('Standards (2)'),
      );

      expect(headerCall).toBeDefined();
    });

    it('sorts standards alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-standard'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-standard'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no standards found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockResolvedValue([]);

      await listStandardsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No standards found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockRejectedValue(
        new Error('Network error'),
      );

      await listStandardsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list standards:');
    });

    it('displays error message', () => {
      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
