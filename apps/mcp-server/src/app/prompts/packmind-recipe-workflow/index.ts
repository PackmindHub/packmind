import stepInitialRequest from './step-initial-request';
import stepDrafting from './step-drafting';
import stepFinalization from './step-finalization';

export const RECIPE_WORKFLOW_STEP_ORDER = [
  'initial-request',
  'drafting',
  'finalization',
] as const;

export type RecipeWorkflowStep = (typeof RECIPE_WORKFLOW_STEP_ORDER)[number];

export const RECIPE_WORKFLOW_STEPS: Record<RecipeWorkflowStep, string> = {
  'initial-request': stepInitialRequest,
  drafting: stepDrafting,
  finalization: stepFinalization,
};
