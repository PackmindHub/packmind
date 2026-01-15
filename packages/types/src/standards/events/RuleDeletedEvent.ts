import { UserEvent } from '../../events';
import { StandardId } from '../StandardId';
import { StandardVersionId } from '../StandardVersionId';

export interface RuleDeletedPayload {
  standardId: StandardId;
  standardVersionId: StandardVersionId;
  newVersion: number;
}

export class RuleDeletedEvent extends UserEvent<RuleDeletedPayload> {
  static override readonly eventName = 'standards.rule.deleted';
}
