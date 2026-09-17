import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  CommandVersion,
  IAccountsPort,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  ListPackageReleasesCommand,
  Organization,
  Package,
  PackageRelease,
  SkillVersion,
  StandardVersion,
  User,
  createCommandId,
  createCommandVersionId,
  createOrganizationId,
  createPackageReleaseId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test';
import { v4 as uuidv4 } from 'uuid';
import { packageFactory } from '../../../../test';
import { ListPackageReleasesUseCase } from './ListPackageReleasesUseCase';
import { PackageService } from '../../services/PackageService';
import { PackageReleaseService } from '../../services/PackageReleaseService';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';

describe('ListPackageReleasesUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const userId = createUserId(uuidv4());
  const someoneElse = createUserId(uuidv4());

  const commandId = createCommandId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());

  const commandVersionId = createCommandVersionId(uuidv4());
  const olderCommandVersionId = createCommandVersionId(uuidv4());
  const standardVersionId = createStandardVersionId(uuidv4());
  const skillVersionId = createSkillVersionId(uuidv4());

  const organization: Organization = {
    id: organizationId,
    name: 'Acme',
    slug: 'acme',
  };

  const user: User = userFactory({
    id: userId,
    email: 'member@test.com',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  const buildPackage = (overrides: Partial<Package> = {}): Package =>
    packageFactory({
      name: 'Backend playbook',
      description: 'Everything the backend team agrees on',
      spaceId,
      createdBy: someoneElse,
      recipes: [commandId],
      standards: [standardId],
      skills: [skillId],
      ...overrides,
    });

  const buildCommandVersion = (version: number): CommandVersion => ({
    id: version === 3 ? commandVersionId : olderCommandVersionId,
    recipeId: commandId,
    name: 'Work with Jest',
    slug: 'work-with-jest',
    content: 'content',
    version,
    userId,
  });

  const buildStandardVersion = (): StandardVersion => ({
    id: standardVersionId,
    standardId,
    name: 'A standard',
    slug: 'a-standard',
    description: 'description',
    version: 2,
    scope: null,
    userId,
  });

  const buildSkillVersion = (): SkillVersion => ({
    id: skillVersionId,
    skillId,
    version: 5,
    userId,
    name: 'A skill',
    slug: 'a-skill',
    description: 'description',
    prompt: 'prompt',
  });

  const buildRelease = (
    version: string,
    overrides: Partial<PackageRelease> = {},
  ): PackageRelease => ({
    id: createPackageReleaseId(uuidv4()),
    packageId: pkg.id,
    version,
    name: 'Backend playbook',
    description: 'Everything the backend team agrees on',
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
    ...overrides,
  });

  /** A release pinning exactly what the package currently resolves to. */
  const buildIdenticalRelease = (version: string): PackageRelease =>
    buildRelease(version, {
      recipeVersions: [buildCommandVersion(3)],
      standardVersions: [buildStandardVersion()],
      skillVersions: [buildSkillVersion()],
    });

  /** A release pinning version 2 of the command, which is now at 3. */
  const buildBehindRelease = (version: string): PackageRelease =>
    buildRelease(version, {
      recipeVersions: [buildCommandVersion(2)],
      standardVersions: [buildStandardVersion()],
      skillVersions: [buildSkillVersion()],
    });

  let pkg: Package;
  let useCase: ListPackageReleasesUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let commandsPort: jest.Mocked<ICommandsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let packageService: jest.Mocked<PackageService>;
  let packageReleaseService: jest.Mocked<PackageReleaseService>;
  let services: jest.Mocked<DeploymentsServices>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const buildCommand = (): ListPackageReleasesCommand => ({
    userId,
    organizationId,
    spaceId,
    packageId: pkg.id,
  });

  beforeEach(() => {
    pkg = buildPackage();

    packageService = {
      findById: jest.fn().mockResolvedValue(pkg),
    } as unknown as jest.Mocked<PackageService>;

    packageReleaseService = {
      createRelease: jest.fn(),
      listReleases: jest.fn().mockResolvedValue([]),
      findByVersion: jest.fn(),
    } as unknown as jest.Mocked<PackageReleaseService>;

    services = {
      getPackageService: jest.fn().mockReturnValue(packageService),
      getPackageReleaseService: jest
        .fn()
        .mockReturnValue(packageReleaseService),
    } as unknown as jest.Mocked<DeploymentsServices>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    commandsPort = {
      listCommandVersions: jest
        .fn()
        .mockResolvedValue([
          buildCommandVersion(1),
          buildCommandVersion(3),
          buildCommandVersion(2),
        ]),
    } as unknown as jest.Mocked<ICommandsPort>;

    standardsPort = {
      getLatestStandardVersion: jest
        .fn()
        .mockResolvedValue(buildStandardVersion()),
    } as unknown as jest.Mocked<IStandardsPort>;

    skillsPort = {
      getLatestSkillVersion: jest.fn().mockResolvedValue(buildSkillVersion()),
    } as unknown as jest.Mocked<ISkillsPort>;

    stubbedLogger = stubLogger();

    useCase = new ListPackageReleasesUseCase(
      accountsPort,
      services,
      commandsPort,
      standardsPort,
      skillsPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the package has never been released', () => {
    it('reports a null current version rather than the 0.0.0 sentinel', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.currentVersion).toBeNull();
    });

    it('lists no release', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.releases).toEqual([]);
    });

    it('is ready to be released', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.verdict).toBe('ready');
    });

    it('offers 0.0.1, 0.1.0 and 1.0.0', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.nextVersions).toEqual([
        '0.0.1',
        '0.1.0',
        '1.0.0',
      ]);
    });

    it('names no outdated component', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.outdatedComponents).toEqual([]);
    });
  });

  describe('when the package holds no component', () => {
    beforeEach(() => {
      packageService.findById.mockResolvedValue(
        buildPackage({ recipes: [], standards: [], skills: [] }),
      );
    });

    it('reports no_components', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.verdict).toBe('no_components');
    });
  });

  describe('when the package is identical to its latest release', () => {
    beforeEach(() => {
      packageReleaseService.listReleases.mockResolvedValue([
        buildIdenticalRelease('0.1.0'),
      ]);
    });

    it('reports no_change', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.verdict).toBe('no_change');
    });

    it('returns an empty outdated component array rather than omitting it', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.outdatedComponents).toEqual([]);
    });

    it('summarises a release with its version and nothing else', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.releases).toEqual([{ version: '0.1.0' }]);
    });
  });

  describe('when a pinned component has a newer version available', () => {
    beforeEach(() => {
      packageReleaseService.listReleases.mockResolvedValue([
        buildBehindRelease('0.1.0'),
      ]);
    });

    it('is ready to be released', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.verdict).toBe('ready');
    });

    it('names the component that has fallen behind', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.outdatedComponents).toEqual([
        {
          family: 'recipe',
          id: commandId,
          name: 'Work with Jest',
          pinnedVersion: 2,
          latestVersion: 3,
        },
      ]);
    });
  });

  describe('when releases are 0.9.0 and 0.10.0', () => {
    beforeEach(() => {
      packageReleaseService.listReleases.mockResolvedValue([
        buildRelease('0.9.0'),
        buildRelease('0.10.0'),
      ]);
    });

    it('lists them newest first by parsed triple', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.releases).toEqual([
        { version: '0.10.0' },
        { version: '0.9.0' },
      ]);
    });

    it('reports 0.10.0 as the current version', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.currentVersion).toBe('0.10.0');
    });

    it('offers the three increments of 0.10.0', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.nextVersions).toEqual([
        '0.10.1',
        '0.11.0',
        '1.0.0',
      ]);
    });
  });

  describe('when a component has no version at all', () => {
    beforeEach(() => {
      commandsPort.listCommandVersions.mockResolvedValue([]);
      packageReleaseService.listReleases.mockResolvedValue([
        buildBehindRelease('0.1.0'),
      ]);
    });

    it('answers instead of throwing', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.currentVersion).toBe('0.1.0');
    });

    it('omits the unresolved component from the outdated list', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.outdatedComponents).toEqual([]);
    });

    it('ListPackageReleasesUseCase: returns ready verdict when an unresolved component differs from the release', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.readiness.verdict).toBe('ready');
    });
  });

  it('raises PackageNotFoundError when the package does not exist', async () => {
    packageService.findById.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
  });
});
