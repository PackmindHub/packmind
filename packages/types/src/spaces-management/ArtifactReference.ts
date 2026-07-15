import { ArtifactType } from '../deployments/FileUpdates';
import { CommandId } from '../commands';
import { SkillId } from '../skills';
import { StandardId } from '../standards';

export type ArtifactTypeToIdMap = {
  standard: StandardId;
  skill: SkillId;
  command: CommandId;
};

export type ArtifactReference<T extends ArtifactType = ArtifactType> = {
  [K in T]: { id: ArtifactTypeToIdMap[K]; type: K };
}[T];
