import * as fs from 'fs/promises';
import { InstallDefaultSkillsUseCase } from './InstallDefaultSkillsUseCase';
import {
  createMockPackmindRepositories,
  createMockConfigFileRepository,
} from '../../mocks/createMockRepositories';
import { createMockSkillsGateway } from '../../mocks/createMockGateways';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

const BASE_DIR = '/project';

function makeSkillContent(
  name: string,
  options: { versionConstraint?: string } = {},
): string {
  const metadataLines = options.versionConstraint
    ? `metadata:\n packmind-cli-version: "${options.versionConstraint}"\n`
    : '';
  return `---
name: '${name}'
description: 'A skill'
${metadataLines}---
# ${name}
Skill body.
`;
}

describe('InstallDefaultSkillsUseCase', () => {
  let useCase: InstallDefaultSkillsUseCase;
  let mockGetDefaults: jest.Mock;

  beforeEach(() => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('existing content' as unknown as Buffer);

    mockGetDefaults = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skippedSkillsCount: 0,
    });

    const skillsGateway = createMockSkillsGateway({
      getDefaults: mockGetDefaults,
    });
    const packmindGateway = createMockPackmindGateway({
      skills: skillsGateway,
    });
    const configRepo = createMockConfigFileRepository({
      readConfig: jest.fn().mockResolvedValue(null),
    });
    const repositories = createMockPackmindRepositories({
      packmindGateway,
      configFileRepository: configRepo,
    });

    useCase = new InstallDefaultSkillsUseCase(repositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a skill has no version constraint', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill.md',
              content: makeSkillContent('my-skill'),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      // File does not exist
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    it('creates the file', async () => {
      await useCase.execute({ cliVersion: '0.25.0', baseDirectory: BASE_DIR });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${BASE_DIR}/.claude/skills/my-skill.md`,
        makeSkillContent('my-skill'),
        'utf-8',
      );
    });

    it('returns filesCreated: 1', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty incompatibleInstalledSkills', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });

    it('returns empty skippedIncompatibleSkillNames', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });
  });

  describe('when a skill has a version constraint and CLI version exceeds it', () => {
    const skillPath = '.claude/skills/old-skill.md';
    const skillContent = makeSkillContent('old-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [{ path: skillPath, content: skillContent }],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
    });

    describe('when the skill is NOT yet installed', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));
      });

      it('does not create the file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('adds the skill name to skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toEqual(['old-skill']);
      });

      it('returns empty incompatibleInstalledSkills', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toHaveLength(0);
      });
    });

    describe('when the skill IS already installed', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });

      it('does not overwrite the file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('returns the skill as an incompatibleInstalledSkill', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toEqual([
          { skillName: 'old-skill', filePaths: [skillPath] },
        ]);
      });

      it('returns empty skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
      });
    });

    describe('when the skill is deployed for multiple agents (multiple paths)', () => {
      const claudePath = '.claude/skills/old-skill.md';
      const cursorPath = '.cursor/rules/old-skill.md';

      beforeEach(() => {
        mockGetDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              { path: claudePath, content: skillContent },
              { path: cursorPath, content: skillContent },
            ],
            delete: [],
          },
          skippedSkillsCount: 0,
        });
        mockFs.access.mockResolvedValue(undefined); // both installed
      });

      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
      });

      it('groups both paths under a single incompatibleInstalledSkill entry', () => {
        expect(result.incompatibleInstalledSkills).toHaveLength(1);
      });

      it('uses the correct skill name', () => {
        expect(result.incompatibleInstalledSkills[0].skillName).toBe(
          'old-skill',
        );
      });

      it('includes all agent replica paths', () => {
        expect(result.incompatibleInstalledSkills[0].filePaths).toEqual(
          expect.arrayContaining([claudePath, cursorPath]),
        );
      });
    });
  });

  describe('when a folder-based skill has companion files (README, LICENSE)', () => {
    const skillMdPath = '.claude/skills/old-skill/SKILL.md';
    const readmePath = '.claude/skills/old-skill/README.md';
    const licensePath = '.claude/skills/old-skill/LICENSE.txt';
    const skillContent = makeSkillContent('old-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: skillMdPath, content: skillContent },
            { path: readmePath, content: 'README content' },
            { path: licensePath, content: 'LICENSE content' },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
    });

    describe('when all files are already installed', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });

      it('groups companion files under a single incompatibleInstalledSkill entry', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toHaveLength(1);
      });

      it('includes all companion file paths in incompatibleInstalledSkills', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills[0].filePaths).toEqual(
          expect.arrayContaining([skillMdPath, readmePath, licensePath]),
        );
      });

      it('does not create or update companion files', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });
    });

    describe('when the skill is NOT yet installed', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));
      });

      it('does not create any file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('adds the skill name once to skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toEqual(['old-skill']);
      });
    });
  });

  describe('when a skill version constraint is satisfied by the CLI version', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/current-skill.md',
              content: makeSkillContent('current-skill', {
                versionConstraint: '< 0.30.0',
              }),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
    });

    it('creates the file', () => {
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty skippedIncompatibleSkillNames', () => {
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });

    it('returns empty incompatibleInstalledSkills', () => {
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });
  });

  describe('when no cliVersion is provided', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/old-skill.md',
              content: makeSkillContent('old-skill', {
                versionConstraint: '< 0.24.0',
              }),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute({ baseDirectory: BASE_DIR });
    });

    it('creates the file', () => {
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty skippedIncompatibleSkillNames', () => {
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });
  });
});
