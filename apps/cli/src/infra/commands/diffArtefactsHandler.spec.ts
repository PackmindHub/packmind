import {
  diffArtefactsHandler,
  DiffHandlerDependencies,
} from './diffArtefactsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ChangeProposalType, createSkillFileId } from '@packmind/types';

jest.mock('../utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
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

jest.mock('../utils/editorMessage', () => ({
  openEditorForMessage: jest.fn(() => 'test message from editor'),
  validateMessage: jest.fn((msg: string) => ({
    valid: true,
    message: msg.trim(),
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
      submitDiffs: jest.fn(),
      checkDiffs: jest.fn(),
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

    mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/test');
    mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
      'git@github.com:org/repo.git',
    );
    mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');

    // Default: all diffs are unsubmitted
    mockPackmindCliHexa.checkDiffs.mockImplementation(async (groupedDiffs) => ({
      results: groupedDiffs.flat().map((diff) => ({
        diff,
        exists: false,
        createdAt: null,
      })),
    }));
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

    it('displays file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const filePathCall = logCalls.find((c: string) =>
        c.includes('.packmind/commands/my-command.md'),
      );

      expect(filePathCall).toBeDefined();
    });

    it('displays content changed label', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const contentChangedCall = logCalls.find((c: string) =>
        c.includes('Instructions updated'),
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

    it('displays summary with single artefact', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logWarningConsole).toHaveBeenCalledWith(
        'Summary: 1 change found on 1 artefact:',
      );
    });

    it('displays artefact name in summary', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logWarningConsole).toHaveBeenCalledWith('* Command "My Command"');
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

    it('displays summary with multiple artefacts', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logWarningConsole).toHaveBeenCalledWith(
        'Summary: 2 changes found on 2 artefacts:',
      );
    });

    it('lists Command before Standard in summary', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      const calls = logWarningConsole.mock.calls.map((c: string[]) => c[0]);
      const commandIndex = calls.indexOf('* Command "My Command"');
      const standardIndex = calls.indexOf('* Standard "My Standard"');

      expect(commandIndex).toBeLessThan(standardIndex);
    });
  });

  describe('when diffs from all artifact types found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.packmind/standards/my-standard.md',
          type: ChangeProposalType.updateStandardDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Standard',
          artifactType: 'standard',
        },
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });

    it('lists Command before Skill in summary', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      const calls = logWarningConsole.mock.calls.map((c: string[]) => c[0]);
      const commandIndex = calls.indexOf('* Command "My Command"');
      const skillIndex = calls.indexOf('* Skill "My Skill"');

      expect(commandIndex).toBeLessThan(skillIndex);
    });

    it('lists Skill before Standard in summary', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      const calls = logWarningConsole.mock.calls.map((c: string[]) => c[0]);
      const skillIndex = calls.indexOf('* Skill "My Skill"');
      const standardIndex = calls.indexOf('* Standard "My Standard"');

      expect(skillIndex).toBeLessThan(standardIndex);
    });
  });

  describe('when multiple artefacts of same type found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.packmind/commands/zulu-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'Zulu Command',
          artifactType: 'command',
        },
        {
          filePath: '.packmind/commands/alpha-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'Alpha Command',
          artifactType: 'command',
        },
      ]);
    });

    it('sorts artefacts alphabetically within same type', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      const calls = logWarningConsole.mock.calls.map((c: string[]) => c[0]);
      const alphaIndex = calls.indexOf('* Command "Alpha Command"');
      const zuluIndex = calls.indexOf('* Command "Zulu Command"');

      expect(alphaIndex).toBeLessThan(zuluIndex);
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

  describe('when same artifact has identical changes across agent folders', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
        {
          filePath: '.cursor/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old', newValue: 'new' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });

    it('displays claude file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const claudePath = logCalls.find((c: string) =>
        c.includes('.claude/commands/packmind/my-command.md'),
      );

      expect(claudePath).toBeDefined();
    });

    it('displays cursor file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const cursorPath = logCalls.find((c: string) =>
        c.includes('.cursor/commands/packmind/my-command.md'),
      );

      expect(cursorPath).toBeDefined();
    });

    it('displays content changed only once', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const contentChangedCalls = logCalls.filter(
        (c: string) => c === '  - Instructions updated',
      );

      expect(contentChangedCalls).toHaveLength(1);
    });

    it('displays diff lines only once', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const addedLines = logCalls.filter((c: string) =>
        c.includes('+ added line'),
      );

      expect(addedLines).toHaveLength(1);
    });

    it('counts each file as a separate change', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(2);
    });
  });

  describe('when same artifact has different changes across agent folders', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old-claude', newValue: 'new-claude' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
        {
          filePath: '.cursor/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: { oldValue: 'old-cursor', newValue: 'new-cursor' },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });

    it('displays claude file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const claudePath = logCalls.find((c: string) =>
        c.includes('.claude/commands/packmind/my-command.md'),
      );

      expect(claudePath).toBeDefined();
    });

    it('displays cursor file path', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const cursorPath = logCalls.find((c: string) =>
        c.includes('.cursor/commands/packmind/my-command.md'),
      );

      expect(cursorPath).toBeDefined();
    });

    it('displays content changed twice', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const contentChangedCalls = logCalls.filter(
        (c: string) => c === '  - Instructions updated',
      );

      expect(contentChangedCalls).toHaveLength(2);
    });

    it('displays diff lines separately for each', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const addedLines = logCalls.filter((c: string) =>
        c.includes('+ added line'),
      );

      expect(addedLines).toHaveLength(2);
    });
  });

  describe('when deleted skill file has more than 3 lines', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/reference.ts',
          type: ChangeProposalType.deleteSkillFile,
          payload: {
            targetId: createSkillFileId('file-id'),
            item: {
              id: createSkillFileId('file-id'),
              path: 'reference.ts',
              content: 'line 1\nline 2\nline 3\nline 4\nline 5',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays only the first 3 lines', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const deletedLines = logCalls.filter((c: string) =>
        c.includes('    - line'),
      );

      expect(deletedLines).toHaveLength(3);
    });

    it('displays the truncation message with remaining count', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const truncationMessage = logCalls.find((c: string) =>
        c.includes('... and 2 more lines deleted'),
      );

      expect(truncationMessage).toBeDefined();
    });
  });

  describe('when deleted skill file has 3 or fewer lines', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/small.ts',
          type: ChangeProposalType.deleteSkillFile,
          payload: {
            targetId: createSkillFileId('file-id'),
            item: {
              id: createSkillFileId('file-id'),
              path: 'small.ts',
              content: 'line 1\nline 2\nline 3',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays all lines without truncation', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const deletedLines = logCalls.filter((c: string) =>
        c.includes('    - line'),
      );

      expect(deletedLines).toHaveLength(3);
    });

    it('does not display truncation message', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const truncationMessage = logCalls.find((c: string) =>
        c.includes('more lines deleted'),
      );

      expect(truncationMessage).toBeUndefined();
    });
  });

  describe('when new skill file is added', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/reference.ts',
          type: ChangeProposalType.addSkillFile,
          payload: {
            targetId: createSkillFileId('file-id'),
            item: {
              id: createSkillFileId('file-id'),
              path: 'reference.ts',
              content: 'line 1\nline 2\nline 3\nline 4\nline 5',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays all lines without truncation', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const addedLines = logCalls.filter((c: string) =>
        c.includes('    + line'),
      );

      expect(addedLines).toHaveLength(5);
    });
  });

  describe('when skill license change found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillLicense,
          payload: { oldValue: 'MIT', newValue: 'Apache-2.0' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays skill license changed label', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const label = logCalls.find((c: string) => c.includes('License'));

      expect(label).toBeDefined();
    });
  });

  describe('when skill compatibility change found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillCompatibility,
          payload: { oldValue: 'claude', newValue: 'cursor' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays skill compatibility changed label', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const label = logCalls.find((c: string) => c.includes('Compatibility'));

      expect(label).toBeDefined();
    });
  });

  describe('when skill allowed tools change found', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillAllowedTools,
          payload: { oldValue: 'tool-a', newValue: 'tool-b' },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays skill allowed tools changed label', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const label = logCalls.find((c: string) => c.includes('Allowed Tools'));

      expect(label).toBeDefined();
    });
  });

  describe('when binary skill file content is updated', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/icon.png',
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: createSkillFileId('file-id'),
            oldValue: 'aVZCT1J3MEtHZ29BQUFBTlN==',
            newValue: 'iVBORw0KGgoAAAANSUhEUg==',
            isBase64: true,
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays binary content changed message', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const binaryMessage = logCalls.find((c: string) =>
        c.includes('[binary content changed]'),
      );

      expect(binaryMessage).toBeDefined();
    });
  });

  describe('when non-binary skill file content is updated', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        {
          filePath: '.claude/skills/my-skill/helper.ts',
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: createSkillFileId('file-id'),
            oldValue: 'const x = 1;',
            newValue: 'const x = 2;',
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });

    it('displays normal diff lines', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const diffLine = logCalls.find((c: string) => c.includes('+ added'));

      expect(diffLine).toBeDefined();
    });

    it('does not display binary content changed message', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const binaryMessage = logCalls.find((c: string) =>
        c.includes('[binary content changed]'),
      );

      expect(binaryMessage).toBeUndefined();
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
    });

    it('displays error about missing git info', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith(
        '\n❌ Could not determine git repository info. The diff command requires a git repository with a remote configured.',
      );
    });

    it('exits with code 1', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call diffArtefacts', async () => {
      await diffArtefactsHandler(deps);

      expect(mockPackmindCliHexa.diffArtefacts).not.toHaveBeenCalled();
    });
  });

  describe('when not in a git repository', () => {
    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
    });

    it('displays error about missing git info', async () => {
      await diffArtefactsHandler(deps);

      expect(mockError).toHaveBeenCalledWith(
        '\n❌ Could not determine git repository info. The diff command requires a git repository with a remote configured.',
      );
    });

    it('exits with code 1', async () => {
      await diffArtefactsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call diffArtefacts', async () => {
      await diffArtefactsHandler(deps);

      expect(mockPackmindCliHexa.diffArtefacts).not.toHaveBeenCalled();
    });
  });

  describe('when submit is false', () => {
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

    it('does not call submitDiffs', async () => {
      await diffArtefactsHandler({ ...deps, submit: false });

      expect(mockPackmindCliHexa.submitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('when submit is true', () => {
    describe('when there are diffs', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 1,
          alreadySubmitted: 0,
          skipped: [],
          errors: [],
        });
      });

      it('calls submitDiffs with grouped diffs', async () => {
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(mockPackmindCliHexa.submitDiffs).toHaveBeenCalledWith(
          [
            [
              {
                filePath: '.packmind/commands/my-command.md',
                type: ChangeProposalType.updateCommandDescription,
                payload: { oldValue: 'old', newValue: 'new' },
                artifactName: 'My Command',
                artifactType: 'command',
              },
            ],
          ],
          'test message',
        );
      });

      it('displays submission summary', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../utils/consoleLogger',
        );
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logSuccessConsole).toHaveBeenCalledWith('Summary: 1 submitted');
      });
    });

    describe('when there are diffs with skipped artifacts', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 1,
          alreadySubmitted: 1,
          skipped: [
            { name: 'My Standard', reason: 'Only commands are supported' },
          ],
          errors: [],
        });
      });

      it('displays summary with submitted and already submitted counts', async () => {
        const { logWarningConsole } = jest.requireMock(
          '../utils/consoleLogger',
        );
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logWarningConsole).toHaveBeenCalledWith(
          'Summary: 1 submitted, 1 already submitted',
        );
      });
    });

    describe('when submit has errors', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 0,
          alreadySubmitted: 0,
          skipped: [],
          errors: [{ name: 'My Command', message: 'Server error' }],
        });
      });

      it('displays error for each failed submission', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Failed to submit "My Command": Server error',
        );
      });

      it('displays error summary', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logErrorConsole).toHaveBeenCalledWith('Summary: 1 error');
      });
    });

    describe('when submit has a ChangeProposalPayloadMismatchError', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 0,
          alreadySubmitted: 0,
          skipped: [],
          errors: [
            {
              name: 'My Command',
              message: 'Payload mismatch',
              code: 'ChangeProposalPayloadMismatchError',
              artifactType: 'command',
            },
          ],
        });
      });

      it('displays user-friendly outdated message with artifact type', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Failed to submit "My Command": command is outdated, please run `packmind-cli install` to update it',
        );
      });
    });

    describe('when submit has a non-mismatch error', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 0,
          alreadySubmitted: 0,
          skipped: [],
          errors: [{ name: 'My Command', message: 'Server error' }],
        });
      });

      it('displays raw error message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Failed to submit "My Command": Server error',
        );
      });

      it('does not display outdated message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logErrorConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('is outdated'),
        );
      });
    });

    describe('when submit has mix of submitted, skipped, and errors', () => {
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

        mockPackmindCliHexa.submitDiffs.mockResolvedValue({
          submitted: 2,
          alreadySubmitted: 1,
          skipped: [
            { name: 'My Standard', reason: 'Only commands are supported' },
          ],
          errors: [
            { name: 'Failing Command', message: 'Server error' },
            { name: 'Another Command', message: 'Timeout' },
          ],
        });
      });

      it('displays summary with all counts', async () => {
        const { logWarningConsole } = jest.requireMock(
          '../utils/consoleLogger',
        );
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logWarningConsole).toHaveBeenCalledWith(
          'Summary: 2 submitted, 1 already submitted, 2 errors',
        );
      });
    });

    describe('when there are no diffs', () => {
      beforeEach(() => {
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { 'my-package': '*' },
        });

        mockPackmindCliHexa.diffArtefacts.mockResolvedValue([]);
      });

      it('does not call submitDiffs', async () => {
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(mockPackmindCliHexa.submitDiffs).not.toHaveBeenCalled();
      });

      it('displays no changes to submit message', async () => {
        const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');
        await diffArtefactsHandler({
          ...deps,
          submit: true,
          message: 'test message',
        });

        expect(logInfoConsole).toHaveBeenCalledWith('No changes to submit.');
      });
    });
  });

  describe('when some diffs are already submitted', () => {
    const commandDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command' as const,
    };

    const standardDiff = {
      filePath: '.packmind/standards/my-standard.md',
      type: ChangeProposalType.updateStandardDescription,
      payload: { oldValue: 'old std', newValue: 'new std' },
      artifactName: 'My Standard',
      artifactType: 'standard' as const,
    };

    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        commandDiff,
        standardDiff,
      ]);

      mockPackmindCliHexa.checkDiffs.mockResolvedValue({
        results: [
          { diff: commandDiff, exists: false, createdAt: null },
          {
            diff: standardDiff,
            exists: true,
            createdAt: '2025-06-15T10:30:00.000Z',
          },
        ],
      });
    });

    it('displays unsubmitted diffs', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const commandHeader = logCalls.find((c: string) =>
        c.includes('Command "My Command"'),
      );

      expect(commandHeader).toBeDefined();
    });

    it('hides submitted diffs by default', async () => {
      await diffArtefactsHandler(deps);

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const standardHeader = logCalls.find((c: string) =>
        c.includes('Standard "My Standard"'),
      );

      expect(standardHeader).toBeUndefined();
    });

    it('displays footer about submitted changes', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('1 change proposal ignored'),
      );
    });

    it('displays footer with hint to use --include-submitted', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('run "packmind-cli diff --include-submitted"'),
      );
    });

    it('returns diffsFound count of unsubmitted only', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(1);
    });
  });

  describe('when all diffs are already submitted', () => {
    const commandDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command' as const,
    };

    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([commandDiff]);

      mockPackmindCliHexa.checkDiffs.mockResolvedValue({
        results: [
          {
            diff: commandDiff,
            exists: true,
            createdAt: '2025-06-15T10:30:00.000Z',
          },
        ],
      });
    });

    it('displays no new changes message', async () => {
      await diffArtefactsHandler(deps);

      expect(mockLog).toHaveBeenCalledWith('No new changes found.');
    });

    it('displays footer about submitted changes', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler(deps);

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('1 change proposal ignored'),
      );
    });

    it('returns zero diffsFound', async () => {
      const result = await diffArtefactsHandler(deps);

      expect(result.diffsFound).toBe(0);
    });
  });

  describe('when --include-submitted is used', () => {
    const commandDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command' as const,
    };

    const standardDiff = {
      filePath: '.packmind/standards/my-standard.md',
      type: ChangeProposalType.updateStandardDescription,
      payload: { oldValue: 'old std', newValue: 'new std' },
      artifactName: 'My Standard',
      artifactType: 'standard' as const,
    };

    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        commandDiff,
        standardDiff,
      ]);

      mockPackmindCliHexa.checkDiffs.mockResolvedValue({
        results: [
          { diff: commandDiff, exists: false, createdAt: null },
          {
            diff: standardDiff,
            exists: true,
            createdAt: '2025-06-15T10:30:00.000Z',
          },
        ],
      });
    });

    it('displays unsubmitted diffs with --include-submitted', async () => {
      await diffArtefactsHandler({ ...deps, includeSubmitted: true });

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const commandHeader = logCalls.find((c: string) =>
        c.includes('Command "My Command"'),
      );

      expect(commandHeader).toBeDefined();
    });

    it('displays submitted diffs with --include-submitted', async () => {
      await diffArtefactsHandler({ ...deps, includeSubmitted: true });

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const standardHeader = logCalls.find((c: string) =>
        c.includes('Standard "My Standard"'),
      );

      expect(standardHeader).toBeDefined();
    });

    it('shows submitted tag with date for submitted diffs', async () => {
      await diffArtefactsHandler({ ...deps, includeSubmitted: true });

      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const submittedTag = logCalls.find((c: string) =>
        c.includes('already submitted on'),
      );

      expect(submittedTag).toBeDefined();
    });

    it('returns total diffsFound including submitted', async () => {
      const result = await diffArtefactsHandler({
        ...deps,
        includeSubmitted: true,
      });

      expect(result.diffsFound).toBe(2);
    });
  });

  describe('when --submit is used with mixed submitted and unsubmitted diffs', () => {
    const commandDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command' as const,
    };

    const standardDiff = {
      filePath: '.packmind/standards/my-standard.md',
      type: ChangeProposalType.updateStandardDescription,
      payload: { oldValue: 'old std', newValue: 'new std' },
      artifactName: 'My Standard',
      artifactType: 'standard' as const,
    };

    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([
        commandDiff,
        standardDiff,
      ]);

      mockPackmindCliHexa.checkDiffs.mockResolvedValue({
        results: [
          { diff: commandDiff, exists: false, createdAt: null },
          {
            diff: standardDiff,
            exists: true,
            createdAt: '2025-06-15T10:30:00.000Z',
          },
        ],
      });

      mockPackmindCliHexa.submitDiffs.mockResolvedValue({
        submitted: 1,
        alreadySubmitted: 0,
        skipped: [],
        errors: [],
      });
    });

    it('only submits unsubmitted diffs', async () => {
      await diffArtefactsHandler({
        ...deps,
        submit: true,
        message: 'test message',
      });

      expect(mockPackmindCliHexa.submitDiffs).toHaveBeenCalledWith(
        [[commandDiff]],
        'test message',
      );
    });

    it('does not submit already submitted diffs', async () => {
      await diffArtefactsHandler({
        ...deps,
        submit: true,
        message: 'test message',
      });

      const submitCalls = mockPackmindCliHexa.submitDiffs.mock.calls;
      const allSubmittedDiffs = submitCalls.flatMap((call) => call[0].flat());

      expect(allSubmittedDiffs).not.toContain(standardDiff);
    });
  });

  describe('when --submit is used and all diffs are already submitted', () => {
    const commandDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command' as const,
    };

    beforeEach(() => {
      mockPackmindCliHexa.readFullConfig.mockResolvedValue({
        packages: { 'my-package': '*' },
      });

      mockPackmindCliHexa.diffArtefacts.mockResolvedValue([commandDiff]);

      mockPackmindCliHexa.checkDiffs.mockResolvedValue({
        results: [
          {
            diff: commandDiff,
            exists: true,
            createdAt: '2025-06-15T10:30:00.000Z',
          },
        ],
      });
    });

    it('does not call submitDiffs', async () => {
      await diffArtefactsHandler({
        ...deps,
        submit: true,
        message: 'test message',
      });

      expect(mockPackmindCliHexa.submitDiffs).not.toHaveBeenCalled();
    });

    it('displays all changes already submitted message', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');
      await diffArtefactsHandler({
        ...deps,
        submit: true,
        message: 'test message',
      });

      expect(logInfoConsole).toHaveBeenCalledWith(
        'All changes already submitted.',
      );
    });
  });
});
