import { createOrganizationId, createUserId } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import { createSpaceId } from '@packmind/spaces';
import { stubLogger } from '@packmind/test-utils';
import {
  GetStandardByIdCommand,
  ISpacesPort,
  Organization,
  OrganizationProvider,
  Space,
  User,
  UserProvider,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import { createStandardId } from '../../../domain/entities/Standard';
import { StandardService } from '../../services/StandardService';
import { GetStandardByIdUsecase } from './getStandardById.usecase';

describe('GetStandardByIdUsecase', () => {
  let usecase: GetStandardByIdUsecase;
  let standardService: jest.Mocked<StandardService>;
  let userProvider: jest.Mocked<UserProvider>;
  let organizationProvider: jest.Mocked<OrganizationProvider>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardService = {
      getStandardById: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    userProvider = {
      getUserById: jest.fn(),
    } as jest.Mocked<UserProvider>;

    organizationProvider = {
      getOrganizationById: jest.fn(),
    } as jest.Mocked<OrganizationProvider>;

    spacesPort = {
      getSpaceById: jest.fn(),
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    usecase = new GetStandardByIdUsecase(
      userProvider,
      organizationProvider,
      standardService,
      spacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve standard by ID', () => {
    it('returns standard that belongs to the user organization and space', async () => {
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.getStandardById.mockResolvedValue(standard);

      const result = await usecase.execute(command);

      expect(userProvider.getUserById).toHaveBeenCalledWith(userId);
      expect(organizationProvider.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      expect(standardService.getStandardById).toHaveBeenCalledWith(standardId);

      expect(result.standard).toEqual(standard);
    });

    it('returns null if standard not found', async () => {
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.getStandardById.mockResolvedValue(null);

      const result = await usecase.execute(command);

      expect(standardService.getStandardById).toHaveBeenCalledWith(standardId);
      expect(result.standard).toBeNull();
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

      // Standard belongs to the same space
      const standard = standardFactory({
        id: standardId,
        spaceId,
        slug: 'test-standard',
      });

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
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

      userProvider.getUserById.mockResolvedValue(null);

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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(null);

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

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);

      await expect(usecase.execute(command)).rejects.toThrow(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    });
  });
});
