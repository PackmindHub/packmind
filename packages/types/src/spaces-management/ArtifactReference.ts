import { ArtifactType } from '../deployments/FileUpdates';
import { RecipeId } from '../recipes';
import { SkillId } from '../skills';
import { StandardId } from '../standards';

export type ArtifactTypeToIdMap = {
  standard: StandardId;
  skill: SkillId;
  command: RecipeId;
};

export type ArtifactReference<T extends ArtifactType = ArtifactType> = {
  [K in T]: { id: ArtifactTypeToIdMap[K]; type: K };
}[T];
