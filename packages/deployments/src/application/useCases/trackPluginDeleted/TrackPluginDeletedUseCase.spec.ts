import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  PluginDeletedEvent,
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
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
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

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new TrackPluginDeletedUseCase(
      packageService,
      spacesPort,
      accountsPort,
      eventEmitterService,
      stubLogger(),
    );
  });

  describe('when a git remote url is provided', () => {
    let emitted: PluginDeletedEvent;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute(
        buildCommand({
          gitRemoteUrl: 'https://github.com/acme/marketplace.git',
        }),
      );
      emitted = eventEmitterService.emit.mock.calls[0][0] as PluginDeletedEvent;
    });

    it('resolves the package by slug and space', () => {
      expect(
        packageService.getPackagesBySlugsAndSpaceWithArtefacts,
      ).toHaveBeenCalledWith(['security'], defaultSpace.id);
    });

    it('emits a PluginDeletedEvent', () => {
      expect(emitted).toBeInstanceOf(PluginDeletedEvent);
    });

    it('emits the event with the marketplace repo in the payload', () => {
      expect(emitted.payload).toEqual({
        userId: createUserId(userId),
        organizationId,
        source: 'cli',
        packageId: pkg.id,
        packageSlug: pkg.slug,
        marketplaceRepo: 'https://github.com/acme/marketplace.git',
      });
    });

    it('returns tracked true', () => {
      expect(result).toEqual({ tracked: true });
    });
  });

  describe('when no git remote url is provided', () => {
    let emitted: PluginDeletedEvent;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute(buildCommand({ gitRemoteUrl: '   ' }));
      emitted = eventEmitterService.emit.mock.calls[0][0] as PluginDeletedEvent;
    });

    it('emits the event with the correct payload', () => {
      expect(emitted.payload).toEqual({
        userId: createUserId(userId),
        organizationId,
        source: 'cli',
        packageId: pkg.id,
        packageSlug: pkg.slug,
      });
    });

    it('emits the event without the marketplaceRepo property', () => {
      expect(emitted.payload).not.toHaveProperty('marketplaceRepo');
    });

    it('returns tracked true', () => {
      expect(result).toEqual({ tracked: true });
    });

    describe('when gitRemoteUrl is undefined', () => {
      it('emits the event without the marketplaceRepo property', async () => {
        eventEmitterService.emit.mockClear();
        await useCase.execute(buildCommand({ gitRemoteUrl: undefined }));
        const emittedForUndefined = eventEmitterService.emit.mock
          .calls[0][0] as PluginDeletedEvent;
        expect(emittedForUndefined.payload).not.toHaveProperty(
          'marketplaceRepo',
        );
      });
    });
  });

  describe('when the package does not exist', () => {
    beforeEach(() => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue(
        [],
      );
    });

    it('throws PackagesNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
        PackagesNotFoundError,
      );
    });

    it('does not emit an event', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });
});
