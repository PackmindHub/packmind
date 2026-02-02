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

  it('displays standards sorted by slug', async () => {
    mockPackmindCliHexa.listStandards.mockResolvedValue([
      { slug: 'zebra-standard', name: 'Zebra Standard', description: 'Desc Z' },
      { slug: 'alpha-standard', name: 'Alpha Standard', description: 'Desc A' },
    ]);

    await listStandardsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available standards:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) =>
      c.includes('alpha-standard'),
    );
    const zebraIndex = logCalls.findIndex((c: string) =>
      c.includes('zebra-standard'),
    );
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no standards found', async () => {
    mockPackmindCliHexa.listStandards.mockResolvedValue([]);

    await listStandardsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No standards found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listStandards.mockRejectedValue(
      new Error('Network error'),
    );

    await listStandardsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list standards:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
