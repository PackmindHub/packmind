import {
  diffArtefactsHandler,
  DiffHandlerDependencies,
} from './diffArtefactsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ChangeProposalType } from '@packmind/types';

jest.mock('../utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  formatFilePath: jest.fn((text: string) => text),
  formatHeader: jest.fn((text: string) => text),
  formatBold: jest.fn((text: string) => text),
}));

jest.mock('../utils/diffFormatter', () => ({
  formatContentDiff: jest.fn(() => ({
    lines: ['    + added line', '    - removed line'],
    hasChanges: true,
  })),
}));

describe('diffArtefactsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let mockGetCwd: jest.Mock;
  let deps: DiffHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      readFullConfig: jest.fn(),
      configExists: jest.fn(),
      tryGetGitRepositoryRoot: jest.fn(),
      getGitRemoteUrlFromPath: jest.fn(),
      getCurrentBranch: jest.fn(),
      diffArtefacts: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/test/project');

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      getCwd: mockGetCwd,
      log: mockLog,
      error: mockError,
    };

    mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when diffs found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });

    it('displays grouped artifact header', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) =>
        c.includes('Command "My Command"'),
      );

      expect(headerCall).toBeDefined();
    });

    it('displays content changed label', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const contentChangedCall = logCalls.find((c: string) =>
        c.includes('content changed'),
      );

      expect(contentChangedCall).toBeDefined();
    });

    it('displays diff lines', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const addedLine = logCalls.find((c: string) => c.includes('+ added'));

      expect(addedLine).toBeDefined();
    });

    it('returns diffsFound count', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(1);
    });

    it('exits with code 0', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when diffs from multiple artifact types found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
        {
          filePath: '.packmind/standards/my-standard.md',
          type: ChangeProposalType.updateStandardDescription,
          payload: { oldValue: 'old std', newValue: 'new std' },
          artifactName: 'My Standard',
          artifactType: 'standard',
        },
      ]);
    });

    it('displays command header', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const commandHeader = logCalls.find((c: string) =>
        c.includes('Command "My Command"'),
      );

      expect(commandHeader).toBeDefined();
    });

    it('displays standard header', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const standardHeader = logCalls.find((c: string) =>
        c.includes('Standard "My Standard"'),
      );

      expect(standardHeader).toBeDefined();
    });

    it('returns total diffsFound count', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(2);
    });
  });

  describe('when multi-file skill has diffs', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillDescription,
          payload: { oldValue: 'old skill', newValue: 'new skill' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
        {
          filePath: '.claude/skills/my-skill/helper.ts',
          type: ChangeProposalType.updateSkillDescription,
          payload: { oldValue: 'old helper', newValue: 'new helper' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays single skill header', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const skillHeaders = logCalls.filter((c: string) =>
        c.includes('Skill "My Skill"'),
      );

      expect(skillHeaders).toHaveLength(1);
    });

    it('displays SKILL.md file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const skillMdPath = logCalls.find((c: string) => c.includes('SKILL.md'));

      expect(skillMdPath).toBeDefined();
    });

    it('displays helper.ts file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const helperPath = logCalls.find((c: string) => c.includes('helper.ts'));

      expect(helperPath).toBeDefined();
    });
  });

  describe('when no diffs found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([]);
    });

    it('displays no changes message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockLog).toHaveBeenCalledWith('No changes found.');
    });

    it('returns zero diffsFound', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(0);
    });

    it('exits with code 0', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no packages configured', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: {},
      });
    });

    it('displays usage message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockLog).toHaveBeenCalledWith('Usage: packmind-cli diff');
    });

    it('exits with code 0', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when config is null', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);
    });

    it('displays usage message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockLog).toHaveBeenCalledWith('Usage: packmind-cli diff');
    });

    it('exits with code 0', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when config parse fails', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockRejectedValue(
        new Error('Invalid JSON'),
      );
    });

    it('displays error message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith(
        'ERROR Failed to parse packmind.json',
      );
    });

    it('displays the error detail', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith('ERROR Invalid JSON');
    });

    it('exits with code 1', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when API fails', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockRejectedValue(
        new Error('Network error'),
      );
    });

    it('displays error header', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to diff:');
    });

    it('displays error message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with code 1', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when git info is available', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
        agents: ['claude'],
      });

      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/test');
      mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
        'git@github.com:org/repo.git',
      );
      mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([]);
    });

    it('passes correct params to diffArtefacts', async () => {
      await diffArtefactsHandler(deps);

      expect(mockPackmindCliHexa.diffArtefacts).toHaveBeenCalledWith({
        baseDirectory: '/test/project',
        packagesSlugs: ['my-package'],
        previousPackagesSlugs: ['my-package'],
        gitRemoteUrl: 'git@github.com:org/repo.git',
        gitBranch: 'main',
        relativePath: '/project/',
        agents: ['claude'],
      });
    });
  });

  describe('when git info collection fails', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/test');
      mockPackmindCliHexa.getGitRemoteUrlFromPath.mockImplementation(() => {
        throw new Error('No remote');
      });
      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([]);
    });

    it('calls diffArtefacts without git info', async () => {
      await diffArtefactsHandler(deps);

      expect(mockPackmindCliHexa.diffArtefacts).toHaveBeenCalledWith({
        baseDirectory: '/test/project',
        packagesSlugs: ['my-package'],
        previousPackagesSlugs: ['my-package'],
        gitRemoteUrl: undefined,
        gitBranch: undefined,
        relativePath: undefined,
        agents: undefined,
      });
    });
  });
});
