import { RecipesDeploymentSchema } from './RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from './StandardsDeploymentSchema';
import { TargetSchema } from './TargetSchema';

export { RecipesDeploymentSchema, StandardsDeploymentSchema, TargetSchema };
export const deploymentsSchemas = [
  RecipesDeploymentSchema,
  StandardsDeploymentSchema,
  TargetSchema,
];
