import * as fs from 'fs/promises';

import { DiffArtefactsUseCase } from './DiffArtefactsUseCase';
import { ChangeProposalType } from '@packmind/types';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';

jest.mock('fs/promises');

describe('DiffArtefactsUseCase', () => {
  let useCase: DiffArtefactsUseCase;
  const mockGateway = createMockPackmindGateway();
  const mockGetDeployed = mockGateway.deployment.getDeployed as jest.Mock;
  const defaultGitInfo = {
    gitRemoteUrl: 'git@github.com:org/repo.git',
    gitBranch: 'main',
    relativePath: '',
  };

  beforeEach(() => {
    useCase = new DiffArtefactsUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when local command file differs from server', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-1',
              spaceId: 'space-1',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff with updateCommandDescription type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
          artifactId: 'artifact-1',
          spaceId: 'space-1',
        },
      ]);
    });
  });

  describe('when Cursor command file differs from server', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.cursor/commands/packmind/my-command.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-2',
              spaceId: 'space-2',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff for the Cursor command file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.cursor/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
          artifactId: 'artifact-2',
          spaceId: 'space-2',
        },
      ]);
    });
  });

  describe('when Copilot prompt file differs from server', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.github/prompts/my-command.prompt.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-3',
              spaceId: 'space-3',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff for the Copilot prompt file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.github/prompts/my-command.prompt.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
          artifactId: 'artifact-3',
          spaceId: 'space-3',
        },
      ]);
    });
  });

  describe('when local standard file differs from server', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: 'Server standard content',
              artifactType: 'standard',
              artifactName: 'My Standard',
              artifactId: 'artifact-4',
              spaceId: 'space-4',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local standard content');
    });

    it('returns empty result (standard diffing unsupported)', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when SKILL.md name differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Server Name'\ndescription: 'Same desc'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Local Name'\ndescription: 'Same desc'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillName type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillName);
    });

    it('includes old and new name in payload', () => {
      expect(result[0].payload).toEqual({
        oldValue: 'Server Name',
        newValue: 'Local Name',
      });
    });
  });

  describe('when SKILL.md description differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Server desc'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Local desc'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillDescription type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillDescription);
    });
  });

  describe('when SKILL.md prompt differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Same'\n---\n\nServer prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Same'\n---\n\nLocal prompt",
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillPrompt type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillPrompt);
    });
  });

  describe('when SKILL.md metadata differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Same'\nmetadata:\n  key1: 'value1'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Same'\nmetadata:\n  key1: 'value2'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillMetadata type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillMetadata);
    });
  });

  describe('when SKILL.md license differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockPull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Same'\nlicense: 'MIT'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Same'\nlicense: 'Apache-2.0'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillLicense type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillLicense);
    });
  });

  describe('when SKILL.md compatibility differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockPull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Same'\ncompatibility: 'claude'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Same'\ncompatibility: 'cursor'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillCompatibility type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillCompatibility);
    });
  });

  describe('when SKILL.md allowedTools differs from server', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockPull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Same'\ndescription: 'Same'\nallowedTools: 'tool-a'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Same'\ndescription: 'Same'\nallowedTools: 'tool-b'\n---\n\nSame prompt",
      );

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillAllowedTools type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillAllowedTools);
    });
  });

  describe('when SKILL.md has multiple field changes', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Old Name'\ndescription: 'Old Desc'\n---\n\nOld prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'New Name'\ndescription: 'New Desc'\n---\n\nNew prompt",
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly three diffs', () => {
      expect(result).toHaveLength(3);
    });

    it('returns name, description, and prompt types', () => {
      expect(result.map((d) => d.type)).toEqual([
        ChangeProposalType.updateSkillName,
        ChangeProposalType.updateSkillDescription,
        ChangeProposalType.updateSkillPrompt,
      ]);
    });
  });

  describe('when SKILL.md has no differences', () => {
    const skillContent =
      "---\nname: 'Same'\ndescription: 'Same'\n---\n\nSame prompt";

    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: skillContent,
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(skillContent);
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when SKILL.md has malformed frontmatter', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'Server skill content without frontmatter',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-5',
              spaceId: 'space-5',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        'Local skill content without frontmatter',
      );

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('falls back to updateSkillPrompt type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillPrompt);
    });
  });

  describe('when skill file has no skillFileId', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('local content');
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when skill file content changed locally', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFileId: 'skill-file-1',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('local content');

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillFileContent type', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateSkillFileContent);
    });

    it('includes targetId in payload', () => {
      expect(result[0].payload).toEqual({
        targetId: 'skill-file-1',
        oldValue: 'server content',
        newValue: 'local content',
      });
    });
  });

  describe('when skill file permissions changed locally', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'same content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFileId: 'skill-file-1',
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('same content');
      (fs.stat as jest.Mock).mockResolvedValue({
        mode: 0o100755,
      });

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly one diff', () => {
      expect(result).toHaveLength(1);
    });

    it('returns updateSkillFilePermissions type', () => {
      expect(result[0].type).toBe(
        ChangeProposalType.updateSkillFilePermissions,
      );
    });

    it('includes targetId and permission values in payload', () => {
      expect(result[0].payload).toEqual({
        targetId: 'skill-file-1',
        oldValue: 'rw-r--r--',
        newValue: 'rwxr-xr-x',
      });
    });
  });

  describe('when skill file content and permissions both changed', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFileId: 'skill-file-1',
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('local content');
      (fs.stat as jest.Mock).mockResolvedValue({
        mode: 0o100755,
      });

      result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
    });

    it('returns exactly two diffs', () => {
      expect(result).toHaveLength(2);
    });

    it('returns content and permissions types', () => {
      expect(result.map((d) => d.type)).toEqual([
        ChangeProposalType.updateSkillFileContent,
        ChangeProposalType.updateSkillFilePermissions,
      ]);
    });
  });

  describe('when skill file permissions match server', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'same content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFileId: 'skill-file-1',
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('same content');
      (fs.stat as jest.Mock).mockResolvedValue({
        mode: 0o100644,
      });
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when skill file deleted locally', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
              skillFileId: 'skill-file-1',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('returns exactly one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(1);
    });

    it('returns deleteSkillFile type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].type).toBe(ChangeProposalType.deleteSkillFile);
    });

    it('includes targetId in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toHaveProperty('targetId', 'skill-file-1');
    });

    it('uses basename for item path', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toHaveProperty('item.path', 'helper.ts');
    });

    it('includes server content, permissions, and isBase64 in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toMatchObject({
        item: {
          content: 'server content',
          permissions: 'read',
          isBase64: false,
        },
      });
    });

    it('propagates artifactId from server file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBe('artifact-6');
    });

    it('propagates spaceId from server file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].spaceId).toBe('space-6');
    });
  });

  describe('when new local skill file detected', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-7',
              spaceId: 'space-7',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      // SKILL.md read (for SKILL.md diff - same content)
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        if (filePath.endsWith('new-file.ts')) {
          return Promise.resolve('new file content');
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md', 'new-file.ts']);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        mode: 0o100644,
      });
    });

    it('returns exactly one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(1);
    });

    it('returns addSkillFile type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].type).toBe(ChangeProposalType.addSkillFile);
    });

    it('includes generated id and file content with POSIX permissions in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toEqual({
        targetId: 'new-file.ts',
        item: {
          id: 'new-file.ts',
          path: 'new-file.ts',
          content: 'new file content',
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      });
    });

    it('inherits artifactId from SKILL.md file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBe('artifact-7');
    });
  });

  describe('when local file does not exist', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/missing.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Missing Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when local content matches server content', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/same.md',
              content: 'Same content',
              artifactType: 'command',
              artifactName: 'Same Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Same content');
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when server returns files without artifactType', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'packmind.json',
              content: '{}',
            },
            {
              path: 'CLAUDE.md',
              content: '# Claude',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });

    it('does not read any local files', async () => {
      await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('when file has no artifactName', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: 'Server content',
              artifactType: 'command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('excludes the file from diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });

    it('does not read any local files', async () => {
      await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('when file uses sections instead of content', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.continue/config.yaml',
              sections: [{ key: 'Packmind standards', content: 'standards' }],
              artifactType: 'standard',
              artifactName: 'My Standard',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('excludes section-based files from diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when server returns duplicate paths', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/dup.md',
              content: 'First version',
              artifactType: 'command',
              artifactName: 'Dup Command',
              artifactId: 'artifact-dup',
              spaceId: 'space-dup',
            },
            {
              path: '.packmind/commands/dup.md',
              content: 'Second version',
              artifactType: 'command',
              artifactName: 'Dup Command',
              artifactId: 'artifact-dup',
              spaceId: 'space-dup',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local version');
    });

    it('uses the last occurrence and returns one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/dup.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Second version',
            newValue: 'Local version',
          },
          artifactName: 'Dup Command',
          artifactType: 'command',
          artifactId: 'artifact-dup',
          spaceId: 'space-dup',
        },
      ]);
    });
  });

  describe('when multiple command files have changes', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/cmd-a.md',
              content: 'Server A',
              artifactType: 'command',
              artifactName: 'Command A',
              artifactId: 'artifact-a',
              spaceId: 'space-a',
            },
            {
              path: '.packmind/commands/cmd-b.md',
              content: 'Server B',
              artifactType: 'command',
              artifactName: 'Command B',
              artifactId: 'artifact-b',
              spaceId: 'space-b',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('Local A')
        .mockResolvedValueOnce('Local B');
    });

    it('returns diffs for all changed files', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('when file modification includes artifactId and spaceId', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/tracked.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Tracked Command',
              artifactId: 'art-123',
              spaceId: 'spc-456',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('propagates artifactId to the diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBe('art-123');
    });

    it('propagates spaceId to the diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].spaceId).toBe('spc-456');
    });
  });

  describe('when file modification has no artifactId or spaceId', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/untracked.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Untracked Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('sets artifactId to undefined in the diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBeUndefined();
    });

    it('sets spaceId to undefined in the diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].spaceId).toBeUndefined();
    });
  });

  describe('when server and local content both have frontmatter', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content:
                "---\ndescription: 'My command'\nagent: 'agent'\n---\n\nThis is a marvelous command",
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-fm',
              spaceId: 'space-fm',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\ndescription: 'My command'\nagent: 'agent'\n---\n\nThis is a modified command",
      );
    });

    it('returns diff payload with body-only values', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'This is a marvelous command',
            newValue: 'This is a modified command',
          },
          artifactName: 'My Command',
          artifactType: 'command',
          artifactId: 'artifact-fm',
          spaceId: 'space-fm',
        },
      ]);
    });
  });

  describe('when only frontmatter differs between server and local', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: "---\ndescription: 'Old description'\n---\n\nSame body",
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-fm2',
              spaceId: 'space-fm2',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\ndescription: 'New description'\nagent: 'added-agent'\n---\n\nSame body",
      );
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when deleted skill file has isBase64 flag', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/image.png',
              content: 'base64encodedcontent',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-bin',
              spaceId: 'space-bin',
              skillFileId: 'skill-file-bin',
              skillFilePermissions: 'read',
              isBase64: true,
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('preserves isBase64 flag in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toMatchObject({
        item: { isBase64: true },
      });
    });
  });

  describe('when deleted skill file has custom permissions', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/script.sh',
              content: '#!/bin/bash',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-perm',
              spaceId: 'space-perm',
              skillFileId: 'skill-file-perm',
              skillFilePermissions: 'rwxr-xr-x',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('preserves custom permissions in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toMatchObject({
        item: { permissions: 'rwxr-xr-x' },
      });
    });
  });

  describe('when deleted skill file is in a subdirectory', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/lib/utils.ts',
              content: 'export const util = true;',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-sub',
              spaceId: 'space-sub',
              skillFileId: 'skill-file-sub',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('uses path relative to skill folder, preserving subdirectory', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toHaveProperty('item.path', 'lib/utils.ts');
    });
  });

  describe('when skill folder has no SKILL.md in server files', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
          delete: [],
        },
        skillFolders: ['.claude/skills/orphan-skill'],
      });

      (fs.readdir as jest.Mock).mockResolvedValue(['new-file.ts']);
      (fs.stat as jest.Mock).mockImplementation(() =>
        Promise.resolve({ isDirectory: () => false }),
      );
      (fs.readFile as jest.Mock).mockResolvedValue('file content');
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when new local file is inside a subdirectory', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-dir',
              spaceId: 'space-dir',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        if (filePath.endsWith('nested-file.ts')) {
          return Promise.resolve('nested content');
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath.endsWith('my-skill')) {
          return Promise.resolve(['SKILL.md', 'references']);
        }
        if (dirPath.endsWith('references')) {
          return Promise.resolve(['nested-file.ts']);
        }
        return Promise.resolve([]);
      });

      (fs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('references')) {
          return Promise.resolve({ isDirectory: () => true });
        }
        return Promise.resolve({ isDirectory: () => false });
      });
    });

    it('returns exactly one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(1);
    });

    it('returns addSkillFile type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].type).toBe(ChangeProposalType.addSkillFile);
    });

    it('uses relative path including subdirectory in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toHaveProperty(
        'item.path',
        'references/nested-file.ts',
      );
    });

    it('uses full workspace path for filePath', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].filePath).toBe(
        '.claude/skills/my-skill/references/nested-file.ts',
      );
    });
  });

  describe('when subdirectory is empty', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-empty',
              spaceId: 'space-empty',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath.endsWith('my-skill')) {
          return Promise.resolve(['SKILL.md', 'empty-dir']);
        }
        if (dirPath.endsWith('empty-dir')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (fs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('empty-dir')) {
          return Promise.resolve({ isDirectory: () => true });
        }
        return Promise.resolve({ isDirectory: () => false });
      });
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when new local file is unreadable', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-unread',
              spaceId: 'space-unread',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        return Promise.reject(new Error('EACCES: permission denied'));
      });

      (fs.readdir as jest.Mock).mockResolvedValue([
        'SKILL.md',
        'unreadable.ts',
      ]);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
      });
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when same skill has both deleted and new files', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-mix',
              spaceId: 'space-mix',
            },
            {
              path: '.claude/skills/my-skill/old-file.ts',
              content: 'old content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-mix',
              spaceId: 'space-mix',
              skillFileId: 'skill-file-old',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        if (filePath.endsWith('new-file.ts')) {
          return Promise.resolve('new content');
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md', 'new-file.ts']);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
      });
    });

    it('returns two diffs', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(2);
    });

    it('returns deleteSkillFile and addSkillFile types', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result.map((d) => d.type)).toEqual(
        expect.arrayContaining([
          ChangeProposalType.deleteSkillFile,
          ChangeProposalType.addSkillFile,
        ]),
      );
    });

    it('uses skill-relative path for deleted file payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const deleteDiff = result.find(
        (d) => d.type === ChangeProposalType.deleteSkillFile,
      );

      expect(deleteDiff!.payload).toHaveProperty('item.path', 'old-file.ts');
    });

    it('uses skill-relative path for added file payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const addDiff = result.find(
        (d) => d.type === ChangeProposalType.addSkillFile,
      );

      expect(addDiff!.payload).toHaveProperty('item.path', 'new-file.ts');
    });
  });

  describe('when skill has subdirectory with both deleted and new files', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-sub-mix',
              spaceId: 'space-sub-mix',
            },
            {
              path: '.claude/skills/my-skill/references/existing.md',
              content: 'existing content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-sub-mix',
              spaceId: 'space-sub-mix',
              skillFileId: 'skill-file-existing',
              skillFilePermissions: 'read',
            },
            {
              path: '.claude/skills/my-skill/references/deleted-locally.md',
              content: 'server only content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-sub-mix',
              spaceId: 'space-sub-mix',
              skillFileId: 'skill-file-deleted',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: ['.claude/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        if (filePath.endsWith('existing.md')) {
          return Promise.resolve('existing content');
        }
        if (filePath.endsWith('new-file.md')) {
          return Promise.resolve('brand new content');
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath.endsWith('my-skill')) {
          return Promise.resolve(['SKILL.md', 'references']);
        }
        if (dirPath.endsWith('references')) {
          return Promise.resolve(['existing.md', 'new-file.md']);
        }
        return Promise.resolve([]);
      });

      (fs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('references')) {
          return Promise.resolve({ isDirectory: () => true });
        }
        return Promise.resolve({ isDirectory: () => false });
      });
    });

    it('detects the deleted file path as deleteSkillFile', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const deleteDiff = result.find(
        (d) => d.type === ChangeProposalType.deleteSkillFile,
      );

      expect(deleteDiff!.payload).toHaveProperty(
        'item.path',
        'references/deleted-locally.md',
      );
    });

    it('detects the new file path as addSkillFile', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const addDiff = result.find(
        (d) => d.type === ChangeProposalType.addSkillFile,
      );

      expect(addDiff!.payload).toHaveProperty(
        'item.path',
        'references/new-file.md',
      );
    });

    it('does not produce diffs for unchanged existing file', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const types = result.map((d) => d.type);
      expect(types).not.toContain(ChangeProposalType.updateSkillFileContent);
    });
  });

  describe('when Copilot skill file deleted locally', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.github/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-copilot',
              spaceId: 'space-copilot',
              skillFileId: 'skill-file-copilot',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: ['.github/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('computes relative path using skill folder', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].payload).toHaveProperty('item.path', 'helper.ts');
    });
  });

  describe('when nested relativePath SKILL.md name differs', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'src/frontend/.cursor/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'Server Name'\ndescription: 'Same desc'\n---\n\nSame prompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-nested',
              spaceId: 'space-nested',
            },
          ],
          delete: [],
        },
        skillFolders: ['.cursor/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\nname: 'Local Name'\ndescription: 'Same desc'\n---\n\nSame prompt",
      );

      (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md']);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
      });
    });

    it('returns exactly one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result).toHaveLength(1);
    });

    it('returns updateSkillName type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result[0].type).toBe(ChangeProposalType.updateSkillName);
    });
  });

  describe('when nested relativePath skill file deleted locally', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'src/frontend/.cursor/skills/my-skill/helper.ts',
              content: 'server content',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-nested-del',
              spaceId: 'space-nested-del',
              skillFileId: 'skill-file-nested',
              skillFilePermissions: 'read',
            },
          ],
          delete: [],
        },
        skillFolders: ['.cursor/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('computes relative path using prefixed skill folder', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result[0].payload).toHaveProperty('item.path', 'helper.ts');
    });
  });

  describe('when nested relativePath has new local skill file', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'src/frontend/.cursor/skills/my-skill/SKILL.md',
              content:
                "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-nested-new',
              spaceId: 'space-nested-new',
            },
          ],
          delete: [],
        },
        skillFolders: ['.cursor/skills/my-skill'],
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return Promise.resolve(
            "---\nname: 'My Skill'\ndescription: 'desc'\n---\n\nprompt",
          );
        }
        if (filePath.endsWith('new-file.ts')) {
          return Promise.resolve('new file content');
        }
        return Promise.reject(new Error('ENOENT'));
      });

      (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md', 'new-file.ts']);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
      });
    });

    it('returns exactly one diff', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result).toHaveLength(1);
    });

    it('returns addSkillFile type', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result[0].type).toBe(ChangeProposalType.addSkillFile);
    });

    it('uses correct relative path in payload', async () => {
      const result = await useCase.execute({
        ...defaultGitInfo,
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
        relativePath: 'src/frontend/',
      });

      expect(result[0].payload).toHaveProperty('item.path', 'new-file.ts');
    });
  });

  it('passes command parameters to the gateway pull', async () => {
    mockGetDeployed.mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
    });

    await useCase.execute({
      packagesSlugs: ['pkg-1', 'pkg-2'],
      gitRemoteUrl: 'git@github.com:org/repo.git',
      gitBranch: 'main',
      relativePath: '/sub/',
      baseDirectory: '/test',
    });

    expect(mockGetDeployed).toHaveBeenCalledWith({
      packagesSlugs: ['pkg-1', 'pkg-2'],
      gitRemoteUrl: 'git@github.com:org/repo.git',
      gitBranch: 'main',
      relativePath: '/sub/',
      agents: undefined,
    });
  });
});
