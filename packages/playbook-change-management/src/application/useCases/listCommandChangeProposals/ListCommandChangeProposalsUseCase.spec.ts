import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  ListCommandChangeProposalsCommand,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { ListCommandChangeProposalsUseCase } from './ListCommandChangeProposalsUseCase';

describe('ListCommandChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const recipeId = createRecipeId('recipe-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const recipe = recipeFactory({ id: recipeId, spaceId });

  let useCase: ListCommandChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<ListCommandChangeProposalsCommand>,
  ): ListCommandChangeProposalsCommand => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
    recipeId: recipeId,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    service = {
      listProposalsByArtefactId: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new ListCommandChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      service,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when listing proposals successfully', () => {
    const command = buildCommand();
    const proposals = [
      {
        id: createChangeProposalId('proposal-1'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        artefactVersion: 1,
        spaceId,
        payload: { oldValue: 'old name', newValue: 'new name' },
        captureMode: ChangeProposalCaptureMode.commit,
        status: ChangeProposalStatus.pending,
        createdBy: createUserId(),
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outdated: false,
      },
    ];

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
      service.listProposalsByArtefactId.mockResolvedValue({
        changeProposals: proposals,
      });
    });

    it('passes current recipe to service', async () => {
      await useCase.execute(command);

      expect(service.listProposalsByArtefactId).toHaveBeenCalledWith(recipeId, {
        name: recipe.name,
        content: recipe.content,
      });
    });

    it('returns the proposals from service', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals).toEqual(proposals);
    });
  });

  describe('when recipe is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      service.listProposalsByArtefactId.mockResolvedValue({
        changeProposals: [],
      });
    });

    it('passes undefined currentRecipe to service', async () => {
      await useCase.execute(command);

      expect(service.listProposalsByArtefactId).toHaveBeenCalledWith(
        recipeId,
        undefined,
      );
    });
  });

  describe('when space is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.listProposalsByArtefactId).not.toHaveBeenCalled();
    });
  });

  describe('when space does not belong to the organization', () => {
    const command = buildCommand();
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      organizationId: createOrganizationId('other-org-id'),
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(otherOrgSpace);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceOwnershipMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.listProposalsByArtefactId).not.toHaveBeenCalled();
    });
  });
});
