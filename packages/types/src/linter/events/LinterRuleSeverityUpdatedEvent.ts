import { UserEvent } from '../../events';
import { DetectionSeverity } from '../ActiveDetectionProgram';
import { RuleId } from '../../standards';

export interface LinterRuleSeverityUpdatedPayload {
  ruleId: RuleId;
  severity: DetectionSeverity;
}

export class LinterRuleSeverityUpdatedEvent extends UserEvent<LinterRuleSeverityUpdatedPayload> {
  static override readonly eventName = 'linter.rule.severity-updated';
}
