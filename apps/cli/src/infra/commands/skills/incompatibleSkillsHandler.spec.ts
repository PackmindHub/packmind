import * as fs from 'fs/promises';
import { handleIncompatibleInstalledSkills } from './incompatibleSkillsHandler';

jest.mock('fs/promises');
jest.mock('../../utils/consoleLogger', () => ({
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
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
