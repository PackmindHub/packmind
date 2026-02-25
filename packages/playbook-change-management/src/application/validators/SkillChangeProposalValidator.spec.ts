import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CollectionItemUpdatePayload,
  CreateChangeProposalCommand,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createOrganizationId,
  createUserId,
  ISkillsPort,
  Skill,
  SkillFile,
  SkillFileId,
  SkillVersion,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { SkillChangeProposalValidator } from './SkillChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';
import { SkillFileNotFoundError } from '../errors/SkillFileNotFoundError';

describe('SkillChangeProposalValidator', () => {
  const skillId = createSkillId('skill-1');
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const latestVersionId = createSkillVersionId('version-2');
  const oldVersionId = createSkillVersionId('version-1');
  const oldFileId = createSkillFileId('old-file-1');
  const newFileId = createSkillFileId('new-file-1');

  const skill: Skill = {
    id: skillId,
    spaceId: 'space-1' as never,
    userId,
    name: 'My Skill',
    slug: 'my-skill',
    version: 2,
    description: 'desc',
    prompt: 'prompt',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const oldVersionFile: SkillFile = {
    id: oldFileId,
    skillVersionId: oldVersionId,
    path: 'helper.ts',
    content: 'old content',
    permissions: 'rw-r--r--',
    isBase64: false,
  };

  const newVersionFile: SkillFile = {
    id: newFileId,
    skillVersionId: latestVersionId,
    path: 'helper.ts',
    content: 'old content',
    permissions: 'rw-r--r--',
    isBase64: false,
  };

  let validator: SkillChangeProposalValidator;
  let skillsPort: jest.Mocked<ISkillsPort>;

  const buildCommand = (
    overrides: Partial<CreateChangeProposalCommand<ChangeProposalType>> = {},
  ) =>
    ({
      userId,
      organizationId,
      spaceId: 'space-1',
      type: ChangeProposalType.updateSkillFilePermissions,
      artefactId: skillId,
      captureMode: ChangeProposalCaptureMode.commit,
      message: 'test message',
      payload: {
        targetId: oldFileId,
        oldValue: 'rw-r--r--',
        newValue: 'rwxr-xr-x',
      },
      ...overrides,
    }) as CreateChangeProposalCommand<ChangeProposalType> & MemberContext;

  beforeEach(() => {
    skillsPort = {
      getSkill: jest.fn(),
      getSkillVersion: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      listSkillVersions: jest.fn(),
      getSkillFiles: jest.fn(),
      listSkillsBySpace: jest.fn(),
      findSkillBySlug: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    validator = new SkillChangeProposalValidator(skillsPort);

    skillsPort.getSkill.mockResolvedValue(skill);
    skillsPort.getLatestSkillVersion.mockResolvedValue({
      id: latestVersionId,
      skillId,
      version: 2,
      userId,
      name: 'My Skill',
      slug: 'my-skill',
      description: 'desc',
      prompt: 'prompt',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when file ID matches in latest version', () => {
    beforeEach(() => {
      skillsPort.getSkillFiles.mockResolvedValue([
        { ...newVersionFile, id: oldFileId },
      ]);
    });

    it('validates successfully', async () => {
      const result = await validator.validate(buildCommand());

      expect(result).toEqual({ artefactVersion: 2 });
    });

    it('does not call listSkillVersions', async () => {
      await validator.validate(buildCommand());

      expect(skillsPort.listSkillVersions).not.toHaveBeenCalled();
    });
  });

  describe('when file ID is stale but path matches in latest version', () => {
    beforeEach(() => {
      skillsPort.getSkillFiles
        .mockResolvedValueOnce([newVersionFile])
        .mockResolvedValueOnce([oldVersionFile]);
      skillsPort.listSkillVersions.mockResolvedValue([
        {
          id: oldVersionId,
          skillId,
          version: 1,
          userId,
          name: 'My Skill',
          slug: 'my-skill',
          description: 'desc',
          prompt: 'prompt',
        } as SkillVersion,
      ]);
    });

    it('falls back to path-based matching', async () => {
      const result = await validator.validate(buildCommand());

      expect(result).toEqual({ artefactVersion: 2 });
    });

    it('calls listSkillVersions for fallback lookup', async () => {
      await validator.validate(buildCommand());

      expect(skillsPort.listSkillVersions).toHaveBeenCalledWith(skillId);
    });
  });

  describe('when file ID is stale and path does not exist in latest version', () => {
    beforeEach(() => {
      skillsPort.getSkillFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([oldVersionFile]);
      skillsPort.listSkillVersions.mockResolvedValue([
        {
          id: oldVersionId,
          skillId,
          version: 1,
          userId,
          name: 'My Skill',
          slug: 'my-skill',
          description: 'desc',
          prompt: 'prompt',
        } as SkillVersion,
      ]);
    });

    it('throws SkillFileNotFoundError', async () => {
      await expect(validator.validate(buildCommand())).rejects.toBeInstanceOf(
        SkillFileNotFoundError,
      );
    });
  });

  describe('when file ID not found in any version', () => {
    beforeEach(() => {
      skillsPort.getSkillFiles.mockResolvedValue([]);
      skillsPort.listSkillVersions.mockResolvedValue([
        {
          id: oldVersionId,
          skillId,
          version: 1,
          userId,
          name: 'My Skill',
          slug: 'my-skill',
          description: 'desc',
          prompt: 'prompt',
        } as SkillVersion,
      ]);
    });

    it('throws SkillFileNotFoundError', async () => {
      await expect(validator.validate(buildCommand())).rejects.toBeInstanceOf(
        SkillFileNotFoundError,
      );
    });
  });

  describe('when updateSkillFileContent has stale file ID', () => {
    beforeEach(() => {
      skillsPort.getSkillFiles
        .mockResolvedValueOnce([newVersionFile])
        .mockResolvedValueOnce([oldVersionFile]);
      skillsPort.listSkillVersions.mockResolvedValue([
        {
          id: oldVersionId,
          skillId,
          version: 1,
          userId,
          name: 'My Skill',
          slug: 'my-skill',
          description: 'desc',
          prompt: 'prompt',
        } as SkillVersion,
      ]);
    });

    it('falls back to path-based matching for content validation', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: oldFileId,
          oldValue: 'old content',
          newValue: 'new content',
        } as CollectionItemUpdatePayload<SkillFileId>,
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 2 });
    });
  });

  describe('when updateSkillMetadata has metadata field in skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        metadata: { key1: 'value1' },
      } as Skill);
    });

    describe('when oldValue matches serialized metadata field', () => {
      it('validates successfully', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: '{"key1":"value1"}',
            newValue: '{"key1":"value2"}',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 2 });
      });
    });

    describe('when oldValue does not match', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: '{"key1":"wrong"}',
            newValue: '{"key1":"value2"}',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when updateSkillMetadata has null metadata in skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        metadata: null,
      } as unknown as Skill);
    });

    describe('when oldValue is empty object', () => {
      it('validates successfully', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: '{}',
            newValue: '{"key1":"value1"}',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 2 });
      });
    });
  });

  describe('when updateSkillLicense matches skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        license: 'MIT',
      } as unknown as Skill);
    });

    it('validates successfully', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillLicense,
        payload: {
          oldValue: 'MIT',
          newValue: 'Apache-2.0',
        },
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 2 });
    });
  });

  describe('when updateSkillLicense does not match skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        license: 'MIT',
      } as unknown as Skill);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillLicense,
        payload: {
          oldValue: 'GPL',
          newValue: 'Apache-2.0',
        },
      });

      await expect(validator.validate(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });
  });

  describe('when updateSkillLicense has undefined license in skill entity', () => {
    it('validates with empty string as current value', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillLicense,
        payload: {
          oldValue: '',
          newValue: 'MIT',
        },
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 2 });
    });
  });

  describe('when updateSkillCompatibility matches skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        compatibility: 'claude',
      } as unknown as Skill);
    });

    it('validates successfully', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillCompatibility,
        payload: {
          oldValue: 'claude',
          newValue: 'cursor',
        },
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 2 });
    });
  });

  describe('when updateSkillCompatibility does not match skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        compatibility: 'claude',
      } as unknown as Skill);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillCompatibility,
        payload: {
          oldValue: 'cursor',
          newValue: 'copilot',
        },
      });

      await expect(validator.validate(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });
  });

  describe('when updateSkillAllowedTools matches skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        allowedTools: 'Read,Write',
      } as unknown as Skill);
    });

    it('validates successfully', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillAllowedTools,
        payload: {
          oldValue: 'Read,Write',
          newValue: 'Read,Write,Edit',
        },
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 2 });
    });
  });

  describe('when updateSkillAllowedTools does not match skill entity', () => {
    beforeEach(() => {
      skillsPort.getSkill.mockResolvedValue({
        ...skill,
        allowedTools: 'Read,Write',
      } as unknown as Skill);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillAllowedTools,
        payload: {
          oldValue: 'Read',
          newValue: 'Read,Write,Edit',
        },
      });

      await expect(validator.validate(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });
  });
});
