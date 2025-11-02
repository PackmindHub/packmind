import { CreateInvitationsUseCase } from './CreateInvitationsUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  InvitationCreationRequest,
  InvitationCreationRecord,
  InvitationService,
} from '../../services/InvitationService';
import {
  createOrganizationId,
  Organization,
} from '../../../domain/entities/Organization';
import { CreateInvitationsCommand } from '@packmind/shared';
import { InvitationBatchEmptyError } from '../../../domain/errors';
import { UserNotFoundError } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import {
  organizationFactory,
  userFactory,
  invitationFactory,
} from '../../../../test';
import { createUserId, User } from '../../../domain/entities/User';

describe('CreateInvitationsUseCase', () => {
  let useCase: CreateInvitationsUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockInvitationService: jest.Mocked<InvitationService>;
  let organization: Organization;
  const organizationId = createOrganizationId('org-123');
  const inviter = userFactory({
    id: createUserId('user-1'),
    email: 'admin@packmind.com',
    memberships: [
      {
        userId: createUserId('user-1'),
        organizationId: createOrganizationId('org-123'),
        role: 'admin',
      },
    ],
  });

  beforeEach(() => {
    mockUserService = {
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      getUserByEmailCaseInsensitive: jest.fn(),
      createUser: jest.fn(),
      createInactiveUser: jest.fn(),
      addOrganizationMembership: jest.fn(),
      hashPassword: jest.fn(),
      listUsers: jest.fn(),
      validatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockOrganizationService = {
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn(),
      getOrganizationBySlug: jest.fn(),
      listOrganizations: jest.fn(),
      createOrganization: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    mockInvitationService = {
      createInvitations: jest.fn(),
      findLatestByUserId: jest.fn(),
      resendInvitationEmail: jest.fn(),
      createInvitationForExistingUser: jest.fn(),
    } as unknown as jest.Mocked<InvitationService>;

    mockInvitationService.createInvitations.mockResolvedValue([]);
    mockInvitationService.findLatestByUserId.mockResolvedValue(null);
    mockInvitationService.resendInvitationEmail.mockResolvedValue(undefined);
    mockInvitationService.createInvitationForExistingUser.mockResolvedValue({
      email: 'test@test.com',
      invitation: invitationFactory(),
      userId: createUserId('test'),
    });

    organization = organizationFactory({ id: organizationId });

    mockOrganizationService.getOrganizationById.mockResolvedValue(organization);
    mockUserService.getUserById.mockResolvedValue(inviter);

    useCase = new CreateInvitationsUseCase(
      mockUserService,
      mockOrganizationService,
      mockUserService,
      mockInvitationService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates invitations for new users and returns created results', async () => {
    const targetEmail = ' new-user@packmind.com ';
    const normalizedEmail = 'new-user@packmind.com';
    const createdUser = userFactory({
      id: createUserId('user-new'),
      email: normalizedEmail,
      active: false,
      memberships: [],
    });
    const userWithMembership: User = {
      ...createdUser,
      memberships: [
        {
          userId: createdUser.id,
          organizationId,
          role: 'admin',
        },
      ],
    };
    const createdInvitation = invitationFactory({ userId: createdUser.id });

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValueOnce(null);
    mockUserService.createInactiveUser.mockResolvedValue(createdUser);
    mockUserService.addOrganizationMembership.mockResolvedValue(
      userWithMembership,
    );
    mockInvitationService.createInvitations.mockImplementation(
      async (requests: InvitationCreationRequest[]) => {
        expect(requests).toHaveLength(1);
        expect(requests[0].email).toBe(normalizedEmail);
        expect(requests[0].user).toEqual(userWithMembership);
        return [
          {
            email: normalizedEmail,
            invitation: createdInvitation,
            userId: createdUser.id,
          } as InvitationCreationRecord,
        ];
      },
    );

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [targetEmail],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toEqual({
      email: normalizedEmail,
      invitation: createdInvitation,
      userId: createdUser.id,
    });
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(mockUserService.createInactiveUser).toHaveBeenCalledWith(
      normalizedEmail,
    );
    expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
      createdUser,
      organizationId,
      'admin',
    );
  });

  it('skips invalid and duplicate emails', async () => {
    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: ['bad-email', 'user@packmind.com', 'USER@packmind.com'],
      role: 'admin',
    };

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValueOnce(null);
    const normalizedEmail = 'user@packmind.com';
    const createdUser = userFactory({
      email: normalizedEmail,
      memberships: [],
    });
    const userWithMembership: User = {
      ...createdUser,
      memberships: [
        {
          userId: createdUser.id,
          organizationId,
          role: 'admin',
        },
      ],
    };
    mockUserService.createInactiveUser.mockResolvedValue(createdUser);
    mockUserService.addOrganizationMembership.mockResolvedValue(
      userWithMembership,
    );
    mockInvitationService.createInvitations.mockResolvedValue([
      {
        email: normalizedEmail,
        invitation: invitationFactory(),
        userId: createUserId('generated'),
      },
    ]);

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(1);
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { email: 'bad-email', reason: 'invalid-email' },
        { email: 'USER@packmind.com', reason: 'duplicate-email' },
      ]),
    );
    expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
      createdUser,
      organizationId,
      'admin',
    );
  });

  it('allows re-inviting inactive users who are already members', async () => {
    const member = userFactory({
      email: 'member@packmind.com',
      active: false, // Inactive user but already member
      memberships: [
        {
          userId: createUserId('member'),
          organizationId,
          role: 'admin',
        },
      ],
    });

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(member);
    mockInvitationService.createInvitations.mockResolvedValue([
      {
        email: member.email,
        invitation: invitationFactory(),
        userId: member.id,
      },
    ]);

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [member.email],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(1);
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    // Should not try to add membership again since user is already a member
    expect(mockUserService.addOrganizationMembership).not.toHaveBeenCalled();
  });

  it('adds active users directly to organization without creating invitation', async () => {
    const activeUser = userFactory({
      email: 'active@packmind.com',
      active: true, // User completed signup
      memberships: [],
    });

    const userWithMembership = {
      ...activeUser,
      memberships: [
        {
          userId: activeUser.id,
          organizationId,
          role: 'admin' as const,
        },
      ],
    };

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(activeUser);
    mockUserService.addOrganizationMembership.mockResolvedValue(
      userWithMembership,
    );

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [activeUser.email],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(0);
    expect(result.organizationInvitations).toHaveLength(1);
    expect(result.organizationInvitations[0]).toEqual({
      email: activeUser.email,
      userId: activeUser.id,
      organizationId: organizationId as string,
      role: 'admin',
    });
    expect(result.skipped).toHaveLength(0);
    expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
      activeUser,
      organizationId,
      'admin',
    );
  });

  it('skips active users who are already members of the organization', async () => {
    const activeUser = userFactory({
      email: 'active@packmind.com',
      active: true, // User completed signup
      memberships: [
        {
          userId: createUserId('active-user'),
          organizationId,
          role: 'member',
        },
      ],
    });

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(activeUser);

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [activeUser.email],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(0);
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toEqual([
      { email: activeUser.email, reason: 'already-member' },
    ]);
    expect(mockUserService.addOrganizationMembership).not.toHaveBeenCalled();
  });

  it('resends email for users with existing valid invitations', async () => {
    const existingUser = userFactory({
      email: 'existing@packmind.com',
      active: false,
      memberships: [],
    });
    const userWithMembership: User = {
      ...existingUser,
      memberships: [
        {
          userId: existingUser.id,
          organizationId,
          role: 'admin',
        },
      ],
    };
    const validInvitation = invitationFactory({
      userId: existingUser.id,
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
      existingUser,
    );
    mockUserService.addOrganizationMembership.mockResolvedValue(
      userWithMembership,
    );
    mockInvitationService.findLatestByUserId.mockResolvedValue(validInvitation);

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [existingUser.email],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(1);
    expect(result.created[0].invitation).toEqual(validInvitation);
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(mockInvitationService.resendInvitationEmail).toHaveBeenCalledWith(
      validInvitation,
      expect.objectContaining({
        email: userWithMembership.email,
        user: userWithMembership,
        organization,
        inviter,
      }),
    );
    expect(
      mockInvitationService.createInvitationForExistingUser,
    ).not.toHaveBeenCalled();
  });

  it('creates new invitation for users with expired invitations', async () => {
    const existingUser = userFactory({
      email: 'expired@packmind.com',
      active: false,
      memberships: [],
    });
    const userWithMembership: User = {
      ...existingUser,
      memberships: [
        {
          userId: existingUser.id,
          organizationId,
          role: 'admin',
        },
      ],
    };
    const expiredInvitation = invitationFactory({
      userId: existingUser.id,
      expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    });
    const newInvitation = invitationFactory({ userId: existingUser.id });

    mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
      existingUser,
    );
    mockUserService.addOrganizationMembership.mockResolvedValue(
      userWithMembership,
    );
    mockInvitationService.findLatestByUserId.mockResolvedValue(
      expiredInvitation,
    );
    mockInvitationService.createInvitationForExistingUser.mockResolvedValue({
      email: userWithMembership.email,
      invitation: newInvitation,
      userId: existingUser.id,
    });

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [existingUser.email],
      role: 'admin',
    };

    const result = await useCase.execute(command);

    expect(result.created).toHaveLength(1);
    expect(result.created[0].invitation).toEqual(newInvitation);
    expect(result.organizationInvitations).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(
      mockInvitationService.createInvitationForExistingUser,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: userWithMembership.email,
        user: userWithMembership,
        organization,
        inviter,
      }),
    );
    expect(mockInvitationService.resendInvitationEmail).not.toHaveBeenCalled();
  });

  describe('when command role is Member', () => {
    it('creates membership with the member role', async () => {
      const targetEmail = 'member-invite@packmind.com';
      const createdUser = userFactory({
        email: targetEmail,
        memberships: [],
      });
      const userWithMembership: User = {
        ...createdUser,
        memberships: [
          {
            userId: createdUser.id,
            organizationId,
            role: 'member' as const,
          },
        ],
      };

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValueOnce(null);
      mockUserService.createInactiveUser.mockResolvedValue(createdUser);
      mockUserService.addOrganizationMembership.mockResolvedValue(
        userWithMembership,
      );
      mockInvitationService.createInvitations.mockResolvedValue([]);

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: [targetEmail],
        role: 'member',
      };

      await useCase.execute(command);

      expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
        createdUser,
        organizationId,
        'member',
      );
    });
  });

  it('throws if no emails are provided', async () => {
    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: [],
      role: 'admin',
    };

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      InvitationBatchEmptyError,
    );
    expect(mockInvitationService.createInvitations).not.toHaveBeenCalled();
  });

  it('throws if organization is not found', async () => {
    mockOrganizationService.getOrganizationById.mockResolvedValueOnce(null);

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: ['user@packmind.com'],
      role: 'admin',
    };

    await expect(useCase.execute(command)).rejects.toThrow(
      `Organization ${organizationId} not found`,
    );
  });

  it('throws if inviter user is not found', async () => {
    mockUserService.getUserById.mockResolvedValueOnce(null);

    const command: CreateInvitationsCommand = {
      organizationId: organizationId as string,
      userId: inviter.id as string,
      emails: ['user@packmind.com'],
      role: 'admin',
    };

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
