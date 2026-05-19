import * as fs from 'fs/promises';
import {
  handleIncompatibleInstalledSkills,
  handleIncompatibleInstalledSkillsSilently,
} from './incompatibleSkillsHandler';
import { logInfoConsole, logWarningConsole } from '../../utils/consoleLogger';

jest.mock('fs/promises');
jest.mock('../../utils/consoleLogger', () => ({
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogInfoConsole = logInfoConsole as jest.MockedFunction<
  typeof logInfoConsole
>;
const mockLogWarningConsole = logWarningConsole as jest.MockedFunction<
  typeof logWarningConsole
>;
const BASE_DIR = '/project';
const confirmYes = () => Promise.resolve(true);
const confirmNo = () => Promise.resolve(false);

describe('handleIncompatibleInstalledSkills', () => {
  beforeEach(() => {
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the user cancels', () => {
    it('does not call fs.rm', async () => {
      await handleIncompatibleInstalledSkills(
        [
          {
            skillName: 'my-skill',
            filePaths: ['.claude/skills/my-skill/SKILL.md'],
          },
        ],
        BASE_DIR,
        confirmNo,
      );
      expect(mockFs.rm).not.toHaveBeenCalled();
    });

    it('does not call fs.unlink', async () => {
      await handleIncompatibleInstalledSkills(
        [
          {
            skillName: 'my-skill',
            filePaths: ['.claude/skills/my-skill/SKILL.md'],
          },
        ],
        BASE_DIR,
        confirmNo,
      );
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('when the user confirms', () => {
    describe('flat skill (single file)', () => {
      it('unlinks the file', async () => {
        await handleIncompatibleInstalledSkills(
          [
            {
              skillName: 'old-skill',
              filePaths: ['.claude/skills/old-skill.md'],
            },
          ],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.unlink).toHaveBeenCalledWith(
          `${BASE_DIR}/.claude/skills/old-skill.md`,
        );
      });

      it('does not call fs.rm', async () => {
        await handleIncompatibleInstalledSkills(
          [
            {
              skillName: 'old-skill',
              filePaths: ['.claude/skills/old-skill.md'],
            },
          ],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.rm).not.toHaveBeenCalled();
      });
    });

    describe('folder-based skill', () => {
      const filePaths = [
        '.claude/skills/old-skill/SKILL.md',
        '.claude/skills/old-skill/README.md',
        '.claude/skills/old-skill/LICENSE.txt',
        '.claude/skills/old-skill/references/spec.md',
        '.claude/skills/old-skill/steps/analyze.md',
      ];

      it('removes the skill root folder recursively', async () => {
        await handleIncompatibleInstalledSkills(
          [{ skillName: 'old-skill', filePaths }],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.rm).toHaveBeenCalledWith(
          `${BASE_DIR}/.claude/skills/old-skill`,
          { recursive: true, force: true },
        );
      });

      it('does not unlink individual files', async () => {
        await handleIncompatibleInstalledSkills(
          [{ skillName: 'old-skill', filePaths }],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.unlink).not.toHaveBeenCalled();
      });
    });

    describe('folder-based skill deployed to multiple agents', () => {
      const filePaths = [
        '.claude/skills/old-skill/SKILL.md',
        '.claude/skills/old-skill/LICENSE.txt',
        '.cursor/rules/old-skill/SKILL.md',
        '.cursor/rules/old-skill/LICENSE.txt',
      ];

      it('removes the Claude agent skill folder', async () => {
        await handleIncompatibleInstalledSkills(
          [{ skillName: 'old-skill', filePaths }],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.rm).toHaveBeenCalledWith(
          `${BASE_DIR}/.claude/skills/old-skill`,
          { recursive: true, force: true },
        );
      });

      it('removes the Cursor agent skill folder', async () => {
        await handleIncompatibleInstalledSkills(
          [{ skillName: 'old-skill', filePaths }],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.rm).toHaveBeenCalledWith(
          `${BASE_DIR}/.cursor/rules/old-skill`,
          { recursive: true, force: true },
        );
      });

      it('calls fs.rm exactly once per agent', async () => {
        await handleIncompatibleInstalledSkills(
          [{ skillName: 'old-skill', filePaths }],
          BASE_DIR,
          confirmYes,
        );
        expect(mockFs.rm).toHaveBeenCalledTimes(2);
      });
    });
  });
});

describe('handleIncompatibleInstalledSkillsSilently', () => {
  beforeEach(() => {
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not invoke any interactive prompt callback', async () => {
    const confirm = jest.fn(() => Promise.resolve(true));

    await handleIncompatibleInstalledSkillsSilently(
      [
        {
          skillName: 'obsolete-skill',
          filePaths: ['.claude/skills/obsolete-skill/SKILL.md'],
        },
      ],
      BASE_DIR,
    );

    expect(confirm).not.toHaveBeenCalled();
  });

  it('calls fs.rm for folder-based skills', async () => {
    await handleIncompatibleInstalledSkillsSilently(
      [
        {
          skillName: 'obsolete-skill',
          filePaths: [
            '.claude/skills/obsolete-skill/SKILL.md',
            '.claude/skills/obsolete-skill/README.md',
          ],
        },
      ],
      BASE_DIR,
    );

    expect(mockFs.rm).toHaveBeenCalledWith(
      `${BASE_DIR}/.claude/skills/obsolete-skill`,
      { recursive: true, force: true },
    );
  });

  it('calls fs.unlink for flat skills', async () => {
    await handleIncompatibleInstalledSkillsSilently(
      [
        {
          skillName: 'flat-obsolete-skill',
          filePaths: ['.claude/skills/flat-obsolete-skill.md'],
        },
      ],
      BASE_DIR,
    );

    expect(mockFs.unlink).toHaveBeenCalledWith(
      `${BASE_DIR}/.claude/skills/flat-obsolete-skill.md`,
    );
  });

  it('logs an info line once per deleted skill', async () => {
    const skills = [
      {
        skillName: 'skill-a',
        filePaths: ['.claude/skills/skill-a/SKILL.md'],
      },
      {
        skillName: 'skill-b',
        filePaths: ['.claude/skills/skill-b.md'],
      },
    ];

    await handleIncompatibleInstalledSkillsSilently(skills, BASE_DIR);

    const skillRemovalLogs = mockLogInfoConsole.mock.calls.filter(([msg]) =>
      typeof msg === 'string' ? msg.includes('Removing obsolete skill') : false,
    );

    expect(skillRemovalLogs).toHaveLength(2);
    expect(skillRemovalLogs[0][0]).toContain('skill-a');
    expect(skillRemovalLogs[1][0]).toContain('skill-b');
  });

  it('still emits the underlying warning message from the wrapped handler', async () => {
    // The wrapper delegates to the underlying handler, so the warning header
    // is still produced. This documents the behaviour rather than enforcing
    // a silent-only output contract.
    await handleIncompatibleInstalledSkillsSilently(
      [
        {
          skillName: 'obsolete-skill',
          filePaths: ['.claude/skills/obsolete-skill/SKILL.md'],
        },
      ],
      BASE_DIR,
    );

    expect(mockLogWarningConsole).toHaveBeenCalled();
  });
});
