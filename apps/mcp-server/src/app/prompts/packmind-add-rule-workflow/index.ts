import stepInitialRequest from './step-initial-request';
import stepDrafting from './step-drafting';
import stepFinalization from './step-finalization';

export const ADD_RULE_WORKFLOW_STEP_ORDER = [
  'initial-request',
  'drafting',
  'finalization',
] as const;

export type AddRuleWorkflowStep = (typeof ADD_RULE_WORKFLOW_STEP_ORDER)[number];

export const ADD_RULE_WORKFLOW_STEPS: Record<AddRuleWorkflowStep, string> = {
  'initial-request': stepInitialRequest,
  drafting: stepDrafting,
  finalization: stepFinalization,
};
