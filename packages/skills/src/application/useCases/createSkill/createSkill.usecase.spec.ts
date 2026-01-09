import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateSkillCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  Space,
  User,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { CreateSkillUsecase } from './createSkill.usecase';

describe('CreateSkillUsecase', () => {
  let usecase: CreateSkillUsecase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let skillService: jest.Mocked<SkillService>;
  let skillVersionService: jest.Mocked<SkillVersionService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    skillService = {
      addSkill: jest.fn(),
      listSkillsBySpace: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    skillVersionService = {
      addSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<SkillVersionService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    usecase = new CreateSkillUsecase(
      accountsPort,
      spacesPort,
      skillService,
      skillVersionService,
      eventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create skill', () => {
    describe('with unique slug in space', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: CreateSkillCommand;
      let createdSkill: ReturnType<typeof skillFactory>;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
        };
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
          allowedTools: 'Read,Write',
          license: 'MIT',
          compatibility: 'All environments',
          metadata: { category: 'test' },
        };

        createdSkill = skillFactory({
          name: command.name,
          description: command.description,
          slug: 'test-skill',
          spaceId,
          userId,
          version: 1,
          prompt: command.prompt,
          allowedTools: command.allowedTools,
          license: command.license,
          compatibility: command.compatibility,
          metadata: command.metadata,
        });

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.listSkillsBySpace.mockResolvedValue([]);
        skillService.addSkill.mockResolvedValue(createdSkill);
        skillVersionService.addSkillVersion.mockResolvedValue(
          undefined as unknown as never,
        );
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

      it('lists existing skills in space', async () => {
        await usecase.execute(command);

        expect(skillService.listSkillsBySpace).toHaveBeenCalledWith(spaceId);
      });

      it('creates skill with correct attributes', async () => {
        await usecase.execute(command);

        expect(skillService.addSkill).toHaveBeenCalledWith({
          name: command.name,
          description: command.description,
          slug: 'test-skill',
          version: 1,
          prompt: command.prompt,
          userId,
          spaceId,
          allowedTools: command.allowedTools,
          license: command.license,
          compatibility: command.compatibility,
          metadata: command.metadata,
        });
      });

      it('creates skill version with correct attributes', async () => {
        await usecase.execute(command);

        expect(skillVersionService.addSkillVersion).toHaveBeenCalledWith({
          skillId: createdSkill.id,
          name: command.name,
          slug: 'test-skill',
          description: command.description,
          version: 1,
          prompt: command.prompt,
          userId,
          allowedTools: command.allowedTools,
          license: command.license,
          compatibility: command.compatibility,
          metadata: command.metadata,
        });
      });

      it('emits SkillCreatedEvent with fileCount zero', async () => {
        await usecase.execute(command);

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              skillId: createdSkill.id,
              spaceId,
              organizationId,
              userId,
              source: 'ui',
              fileCount: 0,
            }),
          }),
        );
      });

      it('returns created skill', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual(createdSkill);
      });
    });

    describe('when slug exists', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: CreateSkillCommand;
      let existingSkill1: ReturnType<typeof skillFactory>;
      let existingSkill2: ReturnType<typeof skillFactory>;
      let createdSkill: ReturnType<typeof skillFactory>;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
        };
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        existingSkill1 = skillFactory({ slug: 'test-skill' });
        existingSkill2 = skillFactory({ slug: 'test-skill-1' });

        createdSkill = skillFactory({
          name: command.name,
          description: command.description,
          slug: 'test-skill-2',
          spaceId,
          userId,
        });

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.listSkillsBySpace.mockResolvedValue([
          existingSkill1,
          existingSkill2,
        ]);
        skillService.addSkill.mockResolvedValue(createdSkill);
        skillVersionService.addSkillVersion.mockResolvedValue(
          undefined as unknown as never,
        );
      });

      it('creates skill with incremented slug', async () => {
        await usecase.execute(command);

        expect(skillService.addSkill).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'test-skill-2',
          }),
        );
      });

      it('returns created skill', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual(createdSkill);
      });
    });
  });

  describe('authorization validation', () => {
    describe('when space not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let command: CreateSkillCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
        };
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });

      it('does not call addSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.addSkill).not.toHaveBeenCalled();
      });

      it('does not call addSkillVersion', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });

    describe('when space does not belong to organization', () => {
      let userId: string;
      let organizationId: string;
      let otherOrganizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: CreateSkillCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
        };
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId: otherOrganizationId,
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });

      it('does not call addSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.addSkill).not.toHaveBeenCalled();
      });

      it('does not call addSkillVersion', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });

    describe('when user not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let command: CreateSkillCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        accountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });

      it('does not call getSpaceById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(spacesPort.getSpaceById).not.toHaveBeenCalled();
      });

      it('does not call addSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.addSkill).not.toHaveBeenCalled();
      });

      it('does not call addSkillVersion', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });

    describe('when organization not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let command: CreateSkillCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });

      it('does not call getSpaceById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(spacesPort.getSpaceById).not.toHaveBeenCalled();
      });

      it('does not call addSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.addSkill).not.toHaveBeenCalled();
      });

      it('does not call addSkillVersion', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });

    describe('when user is not member of organization', () => {
      let userId: string;
      let organizationId: string;
      let otherOrganizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let command: CreateSkillCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());

        user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [
            { organizationId: otherOrganizationId, role: 'member', userId },
          ],
          active: true,
        };
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'Test Skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });

      it('does not call getSpaceById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(spacesPort.getSpaceById).not.toHaveBeenCalled();
      });

      it('does not call addSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.addSkill).not.toHaveBeenCalled();
      });

      it('does not call addSkillVersion', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillVersionService.addSkillVersion).not.toHaveBeenCalled();
      });
    });
  });
});
