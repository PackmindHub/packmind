import { PackmindLogger } from '@packmind/logger';
import { userFactory } from '@packmind/accounts/test';
import { spaceFactory } from '@packmind/spaces/test';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  FindSkillBySlugCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  Space,
  SpaceId,
  User,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillFactory } from '../../../../test/skillFactory';
import { SkillService } from '../../services/SkillService';
import { FindSkillBySlugUseCase } from './FindSkillBySlugUseCase';

describe('FindSkillBySlugUseCase', () => {
  let usecase: FindSkillBySlugUseCase;
  let skillService: jest.Mocked<SkillService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillService = {
      findSkillBySlug: jest.fn(),
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
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    usecase = new FindSkillBySlugUseCase(
      accountsAdapter,
      skillService,
      spacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve skill by slug', () => {
    describe('when spaceId is not provided', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let slug: string;
      let user: User;
      let organization: Organization;
      let command: FindSkillBySlugCommand;
      let skill: ReturnType<typeof skillFactory>;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        slug = 'test-skill';

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
          slug,
        };

        skill = skillFactory({
          spaceId,
          slug,
        });

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        skillService.findSkillBySlug.mockResolvedValue(skill);
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

      it('does not validate space', async () => {
        await usecase.execute(command);

        expect(spacesPort.getSpaceById).not.toHaveBeenCalled();
      });

      it('finds skill by slug', async () => {
        await usecase.execute(command);

        expect(skillService.findSkillBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
        );
      });

      it('returns skill', async () => {
        const result = await usecase.execute(command);

        expect(result.skill).toEqual(skill);
      });

      describe('when skill not found', () => {
        beforeEach(() => {
          skillService.findSkillBySlug.mockResolvedValue(null);
        });

        it('calls findSkillBySlug', async () => {
          await usecase.execute(command);

          expect(skillService.findSkillBySlug).toHaveBeenCalledWith(
            slug,
            organizationId,
          );
        });

        it('returns null', async () => {
          const result = await usecase.execute(command);

          expect(result.skill).toBeNull();
        });
      });
    });

    describe('when spaceId is provided', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let spaceId: SpaceId;
      let slug: string;
      let user: User;
      let organization: Organization;
      let space: Space;
      let command: FindSkillBySlugCommand & { spaceId: string };
      let skill: ReturnType<typeof skillFactory>;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        slug = 'test-skill';

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
          slug,
          spaceId,
        } as FindSkillBySlugCommand & { spaceId: string };

        skill = skillFactory({
          spaceId,
          slug,
        });

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        skillService.findSkillBySlug.mockResolvedValue(skill);
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

      it('finds skill by slug', async () => {
        await usecase.execute(command);

        expect(skillService.findSkillBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
        );
      });

      it('returns skill', async () => {
        const result = await usecase.execute(command);

        expect(result.skill).toEqual(skill);
      });
    });
  });

  describe('authorization validation', () => {
    describe('when spaceId is provided', () => {
      describe('when space not found', () => {
        let userId: UserId;
        let organizationId: OrganizationId;
        let spaceId: SpaceId;
        let slug: string;
        let user: User;
        let organization: Organization;
        let command: FindSkillBySlugCommand & { spaceId: string };

        beforeEach(() => {
          userId = createUserId(uuidv4());
          organizationId = createOrganizationId(uuidv4());
          spaceId = createSpaceId(uuidv4());
          slug = 'test-skill';

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
            slug,
            spaceId,
          } as FindSkillBySlugCommand & { spaceId: string };

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
        let slug: string;
        let user: User;
        let organization: Organization;
        let space: Space;
        let command: FindSkillBySlugCommand & { spaceId: string };

        beforeEach(() => {
          userId = createUserId(uuidv4());
          organizationId = createOrganizationId(uuidv4());
          otherOrganizationId = createOrganizationId(uuidv4());
          spaceId = createSpaceId(uuidv4());
          slug = 'test-skill';

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
            slug,
            spaceId,
          } as FindSkillBySlugCommand & { spaceId: string };

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
    });

    describe('when user not found', () => {
      let userId: UserId;
      let organizationId: OrganizationId;
      let slug: string;
      let command: FindSkillBySlugCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        slug = 'test-skill';

        command = {
          userId,
          organizationId,
          slug,
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
      let userId: UserId;
      let organizationId: OrganizationId;
      let slug: string;
      let user: User;
      let command: FindSkillBySlugCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        slug = 'test-skill';

        user = userFactory({
          id: userId,
          email: 'test@example.com',
          memberships: [{ organizationId, role: 'member', userId }],
        });

        command = {
          userId,
          organizationId,
          slug,
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
      let slug: string;
      let user: User;
      let organization: Organization;
      let command: FindSkillBySlugCommand;

      beforeEach(() => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        otherOrganizationId = createOrganizationId(uuidv4());
        slug = 'test-skill';

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
          slug,
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
