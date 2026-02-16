import { stubLogger } from '@packmind/test-utils';
import {
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
  ListChangeProposalsBySpaceCommand,
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
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { ListChangeProposalsBySpaceUseCase } from './ListChangeProposalsBySpaceUseCase';

describe('ListChangeProposalsBySpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const standardId1 = createStandardId('standard-1');
  const standardId2 = createStandardId('standard-2');
  const recipeId1 = createRecipeId('recipe-1');
  const recipeId2 = createRecipeId('recipe-2');
  const skillId1 = createSkillId('skill-1');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });

  const standard1 = standardFactory({ id: standardId1, name: 'Standard 1' });
  const standard2 = standardFactory({ id: standardId2, name: 'Standard 2' });
  const recipe1 = recipeFactory({ id: recipeId1, name: 'Recipe 1' });
  const recipe2 = recipeFactory({ id: recipeId2, name: 'Recipe 2' });
  const skill1 = skillFactory({ id: skillId1, name: 'Skill 1' });

  let useCase: ListChangeProposalsBySpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<ListChangeProposalsBySpaceCommand>,
  ): ListChangeProposalsBySpaceCommand => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
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
      groupProposalsByArtefact: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new ListChangeProposalsBySpaceUseCase(
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

  describe('when listing proposals successfully', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);

      service.groupProposalsByArtefact.mockResolvedValue({
        standards: new Map<StandardId, number>([
          [standardId1, 3],
          [standardId2, 1],
        ]),
        commands: new Map<RecipeId, number>([
          [recipeId1, 2],
          [recipeId2, 1],
        ]),
        skills: new Map<SkillId, number>([[skillId1, 5]]),
      });

      standardsPort.getStandard.mockImplementation(async (id) => {
        if (id === standardId1) return standard1;
        if (id === standardId2) return standard2;
        return null;
      });

      recipesPort.getRecipeByIdInternal.mockImplementation(async (id) => {
        if (id === recipeId1) return recipe1;
        if (id === recipeId2) return recipe2;
        return null;
      });

      skillsPort.getSkill.mockImplementation(async (id) => {
        if (id === skillId1) return skill1;
        return null;
      });
    });

    it('calls service to group proposals by artefact', async () => {
      await useCase.execute(command);

      expect(service.groupProposalsByArtefact).toHaveBeenCalledWith(spaceId);
    });

    it('enriches standards with names and counts', async () => {
      const result = await useCase.execute(command);

      expect(result.standards).toEqual([
        {
          artefactId: standardId1,
          name: 'Standard 1',
          changeProposalCount: 3,
        },
        {
          artefactId: standardId2,
          name: 'Standard 2',
          changeProposalCount: 1,
        },
      ]);
    });

    it('enriches commands with names and counts', async () => {
      const result = await useCase.execute(command);

      expect(result.commands).toEqual([
        {
          artefactId: recipeId1,
          name: 'Recipe 1',
          changeProposalCount: 2,
        },
        {
          artefactId: recipeId2,
          name: 'Recipe 2',
          changeProposalCount: 1,
        },
      ]);
    });

    it('enriches skills with names and counts', async () => {
      const result = await useCase.execute(command);

      expect(result.skills).toEqual([
        {
          artefactId: skillId1,
          name: 'Skill 1',
          changeProposalCount: 5,
        },
      ]);
    });

    it('fetches first standard details', async () => {
      await useCase.execute(command);

      expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId1);
    });

    it('fetches second standard details', async () => {
      await useCase.execute(command);

      expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId2);
    });

    it('fetches first recipe details', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(recipeId1);
    });

    it('fetches second recipe details', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(recipeId2);
    });

    it('fetches skill details', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkill).toHaveBeenCalledWith(skillId1);
    });
  });

  describe('when space has no proposals', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.groupProposalsByArtefact.mockResolvedValue({
        standards: new Map(),
        commands: new Map(),
        skills: new Map(),
      });
    });

    it('returns empty standards array', async () => {
      const result = await useCase.execute(command);

      expect(result.standards).toEqual([]);
    });

    it('returns empty commands array', async () => {
      const result = await useCase.execute(command);

      expect(result.commands).toEqual([]);
    });

    it('returns empty skills array', async () => {
      const result = await useCase.execute(command);

      expect(result.skills).toEqual([]);
    });

    it('does not call standards port', async () => {
      await useCase.execute(command);

      expect(standardsPort.getStandard).not.toHaveBeenCalled();
    });

    it('does not call recipes port', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
    });

    it('does not call skills port', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkill).not.toHaveBeenCalled();
    });
  });

  describe('when artefact is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.groupProposalsByArtefact.mockResolvedValue({
        standards: new Map([[standardId1, 2]]),
        commands: new Map([[recipeId1, 1]]),
        skills: new Map([[skillId1, 3]]),
      });

      standardsPort.getStandard.mockResolvedValue(null);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      skillsPort.getSkill.mockResolvedValue(null);
    });

    it('excludes standards that are not found', async () => {
      const result = await useCase.execute(command);

      expect(result.standards).toEqual([]);
    });

    it('excludes commands that are not found', async () => {
      const result = await useCase.execute(command);

      expect(result.commands).toEqual([]);
    });

    it('excludes skills that are not found', async () => {
      const result = await useCase.execute(command);

      expect(result.skills).toEqual([]);
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

      expect(service.groupProposalsByArtefact).not.toHaveBeenCalled();
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

      expect(service.groupProposalsByArtefact).not.toHaveBeenCalled();
    });
  });
});
