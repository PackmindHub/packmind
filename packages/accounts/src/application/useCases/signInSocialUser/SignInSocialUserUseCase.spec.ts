import { PackmindEventEmitterService } from '@packmind/node-utils';
import { SignInSocialUserUseCase } from './SignInSocialUserUseCase';
import { UserService } from '../../services/UserService';
import { MembershipResolutionService } from '../../services/MembershipResolutionService';
import { UserMetadataService } from '../../services/UserMetadataService';
import {
  createUserId,
  createOrganizationId,
  ISignInSocialUserUseCase,
  ISignUpWithOrganizationUseCase,
  Organization,
  SignInSocialUserCommand,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import { userFactory } from '../../../../test';

describe('SignInSocialUserUseCase', () => {
  let useCase: ISignInSocialUserUseCase;
  let userService: jest.Mocked<UserService>;
  let membershipResolutionService: jest.Mocked<MembershipResolutionService>;
  let userMetadataService: jest.Mocked<UserMetadataService>;
  let signUpWithOrganizationUseCase: jest.Mocked<ISignUpWithOrganizationUseCase>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');

  const membership: UserOrganizationMembership = {
    userId,
    organizationId,
    role: 'admin',
  };

  const testUser: User = userFactory({
    id: userId,
    email: 'user@example.com',
    memberships: [membership],
  });

  const testOrganization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    userService = {
      getUserByEmailCaseInsensitive: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    membershipResolutionService = {
      resolveUserOrganizations: jest.fn(),
    } as unknown as jest.Mocked<MembershipResolutionService>;

    userMetadataService = {
      addSocialProvider: jest.fn(),
    } as unknown as jest.Mocked<UserMetadataService>;

    signUpWithOrganizationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ISignUpWithOrganizationUseCase>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new SignInSocialUserUseCase(
      userService,
      membershipResolutionService,
      userMetadataService,
      signUpWithOrganizationUseCase,
      mockEventEmitterService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user does not exist', () => {
    const command: SignInSocialUserCommand = {
      email: 'new@example.com',
      socialProvider: 'GoogleOAuth',
    };

    const newUserId = createUserId('new-user');
    const newOrgId = createOrganizationId('new-org');
    const newUser: User = userFactory({
      id: newUserId,
      email: 'new@example.com',
      memberships: [
        { userId: newUserId, organizationId: newOrgId, role: 'admin' },
      ],
    });
    const newOrg: Organization = {
      id: newOrgId,
      name: "new's organization",
      slug: 'news-organization',
    };

    beforeEach(() => {
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);
      signUpWithOrganizationUseCase.execute.mockResolvedValue({
        user: newUser,
        organization: newOrg,
      });
    });

    it('returns isNewUser true', async () => {
      const result = await useCase.execute(command);

      expect(result.isNewUser).toBe(true);
    });

    it('returns the created user', async () => {
      const result = await useCase.execute(command);

      expect(result.user).toEqual(newUser);
    });

    it('returns the created organization', async () => {
      const result = await useCase.execute(command);

      expect(result.organization).toEqual(newOrg);
    });

    it('returns admin role', async () => {
      const result = await useCase.execute(command);

      expect(result.role).toBe('admin');
    });

    it('calls signUpWithOrganization with social authType', async () => {
      await useCase.execute(command);

      expect(signUpWithOrganizationUseCase.execute).toHaveBeenCalledWith({
        email: 'new@example.com',
        authType: 'social',
        socialProvider: 'GoogleOAuth',
      });
    });

    it('tracks the social provider', async () => {
      await useCase.execute(command);

      expect(userMetadataService.addSocialProvider).toHaveBeenCalledWith(
        newUserId,
        'GoogleOAuth',
      );
    });

    it('does not emit UserSignedInEvent', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when user exists with single organization', () => {
    const command: SignInSocialUserCommand = {
      email: 'user@example.com',
      socialProvider: 'GoogleOAuth',
    };

    beforeEach(() => {
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organization: testOrganization,
        role: 'admin',
      });
    });

    it('returns isNewUser false', async () => {
      const result = await useCase.execute(command);

      expect(result.isNewUser).toBe(false);
    });

    it('returns the existing user', async () => {
      const result = await useCase.execute(command);

      expect(result.user).toEqual(testUser);
    });

    it('returns the organization', async () => {
      const result = await useCase.execute(command);

      expect(result.organization).toEqual(testOrganization);
    });

    it('returns admin role', async () => {
      const result = await useCase.execute(command);

      expect(result.role).toBe('admin');
    });

    it('does not call signUpWithOrganization', async () => {
      await useCase.execute(command);

      expect(signUpWithOrganizationUseCase.execute).not.toHaveBeenCalled();
    });

    it('tracks the social provider', async () => {
      await useCase.execute(command);

      expect(userMetadataService.addSocialProvider).toHaveBeenCalledWith(
        userId,
        'GoogleOAuth',
      );
    });

    it('emits UserSignedInEvent with social method', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            userId,
            organizationId,
            email: 'user@example.com',
            method: 'social',
            socialProvider: 'GoogleOAuth',
            source: 'ui',
          },
        }),
      );
    });
  });

  describe('when user exists with multiple organizations', () => {
    const command: SignInSocialUserCommand = {
      email: 'user@example.com',
      socialProvider: 'MicrosoftOAuth',
    };

    const organizationId2 = createOrganizationId('org-456');
    const testOrganization2: Organization = {
      id: organizationId2,
      name: 'Second Organization',
      slug: 'second-org',
    };

    beforeEach(() => {
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organizations: [
          { organization: testOrganization, role: 'admin' },
          { organization: testOrganization2, role: 'member' },
        ],
      });
    });

    it('returns isNewUser false', async () => {
      const result = await useCase.execute(command);

      expect(result.isNewUser).toBe(false);
    });

    it('returns the organizations list', async () => {
      const result = await useCase.execute(command);

      expect(result.organizations).toEqual([
        { organization: testOrganization, role: 'admin' },
        { organization: testOrganization2, role: 'member' },
      ]);
    });

    it('emits UserSignedInEvent with first organization', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            userId,
            organizationId,
            email: 'user@example.com',
            method: 'social',
            socialProvider: 'MicrosoftOAuth',
            source: 'ui',
          },
        }),
      );
    });
  });

  describe('when user exists with no memberships', () => {
    const command: SignInSocialUserCommand = {
      email: 'user@example.com',
      socialProvider: 'GitHubOAuth',
    };

    const userWithNoMemberships: User = {
      ...testUser,
      memberships: [],
    };

    beforeEach(() => {
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithNoMemberships,
      );
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organizations: [],
      });
    });

    it('returns isNewUser false', async () => {
      const result = await useCase.execute(command);

      expect(result.isNewUser).toBe(false);
    });

    it('returns empty organizations', async () => {
      const result = await useCase.execute(command);

      expect(result.organizations).toEqual([]);
    });

    it('does not emit UserSignedInEvent', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });

    it('tracks the social provider', async () => {
      await useCase.execute(command);

      expect(userMetadataService.addSocialProvider).toHaveBeenCalledWith(
        userId,
        'GitHubOAuth',
      );
    });
  });
});
