import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  GetStandardByIdCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  Space,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import { createStandardId } from '@packmind/types';
import { StandardService } from '../../services/StandardService';
import { GetStandardByIdUsecase } from './getStandardById.usecase';

describe('GetStandardByIdUsecase', () => {
  let usecase: GetStandardByIdUsecase;
  let standardService: jest.Mocked<StandardService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardService = {
      getStandardById: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

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

    usecase = new GetStandardByIdUsecase(
      accountsAdapter,
      standardService,
      spacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve standard by ID', () => {
    describe('when standard belongs to user organization and space', () => {
      let userId: ReturnType<typeof createUserId>;
      let organizationId: ReturnType<typeof createOrganizationId>;
      let spaceId: ReturnType<typeof createSpaceId>;
      let standardId: ReturnType<typeof createStandardId>;
      let standard: ReturnType<typeof standardFactory>;
      let result: Awaited<ReturnType<typeof usecase.execute>>;

      beforeEach(async () => {
        userId = createUserId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        spaceId = createSpaceId(uuidv4());
        standardId = createStandardId(uuidv4());

        const user: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
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

        const command: GetStandardByIdCommand = {
          userId,
          organizationId,
          spaceId,
          standardId,
        };

        standard = standardFactory({
          id: standardId,
          spaceId,
          slug: 'test-standard',
        });

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        standardService.getStandardById.mockResolvedValue(standard);

        result = await usecase.execute(command);
      });

      it('calls getUserById with correct userId', () => {
        expect(accountsAdapter.getUserById).toHaveBeenCalledWith(userId);
      });

      it('calls getOrganizationById with correct organizationId', () => {
        expect(accountsAdapter.getOrganizationById).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('calls getSpaceById with correct spaceId', () => {
        expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('calls getStandardById with correct standardId', () => {
        expect(standardService.getStandardById).toHaveBeenCalledWith(
          standardId,
        );
      });

      it('returns the standard', () => {
        expect(result.standard).toEqual(standard);
      });
    });

    describe('when standard not found', () => {
      let standardId: ReturnType<typeof createStandardId>;
      let result: Awaited<ReturnType<typeof usecase.execute>>;

      beforeEach(async () => {
        const userId = createUserId(uuidv4());
        const organizationId = createOrganizationId(uuidv4());
        const spaceId = createSpaceId(uuidv4());
        standardId = createStandardId(uuidv4());

        const user: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          memberships: [{ organizationId, role: 'member', userId }],
          active: true,
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

        const command: GetStandardByIdCommand = {
          userId,
          organizationId,
          spaceId,
          standardId,
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        spacesPort.getSpaceById.mockResolvedValue(space);
        standardService.getStandardById.mockResolvedValue(null);

        result = await usecase.execute(command);
      });

      it('calls getStandardById with correct standardId', () => {
        expect(standardService.getStandardById).toHaveBeenCalledWith(
          standardId,
        );
      });

      it('returns null standard', () => {
        expect(result.standard).toBeNull();
      });
    });

    it('returns space-specific standard accessible from its space', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
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

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      const standard = standardFactory({
        id: standardId,
        spaceId,
        slug: 'test-standard',
      });

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.getStandardById.mockResolvedValue(standard);

      const result = await usecase.execute(command);

      expect(result.standard).toEqual(standard);
    });
  });

  describe('authorization validation', () => {
    it('throws error if space not found', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
      };
      const organization: Organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(null);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space with id ${spaceId} not found`,
      );
    });

    it('throws error if space does not belong to organization', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const otherOrganizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
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
        organizationId: otherOrganizationId, // Different organization
      };

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    });

    it('throws error if standard does not belong to organization', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const otherOrganizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
      };
      const organization: Organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };
      // Space belongs to a different organization
      const space: Space = {
        id: spaceId,
        name: 'Test Space',
        slug: 'test-space',
        organizationId: otherOrganizationId,
      };

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      const standard = standardFactory({
        id: standardId,
        spaceId,
        slug: 'test-standard',
      });

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.getStandardById.mockResolvedValue(standard);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    });

    it('throws error if standard does not belong to space', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const otherSpaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
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

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      const standard = standardFactory({
        id: standardId,
        spaceId: otherSpaceId, // Different space
        slug: 'test-standard',
      });

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.getStandardById.mockResolvedValue(standard);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Standard ${standardId} does not belong to space ${spaceId}`,
      );
    });

    it('throws error if user not found', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      accountsAdapter.getUserById.mockResolvedValue(null);

      await expect(usecase.execute(command)).rejects.toThrow(
        `User not found: ${userId}`,
      );
    });

    it('throws error if organization not found', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
      };

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(null);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Organization ${organizationId} not found`,
      );
    });

    it('throws error if user is not member of organization', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const otherOrganizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardId = createStandardId(uuidv4());

      const user: User = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [
          { organizationId: otherOrganizationId, role: 'member', userId },
        ],
        active: true,
      };
      const organization: Organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };

      const command: GetStandardByIdCommand = {
        userId,
        organizationId,
        spaceId,
        standardId,
      };

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);

      await expect(usecase.execute(command)).rejects.toThrow(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    });
  });
});
