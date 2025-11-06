import { ListStandardsBySpaceUsecase } from './listStandardsBySpace.usecase';
import { StandardService } from '../../services/StandardService';
import { standardFactory } from '../../../../test/standardFactory';
import { PackmindLogger } from '@packmind/logger';
import {
  UserProvider,
  OrganizationProvider,
  User,
  Organization,
} from '@packmind/types';
import {
  ListStandardsBySpaceCommand,
  ISpacesPort,
  Space,
} from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { v4 as uuidv4 } from 'uuid';

describe('ListStandardsBySpaceUsecase', () => {
  let usecase: ListStandardsBySpaceUsecase;
  let standardService: jest.Mocked<StandardService>;
  let userProvider: jest.Mocked<UserProvider>;
  let organizationProvider: jest.Mocked<OrganizationProvider>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardService = {
      listStandardsBySpace: jest.fn(),
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

    usecase = new ListStandardsBySpaceUsecase(
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

  describe('when listing standards by space', () => {
    it('returns standards from the space', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

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

      const command: ListStandardsBySpaceCommand = {
        userId,
        organizationId,
        spaceId,
      };

      const standardsInSpace = [
        standardFactory({ spaceId, slug: 'space-standard-1' }),
        standardFactory({ spaceId, slug: 'space-standard-2' }),
      ];

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.listStandardsBySpace.mockResolvedValue(standardsInSpace);

      const result = await usecase.execute(command);

      expect(userProvider.getUserById).toHaveBeenCalledWith(userId);
      expect(organizationProvider.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(standardService.listStandardsBySpace).toHaveBeenCalledWith(
        spaceId,
      );

      expect(result.standards).toHaveLength(2);
      const slugs = result.standards.map((s) => s.slug);
      expect(slugs).toContain('space-standard-1');
      expect(slugs).toContain('space-standard-2');
    });
  });

  describe('when no standards exist', () => {
    it('returns empty array', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

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

      const command: ListStandardsBySpaceCommand = {
        userId,
        organizationId,
        spaceId,
      };

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.listStandardsBySpace.mockResolvedValue([]);

      const result = await usecase.execute(command);

      expect(result.standards).toEqual([]);
    });
  });

  describe('when space validation fails', () => {
    it('throws error if space not found', async () => {
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

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

      const command: ListStandardsBySpaceCommand = {
        userId,
        organizationId,
        spaceId,
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

      const command: ListStandardsBySpaceCommand = {
        userId,
        organizationId,
        spaceId,
      };

      userProvider.getUserById.mockResolvedValue(user);
      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    });
  });
});
