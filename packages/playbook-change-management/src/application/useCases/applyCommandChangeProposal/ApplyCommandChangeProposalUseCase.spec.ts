import { stubLogger } from '@packmind/test-utils';
import {
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
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
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { ApplyCommandChangeProposalUseCase } from './ApplyCommandChangeProposalUseCase';

describe('ApplyCommandChangeProposalUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const recipeId = createRecipeId('recipe-id');
  const changeProposalId = createChangeProposalId('proposal-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const recipe = recipeFactory({ id: recipeId, spaceId, version: 5 });

  let useCase: ApplyCommandChangeProposalUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<ApplyCommandChangeProposalCommand>,
  ): ApplyCommandChangeProposalCommand => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
    recipeId: recipeId,
    changeProposalId: changeProposalId,
    force: false,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
      updateRecipeFromUI: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    service = {
      applyProposal: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new ApplyCommandChangeProposalUseCase(
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

  describe('when applying a proposal successfully', () => {
    const command = buildCommand();
    const appliedProposal = {
      id: changeProposalId,
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 5,
      spaceId,
      payload: { oldValue: 'old name', newValue: 'new name' },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.applied,
      createdBy: createUserId(),
      resolvedBy: userId,
      resolvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
      recipesPort.updateRecipeFromUI.mockResolvedValue({ recipe });
      service.applyProposal.mockResolvedValue({
        changeProposal: appliedProposal,
        updatedFields: { name: 'new name', content: recipe.content },
      });
    });

    it('delegates to service with current recipe values', async () => {
      await useCase.execute(command);

      expect(service.applyProposal).toHaveBeenCalledWith(
        expect.objectContaining(command),
        { name: recipe.name, content: recipe.content },
      );
    });

    it('updates the recipe with new field values', async () => {
      await useCase.execute(command);

      expect(recipesPort.updateRecipeFromUI).toHaveBeenCalledWith({
        recipeId: recipe.id,
        name: 'new name',
        content: recipe.content,
        userId,
        spaceId,
        organizationId,
      });
    });

    it('returns the applied change proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposal).toBe(appliedProposal);
    });
  });

  describe('when force is true', () => {
    const command = buildCommand({ force: true });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
      recipesPort.updateRecipeFromUI.mockResolvedValue({ recipe });
      service.applyProposal.mockResolvedValue({
        changeProposal:
          {} as ApplyCommandChangeProposalResponse['changeProposal'],
        updatedFields: { name: recipe.name, content: 'forced content' },
      });
    });

    it('passes force flag to service', async () => {
      await useCase.execute(command);

      expect(service.applyProposal).toHaveBeenCalledWith(
        expect.objectContaining(command),
        expect.any(Object),
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

      expect(service.applyProposal).not.toHaveBeenCalled();
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

      expect(service.applyProposal).not.toHaveBeenCalled();
    });
  });

  describe('when recipe is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Recipe ${recipeId} not found`,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.applyProposal).not.toHaveBeenCalled();
    });
  });
});
