import { PackmindLogger } from '@packmind/logger';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  CreateStandardWithPackagesCommand,
  IAccountsPort,
  IDeploymentPort,
  ISpacesPort,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { spaceFactory } from '@packmind/spaces/test';
import { CreateStandardWithExamplesUseCase } from '../createStandardWithExamples/CreateStandardWithExamplesUseCase';
import { MultiplePackagesRequestedError } from '../../../domain/errors/MultiplePackagesRequestedError';
import { CreateStandardWithPackagesUseCase } from './CreateStandardWithPackagesUseCase';

describe('CreateStandardWithPackagesUseCase', () => {
  let useCase: CreateStandardWithPackagesUseCase;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let deploymentsPort: jest.Mocked<IDeploymentPort>;
  let createStandardWithExamples: jest.Mocked<CreateStandardWithExamplesUseCase>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const buildCommand = (
    packageSlugs: string[],
  ): CreateStandardWithPackagesCommand => ({
    userId,
    organizationId,
    spaceId,
    name: 'Naming rules',
    description: 'How we name things',
    scope: null,
    rules: [],
    packageSlugs,
    method: 'blank',
  });

  beforeEach(() => {
    spacesPort = mockInterface<ISpacesPort>();
    spacesPort.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, organizationId }),
    );
    spacesPort.findMembership.mockResolvedValue({
      userId,
      spaceId,
      role: 'member',
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
    } as never);

    accountsPort = mockInterface<IAccountsPort>();
    accountsPort.getUserById.mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      displayName: null,
      passwordHash: 'hashed_password',
      memberships: [{ organizationId, role: 'member', userId }],
      active: true,
    });
    accountsPort.getOrganizationById.mockResolvedValue({
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    });

    deploymentsPort = mockInterface<IDeploymentPort>();
    createStandardWithExamples =
      mockInterface<CreateStandardWithExamplesUseCase>();

    stubbedLogger = stubLogger();

    useCase = new CreateStandardWithPackagesUseCase(
      spacesPort,
      accountsPort,
      createStandardWithExamples,
      deploymentsPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
   * A standard belongs to a single package, so this request cannot be satisfied
   * as written. It used to be discovered while placing the standard — after it
   * had been created — and swallowed by the catch that keeps a created standard
   * from being lost to a failed link, so the caller was told it had all worked.
   */
  describe('when several packages are asked for', () => {
    let executePromise: Promise<unknown>;

    beforeEach(() => {
      executePromise = useCase.execute(
        buildCommand(['@space/pkg-a', '@space/pkg-b']),
      );
      executePromise.catch(() => undefined);
    });

    it('refuses the request', async () => {
      await expect(executePromise).rejects.toBeInstanceOf(
        MultiplePackagesRequestedError,
      );
    });

    it('names the packages it was given', async () => {
      await expect(executePromise).rejects.toThrow(
        'A standard belongs to a single package, and 2 were given: "@space/pkg-a", "@space/pkg-b". Name the one it should ship from.',
      );
    });

    it('creates no standard', async () => {
      await executePromise.catch(() => undefined);

      expect(
        createStandardWithExamples.createStandardWithExamples,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when a single package is asked for', () => {
    beforeEach(async () => {
      createStandardWithExamples.createStandardWithExamples.mockResolvedValue({
        id: 'standard-1',
        spaceId,
      } as never);
      deploymentsPort.listPackages.mockResolvedValue({ packages: [] });

      await useCase
        .execute(buildCommand(['@space/pkg-a']))
        .catch(() => undefined);
    });

    it('creates the standard', () => {
      expect(
        createStandardWithExamples.createStandardWithExamples,
      ).toHaveBeenCalled();
    });
  });
});
