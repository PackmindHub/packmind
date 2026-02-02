import { PackmindLogger } from '@packmind/logger';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  GetUserOnboardingStatusCommand,
  IAccountsPort,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { UserMetadataService } from '../../services/UserMetadataService';
import { GetUserOnboardingStatusUseCase } from './GetUserOnboardingStatusUseCase';

describe('GetUserOnboardingStatusUseCase', () => {
  let useCase: GetUserOnboardingStatusUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockUserMetadataService: jest.Mocked<UserMetadataService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-456');

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockUserMetadataService = {
      isOnboardingCompleted: jest.fn(),
    } as unknown as jest.Mocked<UserMetadataService>;

    stubbedLogger = stubLogger();

    useCase = new GetUserOnboardingStatusUseCase(
      mockAccountsPort,
      mockUserMetadataService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    describe('when onboarding is completed', () => {
      it('returns showOnboarding: false and empty steps', async () => {
        const now = new Date();
        const user = userFactory({ id: userId, createdAt: now });
        const organization = organizationFactory({ id: organizationId });
        const membership = {
          userId,
          organizationId,
          role: 'admin' as const,
          createdAt: now,
        };

        const command: GetUserOnboardingStatusCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          user,
          organization,
          membership,
        };

        mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(true);

        const result = await useCase.executeForMembers(command);

        expect(result).toEqual({
          onboardingCompleted: true,
          isOrganizationCreator: true,
          showOnboarding: false,
          stepsToShow: [],
        });
      });
    });

    describe('when user is organization creator', () => {
      describe('when onboarding is not completed', () => {
        it('returns all three steps', async () => {
          const now = new Date();
          const user = userFactory({ id: userId, createdAt: now });
          const organization = organizationFactory({ id: organizationId });
          const membership = {
            userId,
            organizationId,
            role: 'admin' as const,
            createdAt: now,
          };

          const command: GetUserOnboardingStatusCommand & MemberContext = {
            userId: String(userId),
            organizationId,
            user,
            organization,
            membership,
          };

          mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

          const result = await useCase.executeForMembers(command);

          expect(result.stepsToShow).toEqual(['welcome', 'playbook', 'build']);
        });
      });
    });

    describe('when user is invited (not creator)', () => {
      describe('when onboarding is not completed', () => {
        it('returns only welcome and playbook steps', async () => {
          const userCreatedAt = new Date('2024-01-01T10:00:00Z');
          const membershipCreatedAt = new Date('2024-01-02T10:00:00Z');
          const user = userFactory({ id: userId, createdAt: userCreatedAt });
          const organization = organizationFactory({ id: organizationId });
          const membership = {
            userId,
            organizationId,
            role: 'member' as const,
            createdAt: membershipCreatedAt,
          };

          const command: GetUserOnboardingStatusCommand & MemberContext = {
            userId: String(userId),
            organizationId,
            user,
            organization,
            membership,
          };

          mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

          const result = await useCase.executeForMembers(command);

          expect(result.stepsToShow).toEqual(['welcome', 'playbook']);
        });
      });
    });

    describe('when detecting organization creator', () => {
      it('returns isOrganizationCreator: true when timestamps are within 60 seconds', async () => {
        const userCreatedAt = new Date('2024-01-01T10:00:00Z');
        const membershipCreatedAt = new Date('2024-01-01T10:00:30Z');
        const user = userFactory({ id: userId, createdAt: userCreatedAt });
        const organization = organizationFactory({ id: organizationId });
        const membership = {
          userId,
          organizationId,
          role: 'admin' as const,
          createdAt: membershipCreatedAt,
        };

        const command: GetUserOnboardingStatusCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          user,
          organization,
          membership,
        };

        mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

        const result = await useCase.executeForMembers(command);

        expect(result.isOrganizationCreator).toBe(true);
      });

      it('returns isOrganizationCreator: false when timestamps differ by more than 60 seconds', async () => {
        const userCreatedAt = new Date('2024-01-01T10:00:00Z');
        const membershipCreatedAt = new Date('2024-01-01T10:02:00Z');
        const user = userFactory({ id: userId, createdAt: userCreatedAt });
        const organization = organizationFactory({ id: organizationId });
        const membership = {
          userId,
          organizationId,
          role: 'member' as const,
          createdAt: membershipCreatedAt,
        };

        const command: GetUserOnboardingStatusCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          user,
          organization,
          membership,
        };

        mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

        const result = await useCase.executeForMembers(command);

        expect(result.isOrganizationCreator).toBe(false);
      });

      it('returns isOrganizationCreator: false when userCreatedAt is undefined', async () => {
        const user = userFactory({ id: userId, createdAt: undefined });
        const organization = organizationFactory({ id: organizationId });
        const membership = {
          userId,
          organizationId,
          role: 'member' as const,
          createdAt: new Date(),
        };

        const command: GetUserOnboardingStatusCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          user,
          organization,
          membership,
        };

        mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

        const result = await useCase.executeForMembers(command);

        expect(result.isOrganizationCreator).toBe(false);
      });

      it('returns isOrganizationCreator: false when membershipCreatedAt is undefined', async () => {
        const user = userFactory({ id: userId, createdAt: new Date() });
        const organization = organizationFactory({ id: organizationId });
        const membership = {
          userId,
          organizationId,
          role: 'member' as const,
          createdAt: undefined,
        };

        const command: GetUserOnboardingStatusCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          user,
          organization,
          membership,
        };

        mockUserMetadataService.isOnboardingCompleted.mockResolvedValue(false);

        const result = await useCase.executeForMembers(command);

        expect(result.isOrganizationCreator).toBe(false);
      });
    });
  });
});
