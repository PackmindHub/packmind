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

  describe('when skills exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        { slug: 'zebra-skill', name: 'Zebra Skill', description: 'Desc Z' },
        { slug: 'alpha-skill', name: 'Alpha Skill', description: 'Desc A' },
      ]);

      await listSkillsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) => c.includes('Skills (2)'));

      expect(headerCall).toBeDefined();
    });

    it('sorts skills alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-skill'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-skill'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no skills found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([]);

      await listSkillsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No skills found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockRejectedValue(
        new Error('Network error'),
      );

      await listSkillsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list skills:');
    });

    it('displays error message', () => {
      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
