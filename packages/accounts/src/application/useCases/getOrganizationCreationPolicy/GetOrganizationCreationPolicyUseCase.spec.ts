import { createMockInstance, stubLogger } from '@packmind/test-utils';
import { createUserId } from '@packmind/types';
import { userFactory } from '../../../../test';
import { OrganizationCreationPolicyService } from '../../services/OrganizationCreationPolicyService';
import { UserService } from '../../services/UserService';
import { GetOrganizationCreationPolicyUseCase } from './GetOrganizationCreationPolicyUseCase';

describe('GetOrganizationCreationPolicyUseCase', () => {
  let useCase: GetOrganizationCreationPolicyUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockPolicyService: jest.Mocked<OrganizationCreationPolicyService>;

  beforeEach(() => {
    mockUserService = createMockInstance(UserService);
    mockPolicyService = createMockInstance(OrganizationCreationPolicyService);
    mockPolicyService.canCreateOrganization.mockResolvedValue(true);

    useCase = new GetOrganizationCreationPolicyUseCase(
      mockUserService,
      mockPolicyService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a user id is given', () => {
    const userId = createUserId('user-1');
    const user = userFactory({ id: userId });

    beforeEach(() => {
      mockUserService.getUserById.mockResolvedValue(user);
    });

    it('evaluates the policy for the user loaded from the database', async () => {
      await useCase.execute({ userId });

      expect(mockPolicyService.canCreateOrganization).toHaveBeenCalledWith(
        user,
      );
    });

    it('returns the policy answer', async () => {
      mockPolicyService.canCreateOrganization.mockResolvedValue(false);

      expect(await useCase.execute({ userId })).toEqual({
        canCreateOrganization: false,
      });
    });
  });

  describe('when the user id matches no user', () => {
    beforeEach(() => {
      mockUserService.getUserById.mockResolvedValue(null);
    });

    it('evaluates the policy as anonymous', async () => {
      await useCase.execute({ userId: createUserId('unknown') });

      expect(mockPolicyService.canCreateOrganization).toHaveBeenCalledWith(
        null,
      );
    });
  });

  describe('when no user id is given', () => {
    it('evaluates the policy as anonymous', async () => {
      await useCase.execute({});

      expect(mockPolicyService.canCreateOrganization).toHaveBeenCalledWith(
        null,
      );
    });

    it('does not look up a user', async () => {
      await useCase.execute({});

      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });

    it('returns the policy answer', async () => {
      expect(await useCase.execute({})).toEqual({
        canCreateOrganization: true,
      });
    });
  });
});
