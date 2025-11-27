import { UserEvent } from '../../events';
import { TargetId } from '../TargetId';

export interface DeploymentCompletedPayload {
  targetIds: TargetId[];
  recipeCount: number;
  standardCount: number;
}

export class DeploymentCompletedEvent extends UserEvent<DeploymentCompletedPayload> {
  static override readonly eventName = 'deployments.deployment.completed';
}
