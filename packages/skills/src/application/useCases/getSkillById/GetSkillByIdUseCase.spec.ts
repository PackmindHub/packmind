import { PackmindLogger } from '@packmind/logger';
import { userFactory } from '@packmind/accounts/test';
import { spaceFactory } from '@packmind/spaces/test';
import {
  SpaceMembershipRequiredError,
  UserNotFoundError,
  UserNotInOrganizationError,
} from '@packmind/node-utils';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createUserId,
  GetSkillByIdCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  SkillId,
  Space,
  SpaceId,
  User,
  UserId,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { SkillService } from '../../services/SkillService';
import { GetSkillByIdUseCase } from './GetSkillByIdUseCase';

describe('GetSkillByIdUseCase', () => {
  let usecase: GetSkillByIdUseCase;
  let skillService: jest.Mocked<SkillService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillService = {
      getSkillById: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    accountsAdapter = mockInterface<IAccountsPort>();

    spacesPort = mockInterface<ISpacesPort>();
    spacesPort.findMembership.mockResolvedValue({
      userId: createUserId('00000000-0000-0000-0000-000000000001'),
      spaceId: createSpaceId('00000000-0000-0000-0000-000000000002'),
      role: UserSpaceRole.MEMBER,
      createdBy: createUserId('00000000-0000-0000-0000-000000000001'),
      updatedBy: createUserId('00000000-0000-0000-0000-000000000001'),
      pinned: false,
    });

    stubbedLogger = stubLogger();

    usecase = new GetSkillByIdUseCase(
      spacesPort,
      accountsAdapter,
      skillService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve skill by ID', () => {
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let skillId: SkillId;
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

      user = userFactory({
        id: userId,
        email: 'test@example.com',
        memberships: [{ organizationId, role: 'member', userId }],
      });
      organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };
      space = spaceFactory({
        id: spaceId,
        organizationId,
      });

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
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let user: User;
      let organization: Organization;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });
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
      let userId: UserId;
      let organizationId: OrganizationId;
      let otherOrganizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
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

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = spaceFactory({
          id: spaceId,
          organizationId: otherOrganizationId,
        });

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
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let otherSpaceId: SpaceId;
      let skillId: SkillId;
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

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = spaceFactory({
          id: spaceId,
          organizationId,
        });

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
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
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
        await expect(usecase.execute(command)).rejects.toBeInstanceOf(
          UserNotFoundError,
        );
      });
    });

    describe('when organization not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let user: User;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });

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
      let userId: UserId;
      let organizationId: OrganizationId;
      let otherOrganizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let user: User;
      let organization: Organization;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [
            { organizationId: otherOrganizationId, role: 'member', userId },
          ],
        });
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
        await expect(usecase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
      });
    });

    describe('when user is not a member of the space', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let skillId: SkillId;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: GetSkillByIdCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        skillId = createSkillId(uuidv4());

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        space = spaceFactory({
          id: spaceId,
          organizationId,
        });

        command = {
          userId,
          organizationId,
          spaceId,
          skillId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        spacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
