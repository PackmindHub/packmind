import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { accountsSchemas } from '@packmind/accounts';
import { commandsSchemas } from '@packmind/commands';
import { standardsSchemas } from '@packmind/standards';
import { spacesSchemas } from '@packmind/spaces';
import { gitSchemas } from '@packmind/git';
import { deploymentsSchemas } from '@packmind/deployments';
import { skillsSchemas } from '@packmind/skills';
import { playbookChangeManagementSchemas } from '@packmind/playbook-change-management';

/**
 * The single list of schemas every integration-test fixture is built from.
 *
 * **Adding a schema to a domain package is not enough — its barrel must be
 * spread here too.** A missing entry surfaces as a "relation does not exist"
 * failure across unrelated specs rather than as a targeted error.
 *
 * Every helper uses this one list — `makeIntegrationTestDataSource` below, and
 * `integrationTest` / `integrationTestWithUser` in `./integrationTest.ts` — so
 * there is no second list to keep in step.
 *
 * `playbookChangeManagementSchemas` is edition-routed: it is `[]` in the OSS
 * edition and carries the real schemas in the proprietary one, so spreading it
 * is a no-op under `PACKMIND_EDITION=oss`.
 */
export const integrationTestSchemas = [
  ...accountsSchemas,
  ...commandsSchemas,
  ...standardsSchemas,
  ...spacesSchemas,
  ...gitSchemas,
  ...deploymentsSchemas,
  ...skillsSchemas,
  ...playbookChangeManagementSchemas,
];

export function makeIntegrationTestDataSource(): Promise<DataSource> {
  return makeTestDatasource(integrationTestSchemas);
}
