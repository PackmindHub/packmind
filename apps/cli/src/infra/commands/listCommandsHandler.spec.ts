import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './listCommandsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listCommandsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listCommands: jest.fn(),
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

  describe('when commands exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockResolvedValue([
        { id: 'id-z', slug: 'zebra-command', name: 'Zebra Command' },
        { id: 'id-a', slug: 'alpha-command', name: 'Alpha Command' },
      ]);

      await listCommandsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) =>
        c.includes('Commands (2)'),
      );

      expect(headerCall).toBeDefined();
    });

    it('sorts commands alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-command'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-command'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no commands found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockResolvedValue([]);

      await listCommandsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No commands found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockRejectedValue(
        new Error('Network error'),
      );

      await listCommandsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list commands:');
    });

    it('displays error message', () => {
      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
