import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  GetSkillByIdCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  Space,
  User,
  createSkillId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { SkillService } from '../../services/SkillService';
import { GetSkillByIdUsecase } from './getSkillById.usecase';

describe('GetSkillByIdUsecase', () => {
  let usecase: GetSkillByIdUsecase;
  let skillService: jest.Mocked<SkillService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillService = {
      getSkillById: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    usecase = new GetSkillByIdUsecase(
      accountsAdapter,
      skillService,
      spacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve skill by ID', () => {
    let userId: string;
    let organizationId: string;
    let spaceId: string;
    let skillId: string;
    let user: User;
    let organization: Organization;
    let space: Space;
    let command: GetSkillByIdCommand;
    let skill: ReturnType<typeof skillFactory>;

    beforeEach(() => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      spaceId = createSpaceId(uuidv4());
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
        skillId,
      };

      skill = skillFactory({
        id: skillId,
        spaceId,
        slug: 'test-skill',
      });

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillService.getSkillById.mockResolvedValue(skill);
    });

    it('validates user exists', async () => {
      await usecase.execute(command);

      expect(accountsAdapter.getUserById).toHaveBeenCalledWith(userId);
    });

    it('validates organization exists', async () => {
      await usecase.execute(command);

      expect(accountsAdapter.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('validates space exists', async () => {
      await usecase.execute(command);

      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
    });

    it('retrieves skill by ID', async () => {
      await usecase.execute(command);

      expect(skillService.getSkillById).toHaveBeenCalledWith(skillId);
    });

    it('returns skill', async () => {
      const result = await usecase.execute(command);

      expect(result.skill).toEqual(skill);
    });

    describe('when skill not found', () => {
      beforeEach(() => {
        skillService.getSkillById.mockResolvedValue(null);
      });

      it('calls getSkillById', async () => {
        await usecase.execute(command);

        expect(skillService.getSkillById).toHaveBeenCalledWith(skillId);
      });

      it('returns null', async () => {
        const result = await usecase.execute(command);

        expect(result.skill).toBeNull();
      });
    });
  });

  describe('authorization validation', () => {
    describe('when space not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
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
          spaceId,
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });
    });

    describe('when space does not belong to organization', () => {
      let userId: string;
      let organizationId: string;
      let otherOrganizationId: string;
      let spaceId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
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
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });
    });

    describe('when skill does not belong to space', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let otherSpaceId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: GetSkillByIdCommand;
      let skill: ReturnType<typeof skillFactory>;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        otherSpaceId = createSpaceId(uuidv4());
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
          skillId,
        };

        skill = skillFactory({
          id: skillId,
          spaceId: otherSpaceId,
          slug: 'test-skill',
        });

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.getSkillById.mockResolvedValue(skill);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Skill ${skillId} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when user not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let skillId: string;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        command = {
          userId,
          organizationId,
          spaceId,
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });
    });

    describe('when organization not found', () => {
      let userId: string;
      let organizationId: string;
      let spaceId: string;
      let skillId: string;
      let user: User;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
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
          spaceId,
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });
    });

    describe('when user is not member of organization', () => {
      let userId: string;
      let organizationId: string;
      let otherOrganizationId: string;
      let spaceId: string;
      let skillId: string;
      let user: User;
      let organization: Organization;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
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
          spaceId,
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });
    });
  });
});
