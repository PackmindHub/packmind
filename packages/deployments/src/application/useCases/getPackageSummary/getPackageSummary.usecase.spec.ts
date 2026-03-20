import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  ISpacesPort,
  Organization,
  Space,
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

const space: Space = {
  id: SPACE_ID,
  organizationId: ORG_ID,
  name: 'Global',
  slug: 'global',
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
  let spacesPort: jest.Mocked<Pick<ISpacesPort, 'getSpaceBySlug'>>;
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

    spacesPort = {
      getSpaceBySlug: jest.fn().mockResolvedValue(space),
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
      spacesPort as unknown as ISpacesPort,
      stubLogger(),
    );
  });

  describe('when slug is unqualified', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        packageFactory({ slug: 'backend', spaceId: SPACE_ID }),
      ]);
    });

    it('calls getPackagesBySlugsWithArtefacts with the raw slug', async () => {
      await useCase.execute({ ...baseCommand, slug: 'backend' });

      expect(
        packageService.getPackagesBySlugsWithArtefacts,
      ).toHaveBeenCalledWith(['backend'], ORG_ID);
    });

    it('returns the package summary', async () => {
      const result = await useCase.execute({ ...baseCommand, slug: 'backend' });

      expect(result.slug).toEqual('backend');
    });
  });

  describe('when slug is qualified (@space/package)', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        packageFactory({ slug: 'backend', spaceId: SPACE_ID }),
      ]);
    });

    it('resolves the space by slug', async () => {
      await useCase.execute({ ...baseCommand, slug: '@global/backend' });

      expect(spacesPort.getSpaceBySlug).toHaveBeenCalledWith('global', ORG_ID);
    });

    it('calls getPackagesBySlugsAndSpaceWithArtefacts with pkgSlug and spaceId', async () => {
      await useCase.execute({ ...baseCommand, slug: '@global/backend' });

      expect(
        packageService.getPackagesBySlugsAndSpaceWithArtefacts,
      ).toHaveBeenCalledWith(['backend'], SPACE_ID);
    });

    it('returns the package summary', async () => {
      const result = await useCase.execute({
        ...baseCommand,
        slug: '@global/backend',
      });

      expect(result.slug).toEqual('backend');
    });
  });

  describe('when space is not found', () => {
    beforeEach(() => {
      spacesPort.getSpaceBySlug.mockResolvedValue(null);
    });

    it('throws a space-not-found error', async () => {
      await expect(
        useCase.execute({ ...baseCommand, slug: '@unknown/backend' }),
      ).rejects.toThrow("Space '@unknown' not found.");
    });
  });

  describe('when package is not found', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([]);
    });

    it('throws a package-not-found error', async () => {
      await expect(
        useCase.execute({ ...baseCommand, slug: 'nonexistent' }),
      ).rejects.toThrow("Package 'nonexistent' does not exist");
    });
  });
});
