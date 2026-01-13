import { UserEvent } from '../../events';
import { StandardId } from '../StandardId';
import { StandardVersionId } from '../StandardVersionId';

export interface RuleUpdatedPayload {
  standardId: StandardId;
  standardVersionId: StandardVersionId;
  newVersion: number;
}

export class RuleUpdatedEvent extends UserEvent<RuleUpdatedPayload> {
  static override readonly eventName = 'standards.rule.updated';
}
