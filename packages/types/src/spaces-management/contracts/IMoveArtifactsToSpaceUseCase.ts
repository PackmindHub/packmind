import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { RecipeId } from '../../recipes';

export type MoveArtifactsToSpaceCommand = PackmindCommand & {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  standardIds?: StandardId[];
  skillIds?: SkillId[];
  recipeIds?: RecipeId[];
};

export type MoveArtifactsToSpaceResponse = { movedCount: number };

export type IMoveArtifactsToSpaceUseCase = IUseCase<
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse
>;
