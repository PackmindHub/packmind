import { UserNotFoundError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateInvitationsCommand,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  User,
} from '@packmind/types';
import {
  invitationFactory,
  organizationFactory,
  userFactory,
} from '../../../../test';
import { InvitationBatchEmptyError } from '../../../domain/errors';
import {
  InvitationCreationRecord,
  InvitationService,
} from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import { CreateInvitationsUseCase } from './CreateInvitationsUseCase';

describe('CreateInvitationsUseCase', () => {
  let useCase: CreateInvitationsUseCase;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockUserService: jest.Mocked<UserService>;
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
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    mockUserService = {
      getUserById: mockGetUserById,
      getUserByEmail: jest.fn(),
      getUserByEmailCaseInsensitive: jest.fn(),
      createUser: jest.fn(),
      createInactiveUser: jest.fn(),
      addOrganizationMembership: jest.fn(),
      hashPassword: jest.fn(),
      listUsers: jest.fn(),
      validatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

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

    mockGetOrganizationById.mockResolvedValue(organization);
    mockGetUserById.mockResolvedValue(inviter);

    useCase = new CreateInvitationsUseCase(
      accountsPort,
      mockUserService,
      mockInvitationService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating invitations for new users', () => {
    const targetEmail = ' new-user@packmind.com ';
    const normalizedEmail = 'new-user@packmind.com';
    let createdUser: User;
    let userWithMembership: User;
    let createdInvitation: ReturnType<typeof invitationFactory>;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      createdUser = userFactory({
        id: createUserId('user-new'),
        email: normalizedEmail,
        active: false,
        memberships: [],
      });
      userWithMembership = {
        ...createdUser,
        memberships: [
          {
            userId: createdUser.id,
            organizationId,
            role: 'admin',
          },
        ],
      };
      createdInvitation = invitationFactory({ userId: createdUser.id });

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValueOnce(null);
      mockUserService.createInactiveUser.mockResolvedValue(createdUser);
      mockUserService.addOrganizationMembership.mockResolvedValue(
        userWithMembership,
      );
      mockInvitationService.createInvitations.mockResolvedValue([
        {
          email: normalizedEmail,
          invitation: createdInvitation,
          userId: createdUser.id,
        } as InvitationCreationRecord,
      ]);

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: [targetEmail],
        role: 'admin',
      };

      result = await useCase.execute(command);
    });

    it('returns one created invitation', () => {
      expect(result.created).toHaveLength(1);
    });

    it('returns the created invitation with correct data', () => {
      expect(result.created[0]).toEqual({
        email: normalizedEmail,
        invitation: createdInvitation,
        userId: createdUser.id,
      });
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('returns no skipped emails', () => {
      expect(result.skipped).toHaveLength(0);
    });

    it('creates an inactive user with normalized email', () => {
      expect(mockUserService.createInactiveUser).toHaveBeenCalledWith(
        normalizedEmail,
      );
    });

    it('adds the user to the organization with admin role', () => {
      expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
        createdUser,
        organizationId,
        'admin',
      );
    });
  });

  describe('when emails include invalid and duplicate entries', () => {
    const normalizedEmail = 'user@packmind.com';
    let createdUser: User;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      createdUser = userFactory({
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

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValueOnce(null);
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

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: ['bad-email', 'user@packmind.com', 'USER@packmind.com'],
        role: 'admin',
      };

      result = await useCase.execute(command);
    });

    it('returns one created invitation for the valid email', () => {
      expect(result.created).toHaveLength(1);
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('skips the invalid and duplicate emails with appropriate reasons', () => {
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { email: 'bad-email', reason: 'invalid-email' },
          { email: 'USER@packmind.com', reason: 'duplicate-email' },
        ]),
      );
    });

    it('adds the valid user to the organization', () => {
      expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
        createdUser,
        organizationId,
        'admin',
      );
    });
  });

  describe('when re-inviting inactive users who are already members', () => {
    let member: User;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      member = userFactory({
        email: 'member@packmind.com',
        active: false,
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

      result = await useCase.execute(command);
    });

    it('returns one created invitation', () => {
      expect(result.created).toHaveLength(1);
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('returns no skipped emails', () => {
      expect(result.skipped).toHaveLength(0);
    });

    it('does not try to add membership again', () => {
      expect(mockUserService.addOrganizationMembership).not.toHaveBeenCalled();
    });
  });

  describe('when adding active users directly to organization', () => {
    let activeUser: User;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      activeUser = userFactory({
        email: 'active@packmind.com',
        active: true,
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

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        activeUser,
      );
      mockUserService.addOrganizationMembership.mockResolvedValue(
        userWithMembership,
      );

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: [activeUser.email],
        role: 'admin',
      };

      result = await useCase.execute(command);
    });

    it('returns no created invitations', () => {
      expect(result.created).toHaveLength(0);
    });

    it('returns one organization invitation', () => {
      expect(result.organizationInvitations).toHaveLength(1);
    });

    it('returns the organization invitation with correct data', () => {
      expect(result.organizationInvitations[0]).toEqual({
        email: activeUser.email,
        userId: activeUser.id,
        organizationId: organizationId as string,
        role: 'admin',
      });
    });

    it('returns no skipped emails', () => {
      expect(result.skipped).toHaveLength(0);
    });

    it('adds the user to the organization with admin role', () => {
      expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
        activeUser,
        organizationId,
        'admin',
      );
    });
  });

  describe('when active users are already members of the organization', () => {
    let activeUser: User;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      activeUser = userFactory({
        email: 'active@packmind.com',
        active: true,
        memberships: [
          {
            userId: createUserId('active-user'),
            organizationId,
            role: 'member',
          },
        ],
      });

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        activeUser,
      );

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: [activeUser.email],
        role: 'admin',
      };

      result = await useCase.execute(command);
    });

    it('returns no created invitations', () => {
      expect(result.created).toHaveLength(0);
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('skips the user with already-member reason', () => {
      expect(result.skipped).toEqual([
        { email: activeUser.email, reason: 'already-member' },
      ]);
    });

    it('does not add membership', () => {
      expect(mockUserService.addOrganizationMembership).not.toHaveBeenCalled();
    });
  });

  describe('when users have existing valid invitations', () => {
    let userWithMembership: User;
    let validInvitation: ReturnType<typeof invitationFactory>;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const existingUser = userFactory({
        email: 'existing@packmind.com',
        active: false,
        memberships: [],
      });
      userWithMembership = {
        ...existingUser,
        memberships: [
          {
            userId: existingUser.id,
            organizationId,
            role: 'admin',
          },
        ],
      };
      validInvitation = invitationFactory({
        userId: existingUser.id,
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        existingUser,
      );
      mockUserService.addOrganizationMembership.mockResolvedValue(
        userWithMembership,
      );
      mockInvitationService.findLatestByUserId.mockResolvedValue(
        validInvitation,
      );

      const command: CreateInvitationsCommand = {
        organizationId: organizationId as string,
        userId: inviter.id as string,
        emails: [existingUser.email],
        role: 'admin',
      };

      result = await useCase.execute(command);
    });

    it('returns one created invitation', () => {
      expect(result.created).toHaveLength(1);
    });

    it('returns the existing valid invitation', () => {
      expect(result.created[0].invitation).toEqual(validInvitation);
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('returns no skipped emails', () => {
      expect(result.skipped).toHaveLength(0);
    });

    it('resends the invitation email', () => {
      expect(mockInvitationService.resendInvitationEmail).toHaveBeenCalledWith(
        validInvitation,
        expect.objectContaining({
          email: userWithMembership.email,
          user: userWithMembership,
          organization,
          inviter,
        }),
      );
    });

    it('does not create a new invitation', () => {
      expect(
        mockInvitationService.createInvitationForExistingUser,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when users have expired invitations', () => {
    let userWithMembership: User;
    let newInvitation: ReturnType<typeof invitationFactory>;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const existingUser = userFactory({
        email: 'expired@packmind.com',
        active: false,
        memberships: [],
      });
      userWithMembership = {
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
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      newInvitation = invitationFactory({ userId: existingUser.id });

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

      result = await useCase.execute(command);
    });

    it('returns one created invitation', () => {
      expect(result.created).toHaveLength(1);
    });

    it('returns the new invitation', () => {
      expect(result.created[0].invitation).toEqual(newInvitation);
    });

    it('returns no organization invitations', () => {
      expect(result.organizationInvitations).toHaveLength(0);
    });

    it('returns no skipped emails', () => {
      expect(result.skipped).toHaveLength(0);
    });

    it('creates a new invitation for the existing user', () => {
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
    });

    it('does not resend the existing invitation email', () => {
      expect(
        mockInvitationService.resendInvitationEmail,
      ).not.toHaveBeenCalled();
    });
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

  describe('when no emails are provided', () => {
    const command: CreateInvitationsCommand = {
      organizationId: 'org-123',
      userId: 'user-1',
      emails: [],
      role: 'admin',
    };

    it('throws InvitationBatchEmptyError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvitationBatchEmptyError,
      );
    });

    it('does not call createInvitations', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected error
      }
      expect(mockInvitationService.createInvitations).not.toHaveBeenCalled();
    });
  });

  it('throws if organization is not found', async () => {
    mockGetOrganizationById.mockResolvedValueOnce(null);

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
    mockGetUserById.mockResolvedValueOnce(null);

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
