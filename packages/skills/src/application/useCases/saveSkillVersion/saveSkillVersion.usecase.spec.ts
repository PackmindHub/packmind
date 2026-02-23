import { PackmindLogger } from '@packmind/logger';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { spaceFactory } from '@packmind/spaces/test';
import { stubLogger } from '@packmind/test-utils';
import {
  createSkillId,
  IAccountsPort,
  ISpacesPort,
  OrganizationId,
  SaveSkillVersionCommand,
  SkillId,
  SkillVersionInput,
  SpaceId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { skillVersionFactory } from '../../../../test/skillVersionFactory';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SaveSkillVersionUsecase } from './saveSkillVersion.usecase';

describe('SaveSkillVersionUsecase', () => {
  let usecase: SaveSkillVersionUsecase;
  let skillVersionService: jest.Mocked<SkillVersionService>;
  let skillService: jest.Mocked<SkillService>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillVersionService = {
      addSkillVersion: jest.fn(),
      getLatestSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<SkillVersionService>;

    skillService = {
      getSkillById: jest.fn(),
      updateSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    usecase = new SaveSkillVersionUsecase(
      accountsPort,
      spacesPort,
      skillService,
      skillVersionService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save skill version', () => {
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let skillId: SkillId;
    let command: SaveSkillVersionCommand;
    let skillVersionInput: SkillVersionInput;
    let savedSkillVersion: ReturnType<typeof skillVersionFactory>;
    let latestVersion: ReturnType<typeof skillVersionFactory>;

    beforeEach(() => {
      const user = userFactory();
      const organization = organizationFactory();
      const space = spaceFactory({ organizationId: organization.id });
      userId = user.id;
      organizationId = organization.id;
      spaceId = space.id;
      skillId = createSkillId(uuidv4());

      const userWithMembership = userFactory({
        id: userId,
        memberships: [{ organizationId, role: 'member', userId }],
      });

      const skill = skillFactory({ id: skillId, spaceId, version: 1 });

      latestVersion = skillVersionFactory({
        skillId,
        version: 1,
        userId,
      });

      skillVersionInput = {
        skillId,
        userId,
        name: 'Test Skill V2',
        slug: 'test-skill',
        description: 'Test skill version 2',
        prompt: 'This is a test skill version 2 prompt',
        license: 'MIT',
        compatibility: 'All environments',
        metadata: { version: 'v2' },
        allowedTools: 'Read,Write',
      };

      command = {
        userId,
        organizationId,
        spaceId,
        skillVersion: skillVersionInput,
      };

      savedSkillVersion = skillVersionFactory({
        skillId,
        version: 2,
        userId,
        name: 'Test Skill V2',
        slug: 'test-skill',
        description: 'Test skill version 2',
        prompt: 'This is a test skill version 2 prompt',
      });

      accountsPort.getUserById.mockResolvedValue(userWithMembership);
      accountsPort.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillService.getSkillById.mockResolvedValue(skill);
      skillVersionService.getLatestSkillVersion.mockResolvedValue(
        latestVersion,
      );
      skillVersionService.addSkillVersion.mockResolvedValue(savedSkillVersion);
      skillService.updateSkill.mockResolvedValue(skill);
    });

    it('validates user exists', async () => {
      await usecase.execute(command);

      expect(accountsPort.getUserById).toHaveBeenCalledWith(userId);
    });

    it('validates organization exists', async () => {
      await usecase.execute(command);

      expect(accountsPort.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('validates space exists', async () => {
      await usecase.execute(command);

      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
    });

    it('validates skill exists', async () => {
      await usecase.execute(command);

      expect(skillService.getSkillById).toHaveBeenCalledWith(skillId);
    });

    it('gets latest skill version', async () => {
      await usecase.execute(command);

      expect(skillVersionService.getLatestSkillVersion).toHaveBeenCalledWith(
        skillId,
      );
    });

    it('saves skill version with calculated version number', async () => {
      await usecase.execute(command);

      expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith({
        skillId: skillVersionInput.skillId,
        userId: skillVersionInput.userId,
        name: skillVersionInput.name,
        slug: skillVersionInput.slug,
        description: skillVersionInput.description,
        prompt: skillVersionInput.prompt,
        allowedTools: skillVersionInput.allowedTools,
        license: skillVersionInput.license,
        compatibility: skillVersionInput.compatibility,
        metadata: skillVersionInput.metadata,
        version: 2,
      });
    });

    it('updates skill with new version and data', async () => {
      await usecase.execute(command);

      expect(skillService.updateSkill).toHaveBeenCalledWith(skillId, {
        name: skillVersionInput.name,
        slug: skillVersionInput.slug,
        description: skillVersionInput.description,
        prompt: skillVersionInput.prompt,
        allowedTools: skillVersionInput.allowedTools,
        license: skillVersionInput.license,
        compatibility: skillVersionInput.compatibility,
        metadata: skillVersionInput.metadata,
        version: 2,
        userId: skillVersionInput.userId,
      });
    });

    it('returns saved skill version', async () => {
      const result = await usecase.execute(command);

      expect(result).toEqual(savedSkillVersion);
    });

    describe('when no previous version exists', () => {
      beforeEach(() => {
        skillVersionService.getLatestSkillVersion.mockResolvedValue(null);
      });

      it('saves skill version with version 1', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            version: 1,
          }),
        );
      });

      it('updates skill with version 1', async () => {
        await usecase.execute(command);

        expect(skillService.updateSkill).toHaveBeenCalledWith(
          skillId,
          expect.objectContaining({
            version: 1,
          }),
        );
      });
    });
  });

  describe('validation errors', () => {
    describe('when space not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;

        const userWithMembership = userFactory({
          id: userId,
          memberships: [{ organizationId, role: 'member', userId }],
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId: createSkillId(uuidv4()),
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithMembership);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });
    });

    describe('when space does not belong to organization', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const otherOrganization = organizationFactory();
        const space = spaceFactory({ organizationId: otherOrganization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;

        const userWithMembership = userFactory({
          id: userId,
          memberships: [{ organizationId, role: 'member', userId }],
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId: createSkillId(uuidv4()),
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithMembership);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });
    });

    describe('when skill not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;
        skillId = createSkillId(uuidv4());

        const userWithMembership = userFactory({
          id: userId,
          memberships: [{ organizationId, role: 'member', userId }],
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId,
            version: 1,
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithMembership);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.getSkillById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Skill with id ${skillId} not found`,
        );
      });
    });

    describe('when skill does not belong to space', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        const otherSpace = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;
        skillId = createSkillId(uuidv4());

        const userWithMembership = userFactory({
          id: userId,
          memberships: [{ organizationId, role: 'member', userId }],
        });

        const skill = skillFactory({ id: skillId, spaceId: otherSpace.id });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId,
            version: 1,
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithMembership);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.getSkillById.mockResolvedValue(skill);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Skill ${skillId} does not belong to space ${spaceId}`,
        );
      });
    });
  });

  describe('authorization validation', () => {
    describe('when user not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId: createSkillId(uuidv4()),
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });
    });

    describe('when organization not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;

        const userWithMembership = userFactory({
          id: userId,
          memberships: [{ organizationId, role: 'member', userId }],
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId: createSkillId(uuidv4()),
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithMembership);
        accountsPort.getOrganizationById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });
    });

    describe('when user is not member of organization', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let command: SaveSkillVersionCommand;

      beforeEach(() => {
        const user = userFactory();
        const organization = organizationFactory();
        const otherOrganization = organizationFactory();
        const space = spaceFactory({ organizationId: organization.id });
        userId = user.id;
        organizationId = organization.id;
        spaceId = space.id;

        const userWithOtherMembership = userFactory({
          id: userId,
          memberships: [
            { organizationId: otherOrganization.id, role: 'member', userId },
          ],
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillVersion: {
            skillId: createSkillId(uuidv4()),
            userId,
            name: 'Test',
            slug: 'test',
            description: 'Test',
            prompt: 'Test',
          },
        };

        accountsPort.getUserById.mockResolvedValue(userWithOtherMembership);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });
    });
  });
});
