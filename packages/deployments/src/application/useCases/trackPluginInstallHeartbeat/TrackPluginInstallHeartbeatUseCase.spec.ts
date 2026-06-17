import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  Marketplace,
  PluginInstallTrackedEvent,
  PluginInstallation,
  TrackPluginInstallHeartbeatCommand,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createPluginInstallationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  IPluginInstallationRepository,
  UpsertHeartbeatResult,
} from '../../../domain/repositories/IPluginInstallationRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { PackageService } from '../../services/PackageService';
import { TrackPluginInstallHeartbeatUseCase } from './TrackPluginInstallHeartbeatUseCase';

const buildMarketplace = (
  overrides: Partial<Marketplace> = {},
): Marketplace => ({
  id: createMarketplaceId(uuidv4()),
  organizationId: createOrganizationId(uuidv4()),
  name: 'acme-marketplace',
  trackingToken: 'test-token-123',
  vendor: 'anthropic',
  gitRepoId: uuidv4() as Marketplace['gitRepoId'],
  addedBy: createUserId(uuidv4()),
  linkedAt: new Date(),
  state: 'healthy',
  lastValidatedAt: null,
  descriptor: {
    name: 'acme-marketplace',
    plugins: [],
    vendor: 'anthropic',
    raw: {},
  },
  pluginCount: 0,
  errorKind: null,
  errorDetail: null,
  pendingPrUrl: null,
  outdatedPluginSlugs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
  ...overrides,
});

const buildInstallation = (
  overrides: Partial<PluginInstallation> = {},
): PluginInstallation =>
  ({
    id: createPluginInstallationId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    marketplaceId: createMarketplaceId(uuidv4()),
    pluginSlug: 'my-plugin',
    packageId: null,
    installedVersion: null,
    scope: 'user',
    userId: null,
    anonymousIdHash: null,
    anonymousEmailMasked: null,
    identityKey: '',
    repoRemoteUrl: null,
    repoKey: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }) as PluginInstallation;

const buildCommand = (
  overrides: Partial<TrackPluginInstallHeartbeatCommand> = {},
): TrackPluginInstallHeartbeatCommand => ({
  trackingToken: 'test-token-123',
  pluginSlug: 'my-plugin',
  marketplaceName: 'acme-marketplace',
  scope: 'user',
  ...overrides,
});

describe('TrackPluginInstallHeartbeatUseCase', () => {
  let pluginInstallationRepository: jest.Mocked<IPluginInstallationRepository>;
  let marketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let packageService: jest.Mocked<PackageService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let useCase: TrackPluginInstallHeartbeatUseCase;
  let marketplace: Marketplace;

  beforeEach(() => {
    marketplace = buildMarketplace();

    marketplaceRepository = {
      findByTrackingToken: jest.fn().mockResolvedValue(marketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    pluginInstallationRepository = {
      upsertHeartbeat: jest.fn(),
      listByMarketplace: jest.fn(),
    } as unknown as jest.Mocked<IPluginInstallationRepository>;

    packageService = {
      getPackagesBySlugsWithArtefacts: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PackageService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new TrackPluginInstallHeartbeatUseCase(
      pluginInstallationRepository,
      marketplaceRepository,
      packageService,
      eventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the tracking token is invalid', () => {
    beforeEach(() => {
      marketplaceRepository.findByTrackingToken.mockResolvedValue(null);
    });

    it('throws an UnauthorizedError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toMatchObject({
        name: 'UnauthorizedError',
      });
    });

    it('does not upsert any row', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(
        pluginInstallationRepository.upsertHeartbeat,
      ).not.toHaveBeenCalled();
    });

    it('does not emit any event', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when creating a new anonymous installation', () => {
    let installation: PluginInstallation;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      installation = buildInstallation({
        marketplaceId: marketplace.id,
        organizationId: marketplace.organizationId,
        anonymousIdHash: 'abc123hash',
        identityKey: 'abc123hash',
      });
      const upsertResult: UpsertHeartbeatResult = {
        created: true,
        installation,
      };
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue(
        upsertResult,
      );

      result = await useCase.execute(
        buildCommand({ anonymousIdHash: 'abc123hash' }),
      );
    });

    it('returns created = true', () => {
      expect(result.created).toBe(true);
    });

    it('returns the correct marketplaceId', () => {
      expect(result.marketplaceId).toBe(marketplace.id);
    });

    it('emits a PluginInstallTrackedEvent', () => {
      const emitted = eventEmitterService.emit.mock
        .calls[0][0] as PluginInstallTrackedEvent;
      expect(emitted).toBeInstanceOf(PluginInstallTrackedEvent);
    });

    it('emits the event with the anonymous id hash', () => {
      const emitted = eventEmitterService.emit.mock
        .calls[0][0] as PluginInstallTrackedEvent;
      expect(emitted.payload.anonymousIdHash).toBe('abc123hash');
    });

    it('emits the event with a null userId', () => {
      const emitted = eventEmitterService.emit.mock
        .calls[0][0] as PluginInstallTrackedEvent;
      expect(emitted.payload.userId).toBeNull();
    });
  });

  describe('when creating a new attributed installation', () => {
    let installation: PluginInstallation;
    let result: Awaited<ReturnType<typeof useCase.execute>>;
    const verifiedUserId = uuidv4();

    beforeEach(async () => {
      installation = buildInstallation({
        marketplaceId: marketplace.id,
        organizationId: marketplace.organizationId,
        userId: createUserId(verifiedUserId),
        identityKey: verifiedUserId,
      });
      const upsertResult: UpsertHeartbeatResult = {
        created: true,
        installation,
      };
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue(
        upsertResult,
      );

      result = await useCase.execute(
        buildCommand({
          verifiedUserId,
          verifiedUserOrgId: marketplace.organizationId as string,
        }),
      );
    });

    it('returns created = true', () => {
      expect(result.created).toBe(true);
    });

    it('passes the verified userId to the repository', () => {
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ userId: verifiedUserId }),
      );
    });

    it('emits a PluginInstallTrackedEvent with the userId', () => {
      const emitted = eventEmitterService.emit.mock
        .calls[0][0] as PluginInstallTrackedEvent;
      expect(emitted.payload.userId).toBe(createUserId(verifiedUserId));
    });
  });

  describe('when the API key belongs to a different org (cross-org)', () => {
    const crossOrgUserId = uuidv4();
    const crossOrgId = uuidv4(); // different from marketplace.organizationId

    beforeEach(() => {
      const installation = buildInstallation({
        marketplaceId: marketplace.id,
        organizationId: marketplace.organizationId,
        // userId should remain null — cross-org key must not attribute
        userId: null,
        identityKey: '',
      });
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue({
        created: true,
        installation,
      });
    });

    it('falls back to anonymous and does not set userId', async () => {
      await useCase.execute(
        buildCommand({
          verifiedUserId: crossOrgUserId,
          verifiedUserOrgId: crossOrgId,
        }),
      );
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });

    it('still upserts the heartbeat row anonymously', async () => {
      await useCase.execute(
        buildCommand({
          verifiedUserId: crossOrgUserId,
          verifiedUserOrgId: crossOrgId,
          anonymousIdHash: 'anon-hash-123',
        }),
      );
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          anonymousIdHash: 'anon-hash-123',
        }),
      );
    });
  });

  describe('when upgrading anonymous to attributed', () => {
    const verifiedUserId = uuidv4();

    beforeEach(() => {
      const installation = buildInstallation({
        userId: createUserId(verifiedUserId),
        identityKey: verifiedUserId,
      });
      // Upgrade returns created = false (not a new INSERT)
      const upsertResult: UpsertHeartbeatResult = {
        created: false,
        installation,
      };
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue(
        upsertResult,
      );
    });

    describe('when upgrading anonymous to attributed', () => {
      it('does not emit an event', async () => {
        await useCase.execute(
          buildCommand({
            verifiedUserId,
            verifiedUserOrgId: marketplace.organizationId as string,
            anonymousIdHash: 'abc123hash',
          }),
        );
        expect(eventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });

  describe('when bumping updatedAt without creation', () => {
    beforeEach(() => {
      const installation = buildInstallation({
        anonymousIdHash: 'abc123hash',
        identityKey: 'abc123hash',
        updatedAt: new Date(),
      });
      const upsertResult: UpsertHeartbeatResult = {
        created: false,
        installation,
      };
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue(
        upsertResult,
      );
    });

    it('returns created = false', async () => {
      const result = await useCase.execute(
        buildCommand({ anonymousIdHash: 'abc123hash' }),
      );
      expect(result.created).toBe(false);
    });

    it('does not emit an event', async () => {
      await useCase.execute(buildCommand({ anonymousIdHash: 'abc123hash' }));
      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the packageId can be resolved from pluginSlug', () => {
    const packageId = createPackageId(uuidv4());

    beforeEach(async () => {
      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        {
          id: packageId,
          slug: 'my-plugin',
        } as import('@packmind/types').PackageWithArtefacts,
      ]);
      const installation = buildInstallation({ packageId });
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue({
        created: true,
        installation,
      });
      await useCase.execute(buildCommand());
    });

    it('passes the packageId to the repository', () => {
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: packageId as string }),
      );
    });
  });

  describe('when the heartbeat reports an installed version', () => {
    beforeEach(async () => {
      const installation = buildInstallation({ installedVersion: '0.1.0' });
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue({
        created: true,
        installation,
      });
      await useCase.execute(buildCommand({ installedVersion: '0.1.0' }));
    });

    it('passes the installedVersion to the repository', () => {
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ installedVersion: '0.1.0' }),
      );
    });
  });

  describe('when the heartbeat omits an installed version', () => {
    beforeEach(async () => {
      const installation = buildInstallation();
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue({
        created: true,
        installation,
      });
      await useCase.execute(buildCommand());
    });

    it('passes installedVersion as null to the repository', () => {
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ installedVersion: null }),
      );
    });
  });

  describe('when the scope is project with a repo URL', () => {
    beforeEach(async () => {
      const installation = buildInstallation({
        scope: 'project',
        repoRemoteUrl: 'https://github.com/acme/frontend.git',
        repoKey: 'acme/frontend',
      });
      pluginInstallationRepository.upsertHeartbeat.mockResolvedValue({
        created: true,
        installation,
      });
      await useCase.execute(
        buildCommand({
          scope: 'project',
          repoRemoteUrl: 'https://github.com/acme/frontend.git',
        }),
      );
    });

    it('passes the raw repoRemoteUrl to the repository', () => {
      expect(pluginInstallationRepository.upsertHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({
          repoRemoteUrl: 'https://github.com/acme/frontend.git',
        }),
      );
    });
  });
});
