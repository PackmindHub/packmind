import { UserEvent } from '../../events';
import { OrganizationId, UserId } from '../../accounts';
import { StandardId } from '../StandardId';
import { StandardVersionId } from '../StandardVersionId';

export interface RuleAddedPayload {
  standardId: StandardId;
  standardVersionId: StandardVersionId;
  organizationId: OrganizationId;
  userId: UserId;
  newVersion: number;
}

export class RuleAddedEvent extends UserEvent<RuleAddedPayload> {
  static override readonly eventName = 'standards.rule.added';
}
