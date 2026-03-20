import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  Organization,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { packageFactory } from '../../../../test';
import { PackageService } from '../services/PackageService';
import { DeploymentsServices } from '../services/DeploymentsServices';
import { GetPackageSummaryUsecase } from './getPackageSummary.usecase';

afterEach(() => jest.clearAllMocks());

const ORG_ID = createOrganizationId(uuidv4());
const SPACE_ID = createSpaceId(uuidv4());

const organization: Organization = {
  id: ORG_ID,
  name: 'Acme',
  slug: 'acme',
};

function makeMembership(userId: string): UserOrganizationMembership {
  return {
    userId: createUserId(userId),
    organizationId: ORG_ID,
    role: 'member',
  };
}

function makeUser(userId: string): User {
  return {
    id: createUserId(userId),
    email: `${userId}@test.com`,
    passwordHash: null,
    active: true,
    memberships: [makeMembership(userId)],
  };
}

describe('GetPackageSummaryUsecase', () => {
  const userId = uuidv4();

  let accountsPort: jest.Mocked<
    Pick<IAccountsPort, 'getUserById' | 'getOrganizationById'>
  >;
  let packageService: jest.Mocked<
    Pick<
      PackageService,
      | 'getPackagesBySlugsWithArtefacts'
      | 'getPackagesBySlugsAndSpaceWithArtefacts'
    >
  >;
  let deploymentsServices: jest.Mocked<DeploymentsServices>;
  let useCase: GetPackageSummaryUsecase;

  const baseCommand = {
    userId,
    organizationId: ORG_ID,
  };

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(makeUser(userId)),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    };

    packageService = {
      getPackagesBySlugsWithArtefacts: jest.fn(),
      getPackagesBySlugsAndSpaceWithArtefacts: jest.fn(),
    };

    deploymentsServices = {
      getPackageService: jest.fn().mockReturnValue(packageService),
    } as unknown as jest.Mocked<DeploymentsServices>;

    useCase = new GetPackageSummaryUsecase(
      accountsPort as unknown as IAccountsPort,
      deploymentsServices,
      stubLogger(),
    );
  });

  describe('when spaceId is not provided', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        packageFactory({ slug: 'backend', spaceId: SPACE_ID }),
      ]);
    });

    it('calls getPackagesBySlugsWithArtefacts with the slug and organizationId', async () => {
      await useCase.execute({ ...baseCommand, slug: 'backend' });

      expect(
        packageService.getPackagesBySlugsWithArtefacts,
      ).toHaveBeenCalledWith(['backend'], ORG_ID);
    });

    it('does not call getPackagesBySlugsAndSpaceWithArtefacts', async () => {
      await useCase.execute({ ...baseCommand, slug: 'backend' });

      expect(
        packageService.getPackagesBySlugsAndSpaceWithArtefacts,
      ).not.toHaveBeenCalled();
    });

    it('returns the package summary', async () => {
      const result = await useCase.execute({ ...baseCommand, slug: 'backend' });

      expect(result.slug).toEqual('backend');
    });
  });

  describe('when spaceId is provided', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        packageFactory({ slug: 'backend', spaceId: SPACE_ID }),
      ]);
    });

    it('calls getPackagesBySlugsAndSpaceWithArtefacts with the slug and spaceId', async () => {
      await useCase.execute({
        ...baseCommand,
        slug: 'backend',
        spaceId: SPACE_ID,
      });

      expect(
        packageService.getPackagesBySlugsAndSpaceWithArtefacts,
      ).toHaveBeenCalledWith(['backend'], SPACE_ID);
    });

    it('does not call getPackagesBySlugsWithArtefacts', async () => {
      await useCase.execute({
        ...baseCommand,
        slug: 'backend',
        spaceId: SPACE_ID,
      });

      expect(
        packageService.getPackagesBySlugsWithArtefacts,
      ).not.toHaveBeenCalled();
    });

    it('returns the package summary', async () => {
      const result = await useCase.execute({
        ...baseCommand,
        slug: 'backend',
        spaceId: SPACE_ID,
      });

      expect(result.slug).toEqual('backend');
    });
  });

  describe('when package is not found', () => {
    describe('and spaceId is not provided', () => {
      beforeEach(() => {
        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([]);
      });

      it('throws a package-not-found error', async () => {
        await expect(
          useCase.execute({ ...baseCommand, slug: 'nonexistent' }),
        ).rejects.toThrow("Package 'nonexistent' does not exist");
      });
    });

    describe('and spaceId is provided', () => {
      beforeEach(() => {
        packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue(
          [],
        );
      });

      it('throws a package-not-found error', async () => {
        await expect(
          useCase.execute({
            ...baseCommand,
            slug: 'nonexistent',
            spaceId: SPACE_ID,
          }),
        ).rejects.toThrow("Package 'nonexistent' does not exist");
      });
    });
  });
});
