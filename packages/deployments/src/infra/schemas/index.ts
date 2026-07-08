import { TargetSchema } from './TargetSchema';
import { RenderModeConfigurationSchema } from './RenderModeConfigurationSchema';
import { PackageSchema } from './PackageSchema';
import { PackageCommandsSchema } from './PackageCommandsSchema';
import { PackageStandardsSchema } from './PackageStandardsSchema';
import { PackageSkillsSchema } from './PackageSkillsSchema';
import { DistributionSchema } from './DistributionSchema';
import { DistributedPackageSchema } from './DistributedPackageSchema';

export {
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
  PackageCommandsSchema,
  PackageStandardsSchema,
  PackageSkillsSchema,
  DistributionSchema,
  DistributedPackageSchema,
};
export const deploymentsSchemas = [
  TargetSchema,
  RenderModeConfigurationSchema,
  PackageSchema,
  PackageCommandsSchema,
  PackageStandardsSchema,
  PackageSkillsSchema,
  DistributionSchema,
  DistributedPackageSchema,
];
