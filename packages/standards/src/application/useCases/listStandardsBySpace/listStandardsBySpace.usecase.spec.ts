import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  ListStandardsBySpaceCommand,
  Organization,
  Space,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import { StandardService } from '../../services/StandardService';
import { ListStandardsBySpaceUsecase } from './listStandardsBySpace.usecase';

describe('ListStandardsBySpaceUsecase', () => {
  let usecase: ListStandardsBySpaceUsecase;
  let standardService: jest.Mocked<StandardService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardService = {
      listStandardsBySpace: jest.fn(),
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

    usecase = new ListStandardsBySpaceUsecase(
      accountsAdapter,
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

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardService.listStandardsBySpace.mockResolvedValue(standardsInSpace);

      const result = await usecase.execute(command);

      expect(accountsAdapter.getUserById).toHaveBeenCalledWith(userId);
      expect(accountsAdapter.getOrganizationById).toHaveBeenCalledWith(
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

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
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

      accountsAdapter.getUserById.mockResolvedValue(user);
      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    });
  });
});
