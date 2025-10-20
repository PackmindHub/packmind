import stepInitialRequest from './step-initial-request';
import stepClarify from './step-clarify';
import stepDrafting from './step-drafting';
import stepFinalization from './step-finalization';

export const STANDARD_WORKFLOW_STEP_ORDER = [
  'initial-request',
  'clarify',
  'drafting',
  'finalization',
] as const;

export type StandardWorkflowStep =
  (typeof STANDARD_WORKFLOW_STEP_ORDER)[number];

export const STANDARD_WORKFLOW_STEPS: Record<StandardWorkflowStep, string> = {
  'initial-request': stepInitialRequest,
  clarify: stepClarify,
  drafting: stepDrafting,
  finalization: stepFinalization,
};
