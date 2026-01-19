import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ListOrganizationUserStatusesCommand,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { invitationFactory } from '../../../../test/invitationFactory';
import { OrganizationAdminRequiredError } from '../../../domain/errors';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import { ListOrganizationUserStatusesUseCase } from './ListOrganizationUserStatusesUseCase';
import { Configuration } from '@packmind/node-utils';

describe('ListOrganizationUserStatusesUseCase', () => {
  let useCase: ListOrganizationUserStatusesUseCase;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockListUsers: jest.Mock;
  let mockFindByUserIds: jest.Mock;
  let userService: jest.Mocked<UserService>;
  let invitationService: jest.Mocked<InvitationService>;

  const adminUserId = createUserId('admin-user');
  const organizationId = createOrganizationId('test-org');

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockListUsers = jest.fn();
    mockFindByUserIds = jest.fn();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    userService = {
      getUserById: mockGetUserById,
      listUsers: mockListUsers,
    } as unknown as jest.Mocked<UserService>;

    invitationService = {
      findByUserIds: mockFindByUserIds,
    } as unknown as jest.Mocked<InvitationService>;

    mockLogger = stubLogger();

    // Mock Configuration.getConfig to return consistent test value
    jest
      .spyOn(Configuration, 'getConfig')
      .mockResolvedValue('http://localhost:8081');

    const organization = organizationFactory({ id: organizationId });
    mockGetOrganizationById.mockResolvedValue(organization);

    useCase = new ListOrganizationUserStatusesUseCase(
      accountsPort,
      userService,
      invitationService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array for organization with no users', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    mockGetUserById.mockResolvedValue(adminUser);
    mockListUsers.mockResolvedValue([]);
    mockFindByUserIds.mockResolvedValue([]);

    const command: ListOrganizationUserStatusesCommand = {
      userId: adminUserId,
      organizationId,
    };

    const result = await useCase.execute(command);

    expect(result.userStatuses).toEqual([]);
  });

  describe('when user is active', () => {
    const activeUserId = createUserId('active-user');
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const adminUser = userFactory({
        id: adminUserId,
        memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
      });

      const activeUser = userFactory({
        id: activeUserId,
        email: 'active@test.com',
        active: true,
        memberships: [
          {
            userId: activeUserId,
            organizationId,
            role: 'member',
          },
        ],
      });

      mockGetUserById.mockResolvedValue(adminUser);
      mockListUsers.mockResolvedValue([activeUser]);
      mockFindByUserIds.mockResolvedValue([]);

      const command: ListOrganizationUserStatusesCommand = {
        userId: adminUserId,
        organizationId,
      };

      result = await useCase.execute(command);
    });

    it('returns accepted invitation status', () => {
      expect(result.userStatuses[0]).toEqual({
        userId: activeUserId,
        email: 'active@test.com',
        role: 'member',
        isActive: true,
        invitationStatus: 'accepted',
        invitationExpirationDate: undefined,
      });
    });
  });

  describe('when user has pending invitation', () => {
    const inactiveUserId = createUserId('inactive-user');
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let invitationToken: string;

    beforeEach(async () => {
      const adminUser = userFactory({
        id: adminUserId,
        memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
      });

      const inactiveUser = userFactory({
        id: inactiveUserId,
        email: 'inactive@test.com',
        active: false,
        memberships: [
          {
            userId: inactiveUserId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      const invitation = invitationFactory({
        userId: inactiveUser.id,
        expirationDate: futureDate,
      });
      invitationToken = invitation.token;

      mockGetUserById.mockResolvedValue(adminUser);
      mockListUsers.mockResolvedValue([inactiveUser]);
      mockFindByUserIds.mockResolvedValue([invitation]);

      const command: ListOrganizationUserStatusesCommand = {
        userId: adminUserId,
        organizationId,
      };

      result = await useCase.execute(command);
    });

    it('returns pending invitation status with invitation link', () => {
      expect(result.userStatuses[0]).toEqual({
        userId: inactiveUserId,
        email: 'inactive@test.com',
        role: 'admin',
        isActive: false,
        invitationStatus: 'pending',
        invitationExpirationDate: futureDate,
        invitationLink: `http://localhost:8081/activate?token=${encodeURIComponent(invitationToken)}`,
      });
    });
  });

  describe('when user has expired invitation', () => {
    const inactiveUserId = createUserId('inactive-user');
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const adminUser = userFactory({
        id: adminUserId,
        memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
      });

      const inactiveUser = userFactory({
        id: inactiveUserId,
        email: 'inactive@test.com',
        active: false,
        memberships: [
          {
            userId: inactiveUserId,
            organizationId,
            role: 'member',
          },
        ],
      });

      const invitation = invitationFactory({
        userId: inactiveUser.id,
        expirationDate: pastDate,
      });

      mockGetUserById.mockResolvedValue(adminUser);
      mockListUsers.mockResolvedValue([inactiveUser]);
      mockFindByUserIds.mockResolvedValue([invitation]);

      const command: ListOrganizationUserStatusesCommand = {
        userId: adminUserId,
        organizationId,
      };

      result = await useCase.execute(command);
    });

    it('returns expired invitation status without invitation link', () => {
      expect(result.userStatuses[0]).toEqual({
        userId: inactiveUserId,
        email: 'inactive@test.com',
        role: 'member',
        isActive: false,
        invitationStatus: 'expired',
        invitationExpirationDate: pastDate,
      });
    });
  });

  describe('when user is inactive without invitation', () => {
    const inactiveUserId = createUserId('inactive-user');
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const adminUser = userFactory({
        id: adminUserId,
        memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
      });

      const inactiveUser = userFactory({
        id: inactiveUserId,
        email: 'inactive@test.com',
        active: false,
        memberships: [
          {
            userId: inactiveUserId,
            organizationId,
            role: 'member',
          },
        ],
      });

      mockGetUserById.mockResolvedValue(adminUser);
      mockListUsers.mockResolvedValue([inactiveUser]);
      mockFindByUserIds.mockResolvedValue([]);

      const command: ListOrganizationUserStatusesCommand = {
        userId: adminUserId,
        organizationId,
      };

      result = await useCase.execute(command);
    });

    it('returns none invitation status', () => {
      expect(result.userStatuses[0]).toEqual({
        userId: inactiveUserId,
        email: 'inactive@test.com',
        role: 'member',
        isActive: false,
        invitationStatus: 'none',
        invitationExpirationDate: undefined,
      });
    });
  });

  describe('when user has multiple invitations', () => {
    const inactiveUserId = createUserId('inactive-user');
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let newInvitationToken: string;

    beforeEach(async () => {
      const adminUser = userFactory({
        id: adminUserId,
        memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
      });

      const inactiveUser = userFactory({
        id: inactiveUserId,
        email: 'inactive@test.com',
        active: false,
        memberships: [
          {
            userId: inactiveUserId,
            organizationId,
            role: 'member',
          },
        ],
      });

      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const oldInvitation = invitationFactory({
        userId: inactiveUser.id,
        expirationDate: oldDate,
      });

      const newInvitation = invitationFactory({
        userId: inactiveUser.id,
        expirationDate: futureDate,
      });
      newInvitationToken = newInvitation.token;

      mockGetUserById.mockResolvedValue(adminUser);
      mockListUsers.mockResolvedValue([inactiveUser]);
      mockFindByUserIds.mockResolvedValue([oldInvitation, newInvitation]);

      const command: ListOrganizationUserStatusesCommand = {
        userId: adminUserId,
        organizationId,
      };

      result = await useCase.execute(command);
    });

    it('uses the latest invitation', () => {
      expect(result.userStatuses[0]).toMatchObject({
        invitationStatus: 'pending',
        invitationExpirationDate: futureDate,
        invitationLink: `http://localhost:8081/activate?token=${encodeURIComponent(newInvitationToken)}`,
      });
    });
  });

  it('throws error for non-admin users', async () => {
    const nonAdminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'member' }],
    });

    mockGetUserById.mockResolvedValue(nonAdminUser);

    const command: ListOrganizationUserStatusesCommand = {
      userId: adminUserId,
      organizationId,
    };

    await expect(useCase.execute(command)).rejects.toThrow(
      OrganizationAdminRequiredError,
    );
  });
});
