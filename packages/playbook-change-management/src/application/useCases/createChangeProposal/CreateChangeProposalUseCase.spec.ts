import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
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
import { ChangeProposalPayloadMismatchError } from '../../errors/ChangeProposalPayloadMismatchError';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';
import { CreateChangeProposalUseCase } from './CreateChangeProposalUseCase';

describe('CreateChangeProposalUseCase', () => {
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
  const recipe = recipeFactory({ id: recipeId, spaceId, version: 5 });

  let useCase: CreateChangeProposalUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<
      CreateChangeProposalCommand<ChangeProposalType.updateCommandName>
    >,
  ): CreateChangeProposalCommand<ChangeProposalType.updateCommandName> => ({
    userId: userId,
    organizationId: organizationId,
    type: ChangeProposalType.updateCommandName,
    artefactId: recipeId,
    payload: { oldValue: recipe.name, newValue: 'New Recipe Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    recipesPort = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    spacesPort = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    service = {
      createChangeProposal: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new CreateChangeProposalUseCase(
      accountsPort,
      recipesPort,
      spacesPort,
      service,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when type is updateCommandName', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateCommandName>['changeProposal'],
      });
    });

    it('delegates to service with recipe version', async () => {
      await useCase.execute(command);

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
        }),
        5,
      );
    });

    it('calls getRecipeById with access control', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeById).toHaveBeenCalledWith({
        userId: userId as unknown as string,
        organizationId,
        spaceId,
        recipeId,
      });
    });
  });

  describe('when type is updateCommandDescription', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandDescription as unknown as ChangeProposalType.updateCommandName,
      payload: { oldValue: recipe.content, newValue: 'new content' },
    });

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateCommandDescription>['changeProposal'],
      });
    });

    it('delegates to service with recipe version', async () => {
      await useCase.execute(command);

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandDescription,
        }),
        5,
      );
    });
  });

  describe('when type is unsupported', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateStandardName as unknown as ChangeProposalType.updateCommandName,
    });

    it('throws UnsupportedChangeProposalTypeError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UnsupportedChangeProposalTypeError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when recipe is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
      recipesPort.getRecipeById.mockResolvedValue(null);
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

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when payload oldValue does not match current recipe name', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandName,
      payload: { oldValue: 'Wrong Name', newValue: 'New Name' },
    });

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when payload oldValue does not match current recipe content', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandDescription as unknown as ChangeProposalType.updateCommandName,
      payload: { oldValue: 'wrong content', newValue: 'new content' },
    });

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([space]);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when organization has no spaces', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([]);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        'No spaces found for organization',
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });

    it('does not call getRecipeById', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(recipesPort.getRecipeById).not.toHaveBeenCalled();
    });
  });
});
