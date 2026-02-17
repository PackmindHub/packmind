import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalType,
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListChangeProposalsByArtefactCommand,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { standardFactory } from '@packmind/standards/test/standardFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { changeProposalFactory } from '../../../../test/changeProposalFactory';
import { ArtefactNotFoundError } from '../../../domain/errors/ArtefactNotFoundError';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ListChangeProposalsByArtefactUseCase } from './ListChangeProposalsByArtefactUseCase';

describe('ListChangeProposalsByArtefactUseCase', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('organization-id');
  const spaceId = createSpaceId('space-id');
  const standardId = createStandardId('standard-1');
  const recipeId = createRecipeId('recipe-1');
  const skillId = createSkillId('skill-1');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const standard = standardFactory({ id: standardId, spaceId });
  const recipe = recipeFactory({ id: recipeId, spaceId });
  const skill = skillFactory({ id: skillId, spaceId });

  let useCase: ListChangeProposalsByArtefactUseCase<
    StandardId | RecipeId | SkillId
  >;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<
      ListChangeProposalsByArtefactCommand<StandardId | RecipeId | SkillId>
    >,
  ): ListChangeProposalsByArtefactCommand<StandardId | RecipeId | SkillId> => ({
    userId,
    organizationId,
    spaceId,
    artefactId: standardId,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    standardsPort = {
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      getSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    service = {
      findProposalsByArtefact: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new ListChangeProposalsByArtefactUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      service,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid standard artefact', () => {
    const proposals = [
      changeProposalFactory({
        type: ChangeProposalType.updateStandardName,
        artefactId: standardId,
        spaceId,
      }),
      changeProposalFactory({
        type: ChangeProposalType.addRule,
        artefactId: standardId,
        spaceId,
      }),
    ];

    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(standard);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      skillsPort.getSkill.mockResolvedValue(null);
      service.findProposalsByArtefact.mockResolvedValue(proposals);
    });

    it('returns all proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals.length).toBe(2);
    });

    it('includes first proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals[0].id).toBe(proposals[0].id);
    });

    it('includes second proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals[1].id).toBe(proposals[1].id);
    });

    it('adds empty conflictsWith array to first proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals[0].conflictsWith).toEqual([]);
    });

    it('adds empty conflictsWith array to second proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals[1].conflictsWith).toEqual([]);
    });

    it('validates space ownership', async () => {
      await useCase.execute(command);

      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
    });

    it('validates artefact exists in space', async () => {
      await useCase.execute(command);

      expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId);
    });

    it('calls service with correct parameters', async () => {
      await useCase.execute(command);

      expect(service.findProposalsByArtefact).toHaveBeenCalledWith(
        spaceId,
        standardId,
      );
    });
  });

  describe('with valid recipe artefact', () => {
    const proposals = [
      changeProposalFactory({
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
      }),
    ];

    const command = buildCommand({ artefactId: recipeId });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(null);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
      skillsPort.getSkill.mockResolvedValue(null);
      service.findProposalsByArtefact.mockResolvedValue(proposals);
    });

    it('returns recipe proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals.length).toBe(1);
    });

    it('validates recipe exists in space', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(recipeId);
    });
  });

  describe('with valid skill artefact', () => {
    const proposals = [
      changeProposalFactory({
        type: ChangeProposalType.updateSkillName,
        artefactId: skillId,
        spaceId,
      }),
    ];

    const command = buildCommand({ artefactId: skillId });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(null);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      skillsPort.getSkill.mockResolvedValue(skill);
      service.findProposalsByArtefact.mockResolvedValue(proposals);
    });

    it('returns skill proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals.length).toBe(1);
    });

    it('validates skill exists in space', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkill).toHaveBeenCalledWith(skillId);
    });
  });

  describe('when space has no proposals', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(standard);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      skillsPort.getSkill.mockResolvedValue(null);
      service.findProposalsByArtefact.mockResolvedValue([]);
    });

    it('returns empty proposals array', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposals).toEqual([]);
    });
  });

  describe('when space does not exist', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not validate artefact', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(standardsPort.getStandard).not.toHaveBeenCalled();
    });

    it('does not call service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findProposalsByArtefact).not.toHaveBeenCalled();
    });
  });

  describe('when space belongs to different organization', () => {
    const differentOrgId = createOrganizationId('different-org');
    const differentSpace = spaceFactory({
      id: spaceId,
      organizationId: differentOrgId,
    });
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(differentSpace);
    });

    it('throws SpaceOwnershipMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceOwnershipMismatchError,
      );
    });

    it('does not validate artefact', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(standardsPort.getStandard).not.toHaveBeenCalled();
    });
  });

  describe('when artefact does not exist', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(null);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      skillsPort.getSkill.mockResolvedValue(null);
    });

    it('throws ArtefactNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        ArtefactNotFoundError,
      );
    });

    it('does not call service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findProposalsByArtefact).not.toHaveBeenCalled();
    });
  });

  describe('when artefact belongs to different space', () => {
    const differentSpaceId = createSpaceId('different-space');
    const differentStandard = standardFactory({
      id: standardId,
      spaceId: differentSpaceId,
    });
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      standardsPort.getStandard.mockResolvedValue(differentStandard);
    });

    it('throws ArtefactNotInSpaceError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        ArtefactNotInSpaceError,
      );
    });

    it('does not call service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findProposalsByArtefact).not.toHaveBeenCalled();
    });
  });
});
