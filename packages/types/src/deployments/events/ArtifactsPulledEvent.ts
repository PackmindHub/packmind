import { UserEvent } from '../../events';

export interface ArtifactsPulledPayload {
  packageSlugs: string[];
  recipeCount: number;
  standardCount: number;
  skillCount: number;
  source: string;
}

export class ArtifactsPulledEvent extends UserEvent<ArtifactsPulledPayload> {
  static override readonly eventName = 'deployments.artifacts.pulled';
}
