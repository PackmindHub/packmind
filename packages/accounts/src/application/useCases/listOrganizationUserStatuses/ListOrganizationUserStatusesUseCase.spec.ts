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

  it('returns user statuses with accepted status for active users', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    const activeUser = userFactory({
      id: createUserId('active-user'),
      email: 'active@test.com',
      active: true,
      memberships: [
        {
          userId: createUserId('active-user'),
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

    const result = await useCase.execute(command);

    expect(result.userStatuses).toHaveLength(1);
    expect(result.userStatuses[0]).toEqual({
      userId: activeUser.id,
      email: activeUser.email,
      role: 'member',
      isActive: true,
      invitationStatus: 'accepted',
      invitationExpirationDate: undefined,
    });
  });

  it('returns user statuses with pending invitation status', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    const inactiveUser = userFactory({
      id: createUserId('inactive-user'),
      email: 'inactive@test.com',
      active: false,
      memberships: [
        {
          userId: createUserId('inactive-user'),
          organizationId,
          role: 'admin',
        },
      ],
    });

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invitation = invitationFactory({
      userId: inactiveUser.id,
      expirationDate: futureDate,
    });

    mockGetUserById.mockResolvedValue(adminUser);
    mockListUsers.mockResolvedValue([inactiveUser]);
    mockFindByUserIds.mockResolvedValue([invitation]);

    const command: ListOrganizationUserStatusesCommand = {
      userId: adminUserId,
      organizationId,
    };

    const result = await useCase.execute(command);

    expect(result.userStatuses).toHaveLength(1);
    expect(result.userStatuses[0]).toEqual({
      userId: inactiveUser.id,
      email: inactiveUser.email,
      role: 'admin',
      isActive: false,
      invitationStatus: 'pending',
      invitationExpirationDate: futureDate,
      invitationLink: `http://localhost:8081/activate?token=${encodeURIComponent(invitation.token)}`,
    });
  });

  it('returns user statuses with expired invitation status', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    const inactiveUser = userFactory({
      id: createUserId('inactive-user'),
      email: 'inactive@test.com',
      active: false,
      memberships: [
        {
          userId: createUserId('inactive-user'),
          organizationId,
          role: 'member',
        },
      ],
    });

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
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

    const result = await useCase.execute(command);

    expect(result.userStatuses).toHaveLength(1);
    expect(result.userStatuses[0]).toEqual({
      userId: inactiveUser.id,
      email: inactiveUser.email,
      role: 'member',
      isActive: false,
      invitationStatus: 'expired',
      invitationExpirationDate: pastDate,
    });
  });

  it('returns user statuses with none invitation status for inactive users without invitations', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    const inactiveUser = userFactory({
      id: createUserId('inactive-user'),
      email: 'inactive@test.com',
      active: false,
      memberships: [
        {
          userId: createUserId('inactive-user'),
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

    const result = await useCase.execute(command);

    expect(result.userStatuses).toHaveLength(1);
    expect(result.userStatuses[0]).toEqual({
      userId: inactiveUser.id,
      email: inactiveUser.email,
      role: 'member',
      isActive: false,
      invitationStatus: 'none',
      invitationExpirationDate: undefined,
    });
  });

  it('uses the latest invitation for users with multiple invitations', async () => {
    const adminUser = userFactory({
      id: adminUserId,
      memberships: [{ userId: adminUserId, organizationId, role: 'admin' }],
    });

    const inactiveUser = userFactory({
      id: createUserId('inactive-user'),
      email: 'inactive@test.com',
      active: false,
      memberships: [
        {
          userId: createUserId('inactive-user'),
          organizationId,
          role: 'member',
        },
      ],
    });

    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const oldInvitation = invitationFactory({
      userId: inactiveUser.id,
      expirationDate: oldDate,
    });

    const newInvitation = invitationFactory({
      userId: inactiveUser.id,
      expirationDate: futureDate,
    });

    mockGetUserById.mockResolvedValue(adminUser);
    mockListUsers.mockResolvedValue([inactiveUser]);
    mockFindByUserIds.mockResolvedValue([oldInvitation, newInvitation]);

    const command: ListOrganizationUserStatusesCommand = {
      userId: adminUserId,
      organizationId,
    };

    const result = await useCase.execute(command);

    expect(result.userStatuses).toHaveLength(1);
    expect(result.userStatuses[0].invitationStatus).toBe('pending');
    expect(result.userStatuses[0].invitationExpirationDate).toEqual(futureDate);
    expect(result.userStatuses[0].invitationLink).toBe(
      `http://localhost:8081/activate?token=${encodeURIComponent(newInvitation.token)}`,
    );
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
