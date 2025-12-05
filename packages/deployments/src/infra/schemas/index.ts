import { TargetSchema } from './TargetSchema';
import { RenderModeConfigurationSchema } from './RenderModeConfigurationSchema';
import { PackageSchema } from './PackageSchema';
import { PackageRecipesSchema } from './PackageRecipesSchema';
import { PackageStandardsSchema } from './PackageStandardsSchema';
import { DistributionSchema } from './DistributionSchema';
import { DistributedPackageSchema } from './DistributedPackageSchema';

export {
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
  PackageRecipesSchema,
  PackageStandardsSchema,
  DistributionSchema,
  DistributedPackageSchema,
};
export const deploymentsSchemas = [
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
  PackageRecipesSchema,
  PackageStandardsSchema,
  DistributionSchema,
  DistributedPackageSchema,
];
