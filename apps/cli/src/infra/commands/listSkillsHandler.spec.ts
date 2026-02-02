import {
  listSkillsHandler,
  ListSkillsHandlerDependencies,
} from './listSkillsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listSkillsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListSkillsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listSkills: jest.fn(),
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

  it('displays skills sorted by slug', async () => {
    mockPackmindCliHexa.listSkills.mockResolvedValue([
      { slug: 'zebra-skill', name: 'Zebra Skill', description: 'Desc Z' },
      { slug: 'alpha-skill', name: 'Alpha Skill', description: 'Desc A' },
    ]);

    await listSkillsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available skills:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) =>
      c.includes('alpha-skill'),
    );
    const zebraIndex = logCalls.findIndex((c: string) =>
      c.includes('zebra-skill'),
    );
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no skills found', async () => {
    mockPackmindCliHexa.listSkills.mockResolvedValue([]);

    await listSkillsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No skills found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listSkills.mockRejectedValue(
      new Error('Network error'),
    );

    await listSkillsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list skills:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
