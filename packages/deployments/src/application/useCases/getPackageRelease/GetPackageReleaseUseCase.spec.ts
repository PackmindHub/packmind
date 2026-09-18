import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  CommandVersion,
  GetPackageReleaseCommand,
  IAccountsPort,
  ISpacesPort,
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
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test';
import { v4 as uuidv4 } from 'uuid';
import { packageFactory } from '../../../../test';
import { GetPackageReleaseUseCase } from './GetPackageReleaseUseCase';
import { PackageService } from '../../services/PackageService';
import { PackageReleaseService } from '../../services/PackageReleaseService';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseNotFoundError } from '../../../domain/errors/PackageReleaseNotFoundError';

describe('GetPackageReleaseUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
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

  const buildCommandVersion = (): CommandVersion => ({
    id: commandVersionId,
    recipeId: commandId,
    name: 'A command',
    slug: 'a-command',
    content: 'content',
    version: 1,
    userId,
  });

  const buildStandardVersion = (): StandardVersion => ({
    id: standardVersionId,
    standardId,
    name: 'A standard',
    slug: 'a-standard',
    description: 'description',
    version: 1,
    scope: null,
    userId,
  });

  const buildSkillVersion = (): SkillVersion => ({
    id: skillVersionId,
    skillId,
    version: 1,
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

  let pkg: Package;
  let useCase: GetPackageReleaseUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let packageService: jest.Mocked<PackageService>;
  let packageReleaseService: jest.Mocked<PackageReleaseService>;
  let services: jest.Mocked<DeploymentsServices>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const buildCommand = (version: string): GetPackageReleaseCommand => ({
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
      createRelease: jest.fn(),
      listReleases: jest.fn(),
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

    spacesPort = mockInterface<ISpacesPort>();
    spacesPort.findMembership.mockResolvedValue({
      userId,
      spaceId,
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
    });

    stubbedLogger = stubLogger();

    useCase = new GetPackageReleaseUseCase(
      spacesPort,
      accountsPort,
      services,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('return the release with everything it pinned', async () => {
    const release = buildRelease('1.0.0', {
      recipeVersions: [buildCommandVersion()],
      standardVersions: [buildStandardVersion()],
      skillVersions: [buildSkillVersion()],
    });

    packageReleaseService.findByVersion.mockResolvedValue(release);

    const result = await useCase.execute(buildCommand('1.0.0'));

    expect(result.release.recipeVersions).toHaveLength(1);
    expect(result.release.standardVersions).toHaveLength(1);
    expect(result.release.skillVersions).toHaveLength(1);
  });

  it('return a release that pins a component which no longer exists', async () => {
    const deletedCommandVersion: CommandVersion = {
      id: createCommandVersionId(uuidv4()),
      recipeId: createCommandId(uuidv4()),
      name: 'Deleted command',
      slug: 'deleted-command',
      content: 'content',
      version: 1,
      userId,
    };

    const release = buildRelease('1.0.0', {
      recipeVersions: [deletedCommandVersion],
      standardVersions: [buildStandardVersion()],
      skillVersions: [buildSkillVersion()],
    });

    packageReleaseService.findByVersion.mockResolvedValue(release);

    const result = await useCase.execute(buildCommand('1.0.0'));

    expect(result.release.recipeVersions).toContainEqual(deletedCommandVersion);
  });

  it('throw PackageReleaseNotFoundError when the package has no such version', async () => {
    packageReleaseService.findByVersion.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand('2.0.0'))).rejects.toBeInstanceOf(
      PackageReleaseNotFoundError,
    );
  });

  it('throw PackageNotFoundError when the package does not exist', async () => {
    packageService.findById.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand('1.0.0'))).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
    expect(packageReleaseService.findByVersion).not.toHaveBeenCalled();
  });

  it('raises PackageNotFoundError when the package belongs to another space', async () => {
    const otherSpaceId = createSpaceId(uuidv4());
    packageService.findById.mockResolvedValue(
      buildPackage({ spaceId: otherSpaceId }),
    );

    await expect(useCase.execute(buildCommand('1.0.0'))).rejects.toBeInstanceOf(
      PackageNotFoundError,
    );
    expect(packageReleaseService.findByVersion).not.toHaveBeenCalled();
  });

  it('read a release the caller did not create', async () => {
    const release = buildRelease('1.0.0', {
      recipeVersions: [buildCommandVersion()],
      standardVersions: [buildStandardVersion()],
      skillVersions: [buildSkillVersion()],
    });

    packageReleaseService.findByVersion.mockResolvedValue(release);

    const result = await useCase.execute(buildCommand('1.0.0'));

    expect(result.release.version).toBe('1.0.0');
  });

  it('refuses a caller who is not a member of the space', async () => {
    spacesPort.findMembership.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand('1.0.0'))).rejects.toBeInstanceOf(
      SpaceMembershipRequiredError,
    );
    expect(packageReleaseService.findByVersion).not.toHaveBeenCalled();
  });
});
