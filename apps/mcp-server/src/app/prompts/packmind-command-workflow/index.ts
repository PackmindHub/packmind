import stepInitialRequest from './step-initial-request';
import stepDrafting from './step-drafting';
import stepFinalization from './step-finalization';

export const COMMAND_WORKFLOW_STEP_ORDER = [
  'initial-request',
  'drafting',
  'finalization',
] as const;

export type CommandWorkflowStep = (typeof COMMAND_WORKFLOW_STEP_ORDER)[number];

export const COMMAND_WORKFLOW_STEPS: Record<CommandWorkflowStep, string> = {
  'initial-request': stepInitialRequest,
  drafting: stepDrafting,
  finalization: stepFinalization,
};
