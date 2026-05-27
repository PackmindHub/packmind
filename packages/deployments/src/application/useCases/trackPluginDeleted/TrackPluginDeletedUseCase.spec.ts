import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  IEventTrackingPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  Space,
  SpaceType,
  TrackPluginDeletedCommand,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../../services/PackageService';
import { PackagesNotFoundError } from '../../../domain/errors/PackagesNotFoundError';
import { TrackPluginDeletedUseCase } from './TrackPluginDeletedUseCase';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
  trial: false,
});

describe('TrackPluginDeletedUseCase', () => {
  let packageService: jest.Mocked<PackageService>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let eventTrackingPort: jest.Mocked<IEventTrackingPort>;
  let useCase: TrackPluginDeletedUseCase;
  let organizationId: OrganizationId;
  let organization: Organization;
  let defaultSpace: Space;
  let userId: string;
  let pkg: PackageWithArtefacts;

  const buildCommand = (
    overrides: Partial<TrackPluginDeletedCommand> = {},
  ): TrackPluginDeletedCommand => ({
    userId,
    organizationId: organizationId as unknown as string,
    packageSlug: 'security',
    ...overrides,
  });

  const buildPackage = (
    overrides: Partial<PackageWithArtefacts> = {},
  ): PackageWithArtefacts =>
    ({
      id: createPackageId(uuidv4()),
      name: 'Security',
      slug: 'security',
      description: 'Security helpers',
      spaceId: defaultSpace.id,
      createdBy: createUserId(userId),
      recipes: [],
      standards: [],
      skills: [],
      ...overrides,
    }) as PackageWithArtefacts;

  beforeEach(() => {
    userId = uuidv4();
    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };
    defaultSpace = {
      id: createSpaceId('default-space-id'),
      name: 'Default Space',
      slug: 'default',
      type: SpaceType.open,
      organizationId,
      isDefaultSpace: true,
    };
    pkg = buildPackage();

    packageService = {
      getPackagesBySlugsAndSpaceWithArtefacts: jest
        .fn()
        .mockResolvedValue([pkg]),
    } as unknown as jest.Mocked<PackageService>;

    spacesPort = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([defaultSpace]),
      getSpaceBySlug: jest.fn().mockResolvedValue(defaultSpace),
    } as unknown as jest.Mocked<ISpacesPort>;

    accountsPort = {
      getUserById: jest
        .fn()
        .mockResolvedValue(
          createUserWithMembership(userId, organization, 'admin'),
        ),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    eventTrackingPort = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
      identifyOrganizationGroup: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IEventTrackingPort>;

    useCase = new TrackPluginDeletedUseCase(
      packageService,
      spacesPort,
      accountsPort,
      eventTrackingPort,
      stubLogger(),
    );
  });

  describe('when a git remote url is provided', () => {
    it('resolves the package and emits plugin_deleted with the marketplace repo', async () => {
      const result = await useCase.execute(
        buildCommand({
          gitRemoteUrl: 'https://github.com/acme/marketplace.git',
        }),
      );

      expect(
        packageService.getPackagesBySlugsAndSpaceWithArtefacts,
      ).toHaveBeenCalledWith(['security'], defaultSpace.id);
      expect(eventTrackingPort.trackEvent).toHaveBeenCalledWith(
        userId,
        organizationId,
        'plugin_deleted',
        {
          package_id: pkg.id,
          package_slug: pkg.slug,
          marketplace_repo: 'https://github.com/acme/marketplace.git',
        },
      );
      expect(result).toEqual({ tracked: true });
    });
  });

  describe('when no git remote url is provided', () => {
    it('emits plugin_deleted without the marketplace repo', async () => {
      const result = await useCase.execute(
        buildCommand({ gitRemoteUrl: '   ' }),
      );

      expect(eventTrackingPort.trackEvent).toHaveBeenCalledWith(
        userId,
        organizationId,
        'plugin_deleted',
        {
          package_id: pkg.id,
          package_slug: pkg.slug,
        },
      );
      expect(result).toEqual({ tracked: true });
    });

    it('emits plugin_deleted without the marketplace repo when undefined', async () => {
      await useCase.execute(buildCommand({ gitRemoteUrl: undefined }));

      expect(eventTrackingPort.trackEvent).toHaveBeenCalledWith(
        userId,
        organizationId,
        'plugin_deleted',
        {
          package_id: pkg.id,
          package_slug: pkg.slug,
        },
      );
    });
  });

  describe('when the package does not exist', () => {
    it('throws PackagesNotFoundError and does not emit an event', async () => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue(
        [],
      );

      await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
        PackagesNotFoundError,
      );
      expect(eventTrackingPort.trackEvent).not.toHaveBeenCalled();
    });
  });
});
