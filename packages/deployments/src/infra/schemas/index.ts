import { RecipesDeploymentSchema } from './RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from './StandardsDeploymentSchema';
import { TargetSchema } from './TargetSchema';
import { RenderModeConfigurationSchema } from './RenderModeConfigurationSchema';
import { PackageSchema } from './PackageSchema';

export {
  RecipesDeploymentSchema,
  StandardsDeploymentSchema,
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
};
export const deploymentsSchemas = [
  RecipesDeploymentSchema,
  StandardsDeploymentSchema,
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
];
