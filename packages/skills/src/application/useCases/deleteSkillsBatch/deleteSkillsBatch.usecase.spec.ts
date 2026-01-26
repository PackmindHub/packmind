import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  DeleteSkillsBatchCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  Space,
  User,
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { SkillService } from '../../services/SkillService';
import { DeleteSkillsBatchUsecase } from './deleteSkillsBatch.usecase';

describe('DeleteSkillsBatchUsecase', () => {
  let usecase: DeleteSkillsBatchUsecase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let skillService: jest.Mocked<SkillService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    skillService = {
      getSkillById: jest.fn(),
      deleteSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    usecase = new DeleteSkillsBatchUsecase(
      accountsPort,
      spacesPort,
      skillService,
      eventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delete skills batch', () => {
    describe('with valid skills', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: DeleteSkillsBatchCommand;
      let skill1: ReturnType<typeof skillFactory>;
      let skill2: ReturnType<typeof skillFactory>;

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

        skill1 = skillFactory({ spaceId });
        skill2 = skillFactory({ spaceId });

        command = {
          userId,
          organizationId,
          skillIds: [skill1.id, skill2.id],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.getSkillById.mockImplementation((id) => {
          if (id === skill1.id) return Promise.resolve(skill1);
          if (id === skill2.id) return Promise.resolve(skill2);
          return Promise.resolve(null);
        });
        skillService.deleteSkill.mockResolvedValue(undefined);
      });

      it('retrieves first skill by ID', async () => {
        await usecase.execute(command);

        expect(skillService.getSkillById).toHaveBeenCalledWith(skill1.id);
      });

      it('retrieves second skill by ID', async () => {
        await usecase.execute(command);

        expect(skillService.getSkillById).toHaveBeenCalledWith(skill2.id);
      });

      it('validates each skill space belongs to organization', async () => {
        await usecase.execute(command);

        expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('deletes first skill', async () => {
        await usecase.execute(command);

        expect(skillService.deleteSkill).toHaveBeenCalledWith(
          skill1.id,
          userId,
        );
      });

      it('deletes second skill', async () => {
        await usecase.execute(command);

        expect(skillService.deleteSkill).toHaveBeenCalledWith(
          skill2.id,
          userId,
        );
      });

      it('emits two SkillDeletedEvents', async () => {
        await usecase.execute(command);

        expect(eventEmitterService.emit).toHaveBeenCalledTimes(2);
      });

      it('returns success', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual({ success: true });
      });
    });

    describe('with empty skill list', () => {
      let userId: string;
      let organizationId: string;
      let user: User;
      let organization: Organization;
      let command: DeleteSkillsBatchCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());

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
          skillIds: [],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
      });

      it('returns success without processing', async () => {
        const result = await usecase.execute(command);

        expect(result).toEqual({ success: true });
      });

      it('does not call skillService.getSkillById', async () => {
        await usecase.execute(command);

        expect(skillService.getSkillById).not.toHaveBeenCalled();
      });

      it('does not call skillService.deleteSkill', async () => {
        await usecase.execute(command);

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });

      it('does not emit events', async () => {
        await usecase.execute(command);

        expect(eventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });

  describe('authorization validation', () => {
    describe('when skill not found', () => {
      let userId: string;
      let organizationId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let command: DeleteSkillsBatchCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        skillId = createSkillId(uuidv4());

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
          skillIds: [skillId],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        skillService.getSkillById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Skill with id ${skillId} not found`,
        );
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });
    });

    describe('when space not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let user: User;
      let organization: Organization;
      let command: DeleteSkillsBatchCommand;
      let skill: ReturnType<typeof skillFactory>;

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

        skill = skillFactory({ spaceId });

        command = {
          userId,
          organizationId,
          skillIds: [skill.id],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        skillService.getSkillById.mockResolvedValue(skill);
        spacesPort.getSpaceById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
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
      let command: DeleteSkillsBatchCommand;
      let skill: ReturnType<typeof skillFactory>;

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

        skill = skillFactory({ spaceId });

        command = {
          userId,
          organizationId,
          skillIds: [skill.id],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
        skillService.getSkillById.mockResolvedValue(skill);
        spacesPort.getSpaceById.mockResolvedValue(space);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });
    });

    describe('when user not found', () => {
      let userId: string;
      let organizationId: string;
      let skillId: string;
      let command: DeleteSkillsBatchCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        skillId = createSkillId(uuidv4());

        command = {
          userId,
          organizationId,
          skillIds: [skillId],
        };

        accountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });

      it('does not call getSkillById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.getSkillById).not.toHaveBeenCalled();
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });
    });

    describe('when organization not found', () => {
      let userId: string;
      let organizationId: string;
      let skillId: string;
      let user: User;
      let command: DeleteSkillsBatchCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        skillId = createSkillId(uuidv4());

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
          skillIds: [skillId],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });

      it('does not call getSkillById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.getSkillById).not.toHaveBeenCalled();
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });
    });

    describe('when user is not member of organization', () => {
      let userId: string;
      let organizationId: string;
      let otherOrganizationId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let command: DeleteSkillsBatchCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        skillId = createSkillId(uuidv4());

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
          skillIds: [skillId],
        };

        accountsPort.getUserById.mockResolvedValue(user);
        accountsPort.getOrganizationById.mockResolvedValue(organization);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });

      it('does not call getSkillById', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.getSkillById).not.toHaveBeenCalled();
      });

      it('does not call deleteSkill', async () => {
        try {
          await usecase.execute(command);
        } catch {
          // Expected error
        }

        expect(skillService.deleteSkill).not.toHaveBeenCalled();
      });
    });
  });
});
