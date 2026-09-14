import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  CommandVersion,
  CreatePackageReleaseCommand,
  IAccountsPort,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
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
import { CreatePackageReleaseUseCase } from './CreatePackageReleaseUseCase';
import { PackageService } from '../../services/PackageService';
import { PackageReleaseService } from '../../services/PackageReleaseService';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseRefusedError } from '../../../domain/errors/PackageReleaseRefusedError';

describe('CreatePackageReleaseUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  // Deliberately not the package's createdBy: any member may release.
  const userId = createUserId(uuidv4());
  const someoneElse = createUserId(uuidv4());

  const commandId = createCommandId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());

  const commandVersionId = createCommandVersionId(uuidv4());
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
    id: version === 3 ? commandVersionId : createCommandVersionId(uuidv4()),
    recipeId: commandId,
    name: 'A command',
    slug: 'a-command',
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

  const buildRelease = (version: string): PackageRelease => ({
    id: createPackageReleaseId(uuidv4()),
    packageId: pkg.id,
    version,
    name: 'Backend playbook',
    description: 'Everything the backend team agrees on',
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
  });

  let pkg: Package;
  let useCase: CreatePackageReleaseUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let commandsPort: jest.Mocked<ICommandsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let packageService: jest.Mocked<PackageService>;
  let packageReleaseService: jest.Mocked<PackageReleaseService>;
  let services: jest.Mocked<DeploymentsServices>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const buildCommand = (version: string): CreatePackageReleaseCommand => ({
    userId,
    organizationId,
    spaceId,
    packageId: pkg.id,
    version,
  });

  beforeEach(() => {
    pkg = buildPackage();

    packageService = {
      findById: jest.fn().mockResolvedValue(pkg),
    } as unknown as jest.Mocked<PackageService>;

    packageReleaseService = {
      createRelease: jest.fn().mockImplementation(async (release) => ({
        ...release,
        recipeVersions: [],
        standardVersions: [],
        skillVersions: [],
      })),
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

    useCase = new CreatePackageReleaseUseCase(
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

  it('pins the latest version of every component it holds', async () => {
    await useCase.execute(buildCommand('0.1.0'));

    expect(packageReleaseService.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ packageId: pkg.id, version: '0.1.0' }),
      {
        recipeVersionIds: [commandVersionId],
        standardVersionIds: [standardVersionId],
        skillVersionIds: [skillVersionId],
      },
    );
  });

  it('copies the package name and description onto the release', async () => {
    await useCase.execute(buildCommand('0.1.0'));

    expect(packageReleaseService.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Backend playbook',
        description: 'Everything the backend team agrees on',
      }),
      expect.anything(),
    );
  });

  it('releases for a member who did not create the package', async () => {
    const result = await useCase.execute(buildCommand('0.1.0'));

    expect(result.release.version).toBe('0.1.0');
  });

  it('treats a never-released package as 0.0.0', async () => {
    packageReleaseService.listReleases.mockResolvedValue([]);

    const result = await useCase.execute(buildCommand('0.1.0'));

    expect(result.release.version).toBe('0.1.0');
  });

  it('refuses an empty package with no_components', async () => {
    packageService.findById.mockResolvedValue(
      buildPackage({ recipes: [], standards: [], skills: [] }),
    );

    await expect(useCase.execute(buildCommand('0.1.0'))).rejects.toMatchObject({
      name: 'PackageReleaseRefusedError',
      code: 'no_components',
      currentVersion: '0.0.0',
    });
  });

  it('refuses an empty package with no_components even when the version is malformed', async () => {
    packageService.findById.mockResolvedValue(
      buildPackage({ recipes: [], standards: [], skills: [] }),
    );

    await expect(useCase.execute(buildCommand('banana'))).rejects.toMatchObject(
      {
        code: 'no_components',
      },
    );
  });

  it('refuses a malformed version with malformed', async () => {
    await expect(useCase.execute(buildCommand('1.0'))).rejects.toMatchObject({
      code: 'malformed',
      currentVersion: '0.0.0',
    });
    expect(packageReleaseService.createRelease).not.toHaveBeenCalled();
  });

  it('refuses a version that is not greater with not_greater', async () => {
    packageReleaseService.listReleases.mockResolvedValue([
      buildRelease('1.2.0'),
    ]);

    await expect(useCase.execute(buildCommand('1.1.0'))).rejects.toMatchObject({
      code: 'not_greater',
      currentVersion: '1.2.0',
    });
  });

  it('refuses a greater non-increment version with not_an_increment', async () => {
    packageReleaseService.listReleases.mockResolvedValue([
      buildRelease('1.2.0'),
    ]);

    await expect(useCase.execute(buildCommand('1.4.0'))).rejects.toMatchObject({
      code: 'not_an_increment',
      currentVersion: '1.2.0',
    });
  });

  describe('when releases are 0.9.0 and 0.10.0', () => {
    beforeEach(() => {
      packageReleaseService.listReleases.mockResolvedValue([
        buildRelease('0.9.0'),
        buildRelease('0.10.0'),
      ]);
    });

    it('accepts 0.10.1, taking the greatest release by parsed triple', async () => {
      const result = await useCase.execute(buildCommand('0.10.1'));

      expect(result.release.version).toBe('0.10.1');
    });

    it('refuses 0.10.0 as not greater than 0.10.0', async () => {
      await expect(
        useCase.execute(buildCommand('0.10.0')),
      ).rejects.toMatchObject({
        code: 'not_greater',
        currentVersion: '0.10.0',
      });
    });
  });

  it('refuses the whole release when a command has no version', async () => {
    commandsPort.listCommandVersions.mockResolvedValue([]);

    await expect(useCase.execute(buildCommand('0.1.0'))).rejects.toThrow();
    expect(packageReleaseService.createRelease).not.toHaveBeenCalled();
  });

  it('refuses the whole release when a standard has no version', async () => {
    standardsPort.getLatestStandardVersion.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand('0.1.0'))).rejects.toThrow();
    expect(packageReleaseService.createRelease).not.toHaveBeenCalled();
  });

  it('translates a 23505 from the insert into not_greater carrying the re-read version', async () => {
    packageReleaseService.listReleases
      .mockResolvedValueOnce([buildRelease('1.2.0')])
      .mockResolvedValueOnce([buildRelease('1.2.0'), buildRelease('1.2.1')]);
    packageReleaseService.createRelease.mockRejectedValue(
      Object.assign(new Error('duplicate key value'), { code: '23505' }),
    );

    await expect(useCase.execute(buildCommand('1.2.1'))).rejects.toMatchObject({
      name: 'PackageReleaseRefusedError',
      code: 'not_greater',
      currentVersion: '1.2.1',
    });
  });

  it('rethrows a non-23505 error from the insert untouched', async () => {
    const connectionFailure = Object.assign(new Error('connection lost'), {
      code: 'ECONNRESET',
    });
    packageReleaseService.createRelease.mockRejectedValue(connectionFailure);

    await expect(useCase.execute(buildCommand('0.1.0'))).rejects.toBe(
      connectionFailure,
    );
  });

  it('raises PackageNotFoundError when the package does not exist', async () => {
    packageService.findById.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand('0.1.0'))).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
  });

  it('raises PackageReleaseRefusedError instances, not bare errors', async () => {
    await expect(useCase.execute(buildCommand('9.9.9'))).rejects.toBeInstanceOf(
      PackageReleaseRefusedError,
    );
  });
});
