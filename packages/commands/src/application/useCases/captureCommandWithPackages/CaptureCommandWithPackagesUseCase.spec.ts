import { mockInterface } from '@packmind/test-utils';
import {
  CaptureCommandWithPackagesCommand,
  IAccountsPort,
  IDeploymentPort,
  ISpacesPort,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { spaceFactory } from '@packmind/spaces/test';
import { CaptureCommandUseCase } from '../captureCommand/CaptureCommandUseCase';
import { MultiplePackagesRequestedError } from '../../../domain/errors';
import { CaptureCommandWithPackagesUseCase } from './CaptureCommandWithPackagesUseCase';

describe('CaptureCommandWithPackagesUseCase', () => {
  let useCase: CaptureCommandWithPackagesUseCase;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let deploymentsPort: jest.Mocked<IDeploymentPort>;
  let captureCommand: jest.Mocked<CaptureCommandUseCase>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const buildCommand = (
    packageSlugs: string[],
  ): CaptureCommandWithPackagesCommand => ({
    userId,
    organizationId,
    spaceId,
    name: 'Deploy',
    summary: 'How we deploy',
    whenToUse: [],
    contextValidationCheckpoints: [],
    steps: [],
    packageSlugs,
  });

  beforeEach(() => {
    spacesPort = mockInterface<ISpacesPort>();
    spacesPort.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, organizationId }),
    );

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
    captureCommand = mockInterface<CaptureCommandUseCase>();

    useCase = new CaptureCommandWithPackagesUseCase(
      accountsPort,
      captureCommand,
      deploymentsPort,
      spacesPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
   * A command belongs to a single package, so this request cannot be satisfied
   * as written. It used to be discovered while placing the command — after it
   * had been captured — and swallowed by the catch that keeps a captured
   * command from being lost to a failed link, so the caller was told it had all
   * worked.
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
        'A command belongs to a single package, and 2 were given: "@space/pkg-a", "@space/pkg-b". Name the one it should ship from.',
      );
    });

    it('captures no command', async () => {
      await executePromise.catch(() => undefined);

      expect(captureCommand.execute).not.toHaveBeenCalled();
    });
  });

  describe('when a single package is asked for', () => {
    beforeEach(async () => {
      captureCommand.execute.mockResolvedValue({
        id: 'command-1',
        spaceId,
      } as never);

      await useCase
        .execute(buildCommand(['@space/pkg-a']))
        .catch(() => undefined);
    });

    it('captures the command', () => {
      expect(captureCommand.execute).toHaveBeenCalled();
    });
  });
});
