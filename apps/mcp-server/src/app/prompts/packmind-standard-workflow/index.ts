import stepInitialRequest from './step-initial-request';
import stepContextPrecision from './step-context-precision';
import stepDrafting from './step-drafting';
import stepReview from './step-review';
import stepFinalization from './step-finalization';

export const STANDARD_WORKFLOW_STEP_ORDER = [
  'initial-request',
  'context-precision',
  'drafting',
  'review',
  'finalization',
] as const;

export type StandardWorkflowStep =
  (typeof STANDARD_WORKFLOW_STEP_ORDER)[number];

export const STANDARD_WORKFLOW_STEPS: Record<StandardWorkflowStep, string> = {
  'initial-request': stepInitialRequest,
  'context-precision': stepContextPrecision,
  drafting: stepDrafting,
  review: stepReview,
  finalization: stepFinalization,
};
