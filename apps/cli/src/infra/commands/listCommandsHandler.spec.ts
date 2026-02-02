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

  it('displays commands sorted by slug', async () => {
    mockPackmindCliHexa.listCommands.mockResolvedValue([
      { slug: 'zebra-command', name: 'Zebra Command' },
      { slug: 'alpha-command', name: 'Alpha Command' },
    ]);

    await listCommandsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available commands:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) =>
      c.includes('alpha-command'),
    );
    const zebraIndex = logCalls.findIndex((c: string) =>
      c.includes('zebra-command'),
    );
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no commands found', async () => {
    mockPackmindCliHexa.listCommands.mockResolvedValue([]);

    await listCommandsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No commands found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listCommands.mockRejectedValue(
      new Error('Network error'),
    );

    await listCommandsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list commands:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
