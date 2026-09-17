import { stubLogger } from '@packmind/test-utils';
import {
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
  IAccountsPort,
  ISpacesPort,
  ListDeploymentsByPackageCommand,
  ListDeploymentsByPackageResponse,
  Organization,
  User,
  UserId,
  UserOrganizationMembership,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test';
import { v4 as uuidv4 } from 'uuid';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { ListDeploymentsByPackageUseCase } from './ListDeploymentsByPackageUseCase';
import { distributionFactory, targetFactory } from '../../../test';

const ORG_ID = createOrganizationId(uuidv4());
const SPACE_ID = createSpaceId(uuidv4());
const USER_ID = createUserId(uuidv4());

const organization: Organization = {
  id: ORG_ID,
  name: 'Acme',
  slug: 'acme',
};

const membership: UserOrganizationMembership = {
  userId: USER_ID,
  organizationId: ORG_ID,
  role: 'member',
};

const user: User = userFactory({
  id: USER_ID,
  email: 'member@test.com',
  passwordHash: null,
  active: true,
  memberships: [membership],
});

describe('ListDeploymentsByPackageUseCase', () => {
  let useCase: ListDeploymentsByPackageUseCase;
  let mockRepository: jest.Mocked<IDistributionRepository>;
  let spacesPort: jest.Mocked<Pick<ISpacesPort, 'findMembership'>>;
  let accountsPort: jest.Mocked<
    Pick<IAccountsPort, 'getUserById' | 'getOrganizationById'>
  >;

  const command: ListDeploymentsByPackageCommand = {
    packageId: createPackageId('package-123'),
    spaceId: SPACE_ID,
    organizationId: ORG_ID,
    userId: USER_ID,
  };

  beforeEach(() => {
    mockRepository = {
      listByPackageId: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    spacesPort = {
      findMembership: jest.fn().mockResolvedValue({
        userId: USER_ID,
        spaceId: SPACE_ID,
        role: 'member',
      }),
    };

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    };

    useCase = new ListDeploymentsByPackageUseCase(
      spacesPort as unknown as ISpacesPort,
      accountsPort as unknown as IAccountsPort,
      mockRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the caller is a member of the space', () => {
    const mockDistributions: Distribution[] = [
      distributionFactory({
        id: createDistributionId('distribution-1'),
        organizationId: ORG_ID,
        distributedPackages: [],
        target: targetFactory({
          id: createTargetId('target-123'),
          name: 'Test Target',
          path: '/test',
          gitRepoId: createGitRepoId('repo-123'),
        }),
        status: DistributionStatus.success,
        authorId: 'author-123' as UserId,
        createdAt: new Date().toISOString(),
        renderModes: [],
      }),
    ];
    let result: ListDeploymentsByPackageResponse;

    beforeEach(async () => {
      mockRepository.listByPackageId.mockResolvedValue(mockDistributions);
      result = await useCase.execute(command);
    });

    it('returns the distributions', () => {
      expect(result).toEqual(mockDistributions);
    });

    it('calls repository with correct parameters', () => {
      expect(mockRepository.listByPackageId).toHaveBeenCalledWith(
        command.packageId,
        command.organizationId,
        command.spaceId,
      );
    });
  });

  describe('when the caller is not a member of the space', () => {
    let outcome: Promise<ListDeploymentsByPackageResponse>;

    beforeEach(async () => {
      spacesPort.findMembership.mockResolvedValue(null);
      outcome = useCase.execute(command);
      // settle it here so the assertions below do not each re-run the use case,
      // and so the rejection is never unhandled
      await outcome.catch(() => undefined);
    });

    it('rejects', async () => {
      await expect(outcome).rejects.toThrow();
    });

    it('does not read the history', () => {
      expect(mockRepository.listByPackageId).not.toHaveBeenCalled();
    });
  });

  describe('when listing distributions fails', () => {
    it('throws repository error', async () => {
      const error = new Error('Repository error');

      mockRepository.listByPackageId.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });

  describe('when no distributions found', () => {
    it('returns empty array', async () => {
      mockRepository.listByPackageId.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });
  });
});
