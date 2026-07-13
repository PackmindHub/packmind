import { PackmindLogger } from '@packmind/logger';
import {
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  Space,
  SpaceId,
  UpdateSkillFileFromUICommand,
  User,
  UserId,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { skillFileFactory } from '../../../../test/skillFileFactory';
import { skillVersionFactory } from '../../../../test/skillVersionFactory';
import { SkillEditForbiddenError } from '../../../domain/errors/SkillEditForbiddenError';
import { SkillFileNotEditableError } from '../../../domain/errors/SkillFileNotEditableError';
import { SkillFileService } from '../../services/SkillFileService';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { UpdateSkillFileFromUIUseCase } from './UpdateSkillFileFromUIUseCase';

describe('UpdateSkillFileFromUIUseCase', () => {
  let usecase: UpdateSkillFileFromUIUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let skillService: jest.Mocked<SkillService>;
  let skillVersionService: jest.Mocked<SkillVersionService>;
  let skillFileService: jest.Mocked<SkillFileService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    skillService = {
      getSkillById: jest.fn(),
      updateSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    skillVersionService = {
      getLatestSkillVersion: jest.fn(),
      addSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<SkillVersionService>;

    skillFileService = {
      findByVersionId: jest.fn(),
      addMany: jest.fn(),
    } as unknown as jest.Mocked<SkillFileService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    usecase = new UpdateSkillFileFromUIUseCase(
      spacesPort,
      accountsPort,
      skillService,
      skillVersionService,
      skillFileService,
      eventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('editing skill files', () => {
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let skillId: ReturnType<typeof createSkillId>;
    let user: User;
    let organization: Organization;
    let space: Space;
    let skill: ReturnType<typeof skillFactory>;
    let latestVersion: ReturnType<typeof skillVersionFactory>;
    let supportingFile: ReturnType<typeof skillFileFactory>;
    let command: UpdateSkillFileFromUICommand;
    let savedVersion: ReturnType<typeof skillVersionFactory>;

    beforeEach(() => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      spaceId = createSpaceId(uuidv4());
      skillId = createSkillId(uuidv4());

      user = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: null,
        active: true,
        trial: false,
        memberships: [{ organizationId, role: 'member', userId }],
      };
      organization = { id: organizationId, name: 'Test Org', slug: 'test-org' };
      space = {
        id: spaceId,
        name: 'Test Space',
        slug: 'test-space',
        organizationId,
      };

      skill = skillFactory({
        id: skillId,
        spaceId,
        userId, // creator is the acting user by default
        name: 'Test Skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: 'Old SKILL.md body',
        license: 'MIT',
        compatibility: 'All environments',
        metadata: { category: 'test' },
        allowedTools: 'Read,Write',
        additionalProperties: { userInvocable: true },
      });

      latestVersion = skillVersionFactory({
        skillId,
        userId,
        version: 3,
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        prompt: skill.prompt,
        license: skill.license,
        compatibility: skill.compatibility,
        metadata: skill.metadata,
        allowedTools: skill.allowedTools,
        additionalProperties: skill.additionalProperties,
      });

      supportingFile = skillFileFactory({
        skillVersionId: latestVersion.id,
        path: 'reference.md',
        content: 'Old supporting content',
        permissions: 'rw-r--r--',
        isBase64: false,
      });

      savedVersion = skillVersionFactory({
        ...latestVersion,
        id: createSkillVersionId(uuidv4()),
        version: 4,
        userId,
      });

      command = {
        userId,
        organizationId,
        spaceId,
        skillId,
        filePath: 'SKILL.md',
        content: 'New SKILL.md body',
      };

      accountsPort.getUserById.mockResolvedValue(user);
      accountsPort.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        pinned: false,
        createdBy: userId,
        updatedBy: userId,
      });
      skillService.getSkillById.mockResolvedValue(skill);
      skillVersionService.getLatestSkillVersion.mockResolvedValue(
        latestVersion,
      );
      skillFileService.findByVersionId.mockResolvedValue([supportingFile]);
      skillVersionService.addSkillVersion.mockResolvedValue(savedVersion);
      skillFileService.addMany.mockResolvedValue([]);
      skillService.updateSkill.mockResolvedValue(skill);
    });

    describe('when editing SKILL.md body', () => {
      it('creates a new version attributed to the editor', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            skillId,
            userId,
            prompt: 'New SKILL.md body',
            version: 4,
          }),
        );
      });

      it('preserves frontmatter columns unchanged on body edit', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            name: latestVersion.name,
            slug: latestVersion.slug,
            description: latestVersion.description,
            license: latestVersion.license,
            compatibility: latestVersion.compatibility,
            metadata: latestVersion.metadata,
            allowedTools: latestVersion.allowedTools,
            additionalProperties: latestVersion.additionalProperties,
          }),
        );
      });

      it('returns the created skill version', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual({
          skillVersion: savedVersion,
          versionCreated: true,
        });
      });

      it('emits SkillUpdatedEvent', async () => {
        await usecase.execute(command);

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              skillId,
              spaceId,
              organizationId,
              userId,
              source: 'ui',
            }),
          }),
        );
      });
    });

    describe('when editing a supporting markdown file', () => {
      beforeEach(() => {
        command = {
          ...command,
          filePath: 'reference.md',
          content: 'New supporting content',
        };
      });

      it('replaces the edited file content while carrying over other files', async () => {
        await usecase.execute(command);

        expect(skillFileService.addMany).toHaveBeenCalledWith([
          expect.objectContaining({
            skillVersionId: savedVersion.id,
            path: 'reference.md',
            content: 'New supporting content',
            permissions: supportingFile.permissions,
            isBase64: supportingFile.isBase64,
          }),
        ]);
      });

      it('does not change the SKILL.md prompt', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: latestVersion.prompt,
          }),
        );
      });
    });

    describe('when the path is not a markdown file', () => {
      beforeEach(() => {
        command = { ...command, filePath: 'script.sh', content: 'echo hi' };
      });

      it('throws SkillFileNotEditableError', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          SkillFileNotEditableError,
        );
      });
    });

    describe('when the file path does not exist in the latest version', () => {
      beforeEach(() => {
        command = { ...command, filePath: 'missing.md', content: 'content' };
      });

      it('throws an error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `File missing.md not found in skill ${skillId}`,
        );
      });
    });

    describe('when the target file is stored as base64', () => {
      beforeEach(() => {
        const base64File = skillFileFactory({
          skillVersionId: latestVersion.id,
          path: 'reference.md',
          isBase64: true,
        });
        skillFileService.findByVersionId.mockResolvedValue([base64File]);
        command = { ...command, filePath: 'reference.md', content: 'x' };
      });

      it('throws SkillFileNotEditableError', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          SkillFileNotEditableError,
        );
      });
    });

    describe('when content is empty', () => {
      beforeEach(() => {
        command = { ...command, content: '   ' };
      });

      it('throws a validation error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          'File content cannot be empty',
        );
      });
    });

    describe('when content exceeds the maximum length', () => {
      beforeEach(() => {
        command = { ...command, content: 'a'.repeat(300_001) };
      });

      it('throws a validation error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          'File content exceeds the maximum length of 300000 characters',
        );
      });
    });

    describe('when content uses CRLF line endings', () => {
      beforeEach(() => {
        command = { ...command, content: 'Line one\r\nLine two\r\n' };
      });

      it('normalizes content to LF before persisting', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'Line one\nLine two\n',
          }),
        );
      });
    });

    describe('when normalized content is identical to the current content', () => {
      beforeEach(() => {
        command = {
          ...command,
          content: latestVersion.prompt.replace(/\n/g, '\r\n'),
        };
      });

      it('returns versionCreated false', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual({ skillVersion: null, versionCreated: false });
      });

      it('does not create a new skill version', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });

    describe('permission checks', () => {
      describe('when the acting user is not a space admin, org admin, or creator', () => {
        beforeEach(() => {
          skill = skillFactory({ ...skill, userId: createUserId(uuidv4()) });
          skillService.getSkillById.mockResolvedValue(skill);
          spacesPort.findMembership.mockResolvedValue({
            userId,
            spaceId,
            role: UserSpaceRole.MEMBER,
            pinned: false,
            createdBy: userId,
            updatedBy: userId,
          });
        });

        it('throws SkillEditForbiddenError', async () => {
          await expect(usecase.execute(command)).rejects.toThrow(
            SkillEditForbiddenError,
          );
        });
      });

      describe('when the acting user is a space admin', () => {
        beforeEach(() => {
          skill = skillFactory({ ...skill, userId: createUserId(uuidv4()) });
          skillService.getSkillById.mockResolvedValue(skill);
          spacesPort.findMembership.mockResolvedValue({
            userId,
            spaceId,
            role: UserSpaceRole.ADMIN,
            pinned: false,
            createdBy: userId,
            updatedBy: userId,
          });
        });

        it('allows the edit', async () => {
          const result = await usecase.execute(command);

          expect(result.versionCreated).toBe(true);
        });
      });

      describe('when the acting user is an organization admin', () => {
        beforeEach(() => {
          skill = skillFactory({ ...skill, userId: createUserId(uuidv4()) });
          skillService.getSkillById.mockResolvedValue(skill);
          user = {
            ...user,
            memberships: [{ organizationId, role: 'admin', userId }],
          };
          accountsPort.getUserById.mockResolvedValue(user);
        });

        it('allows the edit', async () => {
          const result = await usecase.execute(command);

          expect(result.versionCreated).toBe(true);
        });
      });

      describe('when the acting user is the skill creator', () => {
        it('allows the edit', async () => {
          const result = await usecase.execute(command);

          expect(result.versionCreated).toBe(true);
        });
      });
    });
  });

  describe('validation errors', () => {
    describe('when skill does not belong to the space', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let otherSpaceId: SpaceId;
      let skillId: ReturnType<typeof createSkillId>;
      let command: UpdateSkillFileFromUICommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        otherSpaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        const user: User = {
          id: userId,
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: null,
          active: true,
          trial: false,
          memberships: [{ organizationId, role: 'member', userId }],
        };
        const organization: Organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };
        const skill = skillFactory({ id: skillId, spaceId: otherSpaceId });

        command = {
          userId,
          organizationId,
          spaceId,
          skillId,
          filePath: 'SKILL.md',
          content: 'content',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        spacesPort.findMembership.mockResolvedValue({
          userId,
          spaceId,
          role: UserSpaceRole.MEMBER,
          pinned: false,
          createdBy: userId,
          updatedBy: userId,
        });
        skillService.getSkillById.mockResolvedValue(skill);
      });

      it('throws an error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Skill ${skillId} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when the user is not a member of the space', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: UpdateSkillFileFromUICommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        const user: User = {
          id: userId,
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: null,
          active: true,
          trial: false,
          memberships: [{ organizationId, role: 'member', userId }],
        };
        const organization: Organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        command = {
          userId,
          organizationId,
          spaceId,
          skillId: createSkillId(uuidv4()),
          filePath: 'SKILL.md',
          content: 'content',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        spacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws SpaceMembershipRequiredError', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
