import {
  ISkillsPort,
  SkillVersion,
  SkillFile,
  SkillVersionWithFiles,
  createSkillId,
  createSkillVersionId,
  createSkillFileId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  DiffService,
} from '@packmind/types';
import { SkillChangesApplier } from './SkillChangesApplier';

describe('SkillChangesApplier', () => {
  let applier: SkillChangesApplier;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let diffService: DiffService;

  const skillId = createSkillId('skill-1');
  const versionId = createSkillVersionId('ver-1');
  const fileId = createSkillFileId('file-1');
  const userId = createUserId('user-1');
  const orgId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');

  const skillFile: SkillFile = {
    id: fileId,
    skillVersionId: versionId,
    path: 'SKILL.md',
    content: '# My Skill',
    permissions: 'rw-r--r--',
    isBase64: false,
  };

  const skillVersion: SkillVersion = {
    id: versionId,
    skillId,
    version: 1,
    userId,
    name: 'My Skill',
    slug: 'my-skill',
    description: 'A skill',
    prompt: 'Do something',
  };

  const versionWithFiles: SkillVersionWithFiles = {
    ...skillVersion,
    files: [skillFile],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    diffService = new DiffService();

    skillsPort = {
      getLatestSkillVersion: jest.fn(),
      getSkillFiles: jest.fn(),
      saveSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    applier = new SkillChangesApplier(diffService, skillsPort);
  });

  describe('getVersion', () => {
    describe('when version exists', () => {
      beforeEach(() => {
        skillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
        skillsPort.getSkillFiles.mockResolvedValue([skillFile]);
      });

      it('returns the version with files', async () => {
        const result = await applier.getVersion(skillId);

        expect(result).toEqual(versionWithFiles);
      });

      it('fetches the latest version for the skill', async () => {
        await applier.getVersion(skillId);

        expect(skillsPort.getLatestSkillVersion).toHaveBeenCalledWith(skillId);
      });

      it('fetches files by version id', async () => {
        await applier.getVersion(skillId);

        expect(skillsPort.getSkillFiles).toHaveBeenCalledWith(versionId);
      });
    });

    describe('when version does not exist', () => {
      beforeEach(() => {
        skillsPort.getLatestSkillVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(skillId)).rejects.toThrow(
          `Skill version not found for ${skillId}`,
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const newVersionId = createSkillVersionId('ver-2');
    const newSkillVersion: SkillVersion = {
      ...skillVersion,
      id: newVersionId,
      version: 2,
    };
    const newFile: SkillFile = { ...skillFile, skillVersionId: newVersionId };

    describe('when save succeeds', () => {
      beforeEach(() => {
        skillsPort.saveSkillVersion.mockResolvedValue(newSkillVersion);
        skillsPort.getSkillFiles.mockResolvedValue([newFile]);
      });

      it('returns the new version with files', async () => {
        const result = await applier.saveNewVersion(
          versionWithFiles,
          userId,
          spaceId,
          orgId,
        );

        expect(result).toEqual({ ...newSkillVersion, files: [newFile] });
      });

      it('calls saveSkillVersion with mapped fields', async () => {
        await applier.saveNewVersion(versionWithFiles, userId, spaceId, orgId);

        expect(skillsPort.saveSkillVersion).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          spaceId,
          skillVersion: {
            skillId,
            userId,
            name: 'My Skill',
            slug: 'my-skill',
            description: 'A skill',
            prompt: 'Do something',
            license: undefined,
            compatibility: undefined,
            metadata: undefined,
            allowedTools: undefined,
            additionalProperties: undefined,
            files: [
              {
                path: 'SKILL.md',
                content: '# My Skill',
                permissions: 'rw-r--r--',
                isBase64: false,
              },
            ],
          },
        });
      });
    });
  });
});
