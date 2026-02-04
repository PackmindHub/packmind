import { PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { Standard } from '../Standard';
import { RuleWithExamples } from '../RuleWithExamples';
import { StandardCreationMethod } from '../events/StandardCreatedEvent';

export type CreateStandardWithExamplesCommand = PackmindCommand & {
  spaceId: SpaceId;
  name: string;
  description: string;
  summary: string | null;
  scope: string | null;
  rules: RuleWithExamples[];
  /**
   * When true, skips the detection program assessment for rules.
   * Useful for bulk imports where assessment would be too expensive.
   */
  disableTriggerAssessment?: boolean;
  /**
   * The method used to create this standard.
   */
  method?: StandardCreationMethod;
};

export type CreateStandardWithExamplesResponse = {
  standard: Standard;
};
