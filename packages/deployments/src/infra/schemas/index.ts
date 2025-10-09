import { RecipesDeploymentSchema } from './RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from './StandardsDeploymentSchema';
import { TargetSchema } from './TargetSchema';
import { RenderModeConfigurationSchema } from './RenderModeConfigurationSchema';

export {
  RecipesDeploymentSchema,
  StandardsDeploymentSchema,
  TargetSchema,
  RenderModeConfigurationSchema,
};
export const deploymentsSchemas = [
  RecipesDeploymentSchema,
  StandardsDeploymentSchema,
  TargetSchema,
  RenderModeConfigurationSchema,
];
