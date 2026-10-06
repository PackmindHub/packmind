import {
  LockFileDistributionRecorder,
  RecordLockFileCommand,
} from './LockFileDistributionRecorder';
import {
  RenderMode,
  createDistributedPackageId,
  createDistributionId,
  createOrganizationId,
  createPackageId,
  createGitRepoId,
  createCommandId,
  createCommandVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  DistributionRecordedEvent,
  ICommandsPort,
  NotifyArtefactsDistributionResponse,
  ISkillsPort,
  IStandardsPort,
  ISpacesPort,
  PackageReleaseDetail,
  PackmindLockFile,
  CommandVersion,
  DistributedPackage,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import {
  mockInterface,
  stubLogger,
  createMockInstance,
} from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { PackageService } from './PackageService';
import { PackageReleaseService } from './PackageReleaseService';
import { packageFactory } from '../../../test/packageFactory';
import { spaceFactory } from '@packmind/spaces/test';
import { v4 as uuidv4 } from 'uuid';
import { commandVersionFactory } from '@packmind/commands/test';
import { standardVersionFactory } from '@packmind/standards/test';
import { skillVersionFactory } from '@packmind/skills/test';

describe('LockFileDistributionRecorder', () => {
  let recorder: LockFileDistributionRecorder;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockPackageReleaseService: jest.Mocked<PackageReleaseService>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const secondPackageId = createPackageId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const recipeId = createCommandId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const myPackage = packageFactory({
    id: packageId,
    spaceId,
    slug: 'my-package',
  });
  const secondPackage = packageFactory({
    id: secondPackageId,
    spaceId,
    slug: 'second-package',
  });

  const buildTarget = (): Target => ({
    id: targetId,
    name: 'Default',
    path: '/',
    gitRepoId,
  });

  const buildStandardVersion = (): StandardVersion =>
    standardVersionFactory({
      id: createStandardVersionId(uuidv4()),
      standardId,
      version: 1,
      description: 'Test standard description',
      name: 'Test Standard',
      rules: [],
      slug: 'test-standard',
      scope: null,
    });

  const buildCommandVersion = (): CommandVersion =>
    commandVersionFactory({
      id: createCommandVersionId(uuidv4()),
      recipeId,
      version: 1,
      name: 'Test Recipe',
      slug: 'test-recipe',
      content: 'Test step',
      userId,
    });

  const buildSkillVersion = (): SkillVersion =>
    skillVersionFactory({
      id: createSkillVersionId(uuidv4()),
      skillId,
      version: 1,
      name: 'Test Skill',
      slug: 'test-skill',
      description: 'Test skill description',
      prompt: 'Test prompt',
      userId,
    });

  const buildLockFile = (
    overrides: Partial<PackmindLockFile> = {},
  ): PackmindLockFile => ({
    lockfileVersion: 1,
    packageSlugs: ['@my-space/my-package'],
    agents: ['cursor'],
    targetId: String(targetId),
    artifacts: {
      [`standard:test-standard`]: {
        name: 'Test Standard',
        type: 'standard',
        id: String(standardId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
        source: 'user',
      },
      [`command:test-recipe`]: {
        name: 'Test Recipe',
        type: 'command',
        id: String(recipeId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
        source: 'user',
      },
      [`skill:test-skill`]: {
        name: 'Test Skill',
        type: 'skill',
        id: String(skillId),
        version: 1,
        spaceId: String(spaceId),
        packageIds: [String(packageId)],
        files: [],
        source: 'user',
      },
    },
    ...overrides,
  });

  const buildCommand = (
    overrides: Partial<RecordLockFileCommand> = {},
  ): RecordLockFileCommand => ({
    target: buildTarget(),
    lockFile: buildLockFile(),
    organizationId,
    userId,
    source: 'cli',
    branch: 'main',
    ...overrides,
  });

  const activePackage = (
    overrides: Partial<DistributedPackage> = {},
  ): DistributedPackage => ({
    id: createDistributedPackageId(uuidv4()),
    distributionId: createDistributionId(uuidv4()),
    packageId,
    operation: 'add',
    versionSpec: null,
    latestReleaseVersion: null,
    standardVersions: [],
    recipeVersions: [],
    skillVersions: [],
    ...overrides,
  });

  const recordedRows = () =>
    (mockDistributedPackageRepository.add as jest.Mock).mock.calls.map(
      ([row]) => row,
    );

  const recordedRow = (id = packageId) =>
    recordedRows().find((row) => String(row.packageId) === String(id));

  const withoutArtifactVersions = () => {
    mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(null);
    mockCommandsPort.getCommandVersion.mockResolvedValue(null);
    mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(null);
  };

  beforeEach(() => {
    mockCommandsPort = mockInterface<ICommandsPort>();
    mockStandardsPort = mockInterface<IStandardsPort>();
    mockSkillsPort = mockInterface<ISkillsPort>();

    mockDistributionRepository = mockInterface<IDistributionRepository>();
    mockDistributionRepository.add.mockImplementation((d) =>
      Promise.resolve(d),
    );
    mockDistributionRepository.findActiveDistributedPackagesByTarget.mockResolvedValue(
      [],
    );

    mockDistributedPackageRepository =
      mockInterface<IDistributedPackageRepository>();

    mockRenderModeConfigurationService = createMockInstance(
      RenderModeConfigurationService,
    );
    mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
      [RenderMode.CURSOR],
    );

    mockEventEmitterService = createMockInstance(PackmindEventEmitterService);

    mockPackageService = createMockInstance(PackageService);
    mockPackageService.getPackagesByIdsInOrganization.mockResolvedValue([
      myPackage,
    ]);
    mockPackageService.getPackagesByOrganizationId.mockResolvedValue([
      myPackage,
      secondPackage,
    ]);
    mockSpacesPort = mockInterface<ISpacesPort>();
    mockSpacesPort.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, slug: 'my-space' }),
    );
    mockSpacesPort.getSpaceBySlug.mockImplementation(async (slug) =>
      slug === 'my-space' ? spaceFactory({ id: spaceId, slug }) : null,
    );
    mockSpacesPort.getDefaultSpace.mockResolvedValue({
      defaultSpace: spaceFactory({ id: spaceId, slug: 'my-space' }),
    });
    mockPackageReleaseService = createMockInstance(PackageReleaseService);
    mockPackageReleaseService.findLatestByPackageIds.mockResolvedValue(
      new Map(),
    );

    recorder = new LockFileDistributionRecorder(
      mockCommandsPort,
      mockStandardsPort,
      mockSkillsPort,
      mockSpacesPort,
      mockDistributionRepository,
      mockDistributedPackageRepository,
      mockRenderModeConfigurationService,
      mockPackageService,
      mockPackageReleaseService,
      mockEventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with a lock file containing standards, recipes, and skills', () => {
    let standardVersion: StandardVersion;
    let recipeVersion: CommandVersion;
    let skillVersion: SkillVersion;
    let result: NotifyArtefactsDistributionResponse;

    beforeEach(async () => {
      standardVersion = buildStandardVersion();
      recipeVersion = buildCommandVersion();
      skillVersion = buildSkillVersion();

      mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(
        standardVersion,
      );
      mockCommandsPort.getCommandVersion.mockResolvedValue(recipeVersion);
      mockSkillsPort.getSkillVersionByNumber.mockResolvedValue(skillVersion);

      result = await recorder.record(buildCommand());
    });

    it('resolves the standard version from the lock file version number', () => {
      expect(mockStandardsPort.getStandardVersionByNumber).toHaveBeenCalledWith(
        standardId,
        1,
        [spaceId],
      );
    });

    it('resolves the recipe version from the lock file version number', () => {
      expect(mockCommandsPort.getCommandVersion).toHaveBeenCalledWith(
        recipeId,
        1,
        [spaceId],
      );
    });

    it('resolves the skill version from the lock file version number', () => {
      expect(mockSkillsPort.getSkillVersionByNumber).toHaveBeenCalledWith(
        skillId,
        1,
        [spaceId],
      );
    });

    it('creates a distribution record with the given source', () => {
      expect(mockDistributionRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          status: 'success',
          source: 'cli',
        }),
      );
    });

    it('saves the distributed package with the resolved standard version ID', () => {
      expect(
        mockDistributedPackageRepository.addStandardVersions,
      ).toHaveBeenCalledWith(expect.anything(), [standardVersion.id]);
    });

    it('saves the distributed package with the resolved recipe version ID', () => {
      expect(
        mockDistributedPackageRepository.addCommandVersions,
      ).toHaveBeenCalledWith(expect.anything(), [recipeVersion.id]);
    });

    it('saves the distributed package with the resolved skill version ID', () => {
      expect(
        mockDistributedPackageRepository.addSkillVersions,
      ).toHaveBeenCalledWith(expect.anything(), [skillVersion.id]);
    });

    it('reports the distribution as updated', () => {
      expect(result).toEqual({
        deploymentId: expect.any(String),
        status: 'updated',
        warnings: [],
      });
    });
  });

  describe('with a lock file that uses agents for render modes', () => {
    beforeEach(async () => {
      withoutArtifactVersions();

      await recorder.record(
        buildCommand({
          lockFile: buildLockFile({ agents: ['cursor', 'claude'] }),
        }),
      );
    });

    it('maps lock file agents to render modes', () => {
      expect(
        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes,
      ).toHaveBeenCalledWith(['cursor', 'claude']);
    });
  });

  describe('when the lock does not record package versions', () => {
    const record = (packageVersions?: Record<string, string>) =>
      recorder.record(buildCommand({ packageVersions }));

    beforeEach(() => {
      withoutArtifactVersions();
    });

    describe('when packmind.json pins a release', () => {
      beforeEach(() => record({ '@my-space/my-package': '1.2.0' }));

      it('records the release as the spec', () => {
        expect(recordedRow()).toEqual(
          expect.objectContaining({
            versionSpec: '1.2.0',
            latestReleaseVersion: null,
          }),
        );
      });
    });

    describe('when packmind.json tracks the live package', () => {
      beforeEach(async () => {
        mockPackageReleaseService.findLatestByPackageIds.mockResolvedValue(
          new Map([[packageId, { version: '1.1.0' } as PackageReleaseDetail]]),
        );
        await record({ '@my-space/my-package': '*' });
      });

      it('records the release the live package was built on', () => {
        expect(recordedRow()).toEqual(
          expect.objectContaining({
            versionSpec: '*',
            latestReleaseVersion: '1.1.0',
          }),
        );
      });
    });

    describe('when the live package was never released', () => {
      beforeEach(() => record({ '@my-space/my-package': '*' }));

      it('records the wildcard with no base release', () => {
        expect(recordedRow()).toEqual(
          expect.objectContaining({
            versionSpec: '*',
            latestReleaseVersion: null,
          }),
        );
      });
    });

    describe('when packmind.json names the package by its bare slug', () => {
      beforeEach(() => record({ 'my-package': '1.2.0' }));

      it('still records its spec', () => {
        expect(recordedRow()?.versionSpec).toBe('1.2.0');
      });
    });

    describe('when the CLI sends no packmind.json', () => {
      beforeEach(() => record(undefined));

      it('records no spec', () => {
        expect(recordedRow()).toEqual(
          expect.objectContaining({
            versionSpec: null,
            latestReleaseVersion: null,
          }),
        );
      });
    });

    describe('when the lock file contains artifacts from multiple packages', () => {
      beforeEach(async () => {
        await recorder.record(
          buildCommand({
            lockFile: buildLockFile({
              artifacts: {
                'standard:test-standard': {
                  name: 'Test Standard',
                  type: 'standard',
                  id: String(standardId),
                  version: 1,
                  spaceId: String(spaceId),
                  packageIds: [String(packageId), String(secondPackageId)],
                  files: [],
                  source: 'user',
                },
              },
            }),
          }),
        );
      });

      it('creates an add entry for each package', () => {
        expect(recordedRows().map((row) => String(row.packageId))).toEqual(
          expect.arrayContaining([String(packageId), String(secondPackageId)]),
        );
      });
    });
  });

  describe('when the lock records package versions', () => {
    const lockWithPackages = (packages: Record<string, string>) =>
      buildLockFile({ lockfileVersion: 2, packages });

    beforeEach(() => {
      withoutArtifactVersions();
    });

    describe('when it pins a release', () => {
      beforeEach(() =>
        recorder.record(
          buildCommand({
            lockFile: lockWithPackages({ '@my-space/my-package': '1.3.0' }),
            packageVersions: { '@my-space/my-package': '1.2.3' },
          }),
        ),
      );

      it('records the version from the lock, not from packmind.json', () => {
        expect(recordedRow()?.versionSpec).toBe('1.3.0');
      });
    });

    describe('when it lists a package unknown to the organization', () => {
      let result: NotifyArtefactsDistributionResponse;

      beforeEach(async () => {
        result = await recorder.record(
          buildCommand({
            lockFile: lockWithPackages({
              '@my-space/my-package': '1.3.0',
              '@my-space/legacy': '1.0.0',
            }),
          }),
        );
      });

      it('warns about the unknown package', () => {
        expect(result.warnings).toEqual([
          { type: 'unknown_package', packageSlug: '@my-space/legacy' },
        ]);
      });

      it('still records the known package', () => {
        expect(recordedRow()?.versionSpec).toBe('1.3.0');
      });
    });

    describe('when an active package is missing from the lock', () => {
      beforeEach(() => {
        mockDistributionRepository.findActiveDistributedPackagesByTarget.mockResolvedValue(
          [activePackage({ packageId: secondPackageId, versionSpec: '2.0.0' })],
        );
      });

      describe('when packmind.json still lists it', () => {
        beforeEach(() =>
          recorder.record(
            buildCommand({
              lockFile: lockWithPackages({ '@my-space/my-package': '1.2.3' }),
              packageVersions: {
                '@my-space/my-package': '1.2.3',
                '@my-space/second-package': '2.0.0',
              },
            }),
          ),
        );

        it('keeps it distributed', () => {
          expect(recordedRow(secondPackageId)).toBeUndefined();
        });
      });

      describe('when packmind.json no longer lists it', () => {
        beforeEach(() =>
          recorder.record(
            buildCommand({
              lockFile: lockWithPackages({ '@my-space/my-package': '1.2.3' }),
              packageVersions: { '@my-space/my-package': '1.2.3' },
            }),
          ),
        );

        it('records its removal', () => {
          expect(recordedRow(secondPackageId)).toEqual(
            expect.objectContaining({ operation: 'remove' }),
          );
        });
      });
    });

    describe('when the lock matches what Packmind shows', () => {
      let result: NotifyArtefactsDistributionResponse;

      beforeEach(async () => {
        mockDistributionRepository.findActiveDistributedPackagesByTarget.mockResolvedValue(
          [activePackage({ versionSpec: '1.2.3' })],
        );

        result = await recorder.record(
          buildCommand({
            lockFile: lockWithPackages({ '@my-space/my-package': '1.2.3' }),
          }),
        );
      });

      it('records nothing', () => {
        expect(mockDistributionRepository.add).not.toHaveBeenCalled();
      });

      it('reports the target as unchanged', () => {
        expect(result).toEqual({
          deploymentId: null,
          status: 'unchanged',
          warnings: [],
        });
      });

      it('emits no event', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when the lock names a different artifact version than Packmind shows', () => {
      let standardVersion: StandardVersion;

      beforeEach(async () => {
        standardVersion = buildStandardVersion();
        mockStandardsPort.getStandardVersionByNumber.mockResolvedValue(
          standardVersion,
        );
        mockDistributionRepository.findActiveDistributedPackagesByTarget.mockResolvedValue(
          [
            activePackage({
              versionSpec: '1.2.3',
              standardVersions: [buildStandardVersion()],
            }),
          ],
        );

        await recorder.record(
          buildCommand({
            lockFile: lockWithPackages({ '@my-space/my-package': '1.2.3' }),
          }),
        );
      });

      it('records the new state', () => {
        expect(
          mockDistributedPackageRepository.addStandardVersions,
        ).toHaveBeenCalledWith(expect.anything(), [standardVersion.id]);
      });
    });
  });

  describe('distribution_recorded domain event', () => {
    beforeEach(() => {
      withoutArtifactVersions();
    });

    describe('when the CLI records a distribution', () => {
      beforeEach(async () => {
        await recorder.record(buildCommand({ branch: 'main' }));
      });

      it('emits a DistributionRecordedEvent with the repository and branch', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              userId,
              organizationId,
              source: 'cli',
              repositoryId: gitRepoId,
              branch: 'main',
            },
          }),
        );
      });

      it('emits an instance of DistributionRecordedEvent', () => {
        expect(mockEventEmitterService.emit.mock.calls[0][0]).toBeInstanceOf(
          DistributionRecordedEvent,
        );
      });
    });

    describe('when the app records a distribution', () => {
      beforeEach(async () => {
        await recorder.record(buildCommand({ source: 'app' }));
      });

      it('emits the event as coming from the UI', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({ source: 'ui' }),
          }),
        );
      });
    });
  });
});
