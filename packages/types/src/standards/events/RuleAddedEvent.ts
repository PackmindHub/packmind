import { UserEvent } from '../../events';
import { StandardId } from '../StandardId';
import { StandardVersionId } from '../StandardVersionId';

export interface RuleAddedPayload {
  standardId: StandardId;
  standardVersionId: StandardVersionId;
  newVersion: number;
}

export class RuleAddedEvent extends UserEvent<RuleAddedPayload> {
  static override readonly eventName = 'standards.rule.added';
}
