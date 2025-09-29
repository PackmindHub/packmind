import { ListOrganizationUserStatusesUseCase } from './ListOrganizationUserStatusesUseCase';
import { ListOrganizationUserStatusesCommand } from '../../../domain/useCases/IListOrganizationUserStatusesUseCase';
import { DataSource } from 'typeorm';
import { stubLogger } from '@packmind/shared/test';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';
import { userFactory } from '../../../../test/userFactory';
import { invitationFactory } from '../../../../test/invitationFactory';

jest.mock('../../services/EnhancedAccountsServices');

describe('ListOrganizationUserStatusesUseCase', () => {
  let useCase: ListOrganizationUserStatusesUseCase;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockGetUserById: jest.Mock;
  let mockListUsers: jest.Mock;
  let mockFindByUserIds: jest.Mock;

  const adminUserId = createUserId('admin-user');
  const organizationId = createOrganizationId('test-org');

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
      }),
    } as unknown as jest.Mocked<DataSource>;
    mockGetUserById = jest.fn();
    mockListUsers = jest.fn();
    mockFindByUserIds = jest.fn();

    const EnhancedAccountsServices = jest.requireMock(
      '../../services/EnhancedAccountsServices',
    ).EnhancedAccountsServices;
    EnhancedAccountsServices.mockImplementation(() => ({
      getUserService: () => ({
        getUserById: mockGetUserById,
        listUsers: mockListUsers,
      }),
      getInvitationService: () => ({
        findByUserIds: mockFindByUserIds,
      }),
    }));

    mockLogger = stubLogger();

    useCase = new ListOrganizationUserStatusesUseCase(
      mockDataSource,
      mockLogger,
    );
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
      'User must be an admin to perform this action',
    );
  });
});
