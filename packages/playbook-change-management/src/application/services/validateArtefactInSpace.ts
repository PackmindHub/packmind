import {
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { ArtefactNotFoundError } from '../../domain/errors/ArtefactNotFoundError';
import { ArtefactNotInSpaceError } from '../../domain/errors/ArtefactNotInSpaceError';

export async function validateArtefactInSpace(
  artefactId: StandardId | RecipeId | SkillId,
  spaceId: SpaceId,
  standardsPort: IStandardsPort,
  recipesPort: IRecipesPort,
  skillsPort: ISkillsPort,
): Promise<void> {
  const standard = await standardsPort.getStandard(artefactId as StandardId);
  if (standard) {
    if (standard.spaceId !== spaceId) {
      throw new ArtefactNotInSpaceError(artefactId, spaceId);
    }
    return;
  }

  const recipe = await recipesPort.getRecipeByIdInternal(
    artefactId as RecipeId,
  );
  if (recipe) {
    if (recipe.spaceId !== spaceId) {
      throw new ArtefactNotInSpaceError(artefactId, spaceId);
    }
    return;
  }

  const skill = await skillsPort.getSkill(artefactId as SkillId);
  if (skill) {
    if (skill.spaceId !== spaceId) {
      throw new ArtefactNotInSpaceError(artefactId, spaceId);
    }
    return;
  }

  throw new ArtefactNotFoundError(artefactId);
}
