import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { accountsSchemas } from '@packmind/accounts';
import { recipesSchemas } from '@packmind/recipes';
import { standardsSchemas } from '@packmind/standards';
import { spacesSchemas } from '@packmind/spaces';
import { gitSchemas } from '@packmind/git';
import { deploymentsSchemas } from '@packmind/deployments';
import { skillsSchemas } from '@packmind/skills';

export const integrationTestSchemas = [
  ...accountsSchemas,
  ...recipesSchemas,
  ...standardsSchemas,
  ...spacesSchemas,
  ...gitSchemas,
  ...deploymentsSchemas,
  ...skillsSchemas,
];

export function makeIntegrationTestDataSource(): Promise<DataSource> {
  return makeTestDatasource(integrationTestSchemas);
}
