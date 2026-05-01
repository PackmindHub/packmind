import { DataSource, EntitySchema } from 'typeorm';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const POSTGRES_IMAGE = 'postgres:17-alpine';

let sharedContainer: StartedPostgreSqlContainer | null = null;
let sharedContainerStart: Promise<StartedPostgreSqlContainer> | null = null;

async function getSharedContainer(): Promise<StartedPostgreSqlContainer> {
  if (sharedContainer) return sharedContainer;
  if (sharedContainerStart) return sharedContainerStart;

  // Lazy require so that consumers of @packmind/test-utils that never touch
  // the container fixture (e.g., frontend specs running under jsdom) don't
  // pay for loading testcontainers + undici, the latter of which depends on
  // ReadableStream and explodes in jsdom.
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  sharedContainerStart = new PostgreSqlContainer(POSTGRES_IMAGE)
    .withReuse()
    .start()
    .then((container) => {
      sharedContainer = container;
      return container;
    });

  return sharedContainerStart;
}

function generateSchemaName(): string {
  const workerId = process.env['JEST_WORKER_ID'] ?? '1';
  const random = Math.random().toString(36).slice(2, 8);
  return `t_w${workerId}_${random}`;
}

async function ensureSchemaExists(
  container: StartedPostgreSqlContainer,
  schema: string,
): Promise<void> {
  const bootstrap = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  });

  await bootstrap.initialize();
  try {
    await bootstrap.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } finally {
    await bootstrap.destroy();
  }
}

export interface ContainerTestDatasourceOptions {
  schema?: string;
  synchronize?: boolean;
}

export async function makeContainerTestDatasource(
  entities: EntitySchema[],
  options: ContainerTestDatasourceOptions = {},
): Promise<DataSource> {
  const container = await getSharedContainer();
  const schema = options.schema ?? generateSchemaName();
  const synchronize = options.synchronize ?? true;

  await ensureSchemaExists(container, schema);

  const datasource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    schema,
    entities,
  });

  await datasource.initialize();

  if (synchronize) {
    await datasource.synchronize();
  }

  return datasource;
}

/**
 * Container-backed counterpart to createTestDatasourceFixture.
 *
 * Uses a real PostgreSQL container (shared across the Jest run via
 * Testcontainers reuse) with a unique schema per fixture for isolation.
 * Mirrors the pg-mem fixture API so call sites can swap helpers with a
 * one-line change.
 */
export function createContainerTestDatasourceFixture(entities: EntitySchema[]) {
  let datasource: DataSource | null = null;
  let schema: string | null = null;
  let tableNames: string[] = [];

  return {
    get datasource(): DataSource {
      if (!datasource) {
        throw new Error(
          'Datasource not initialized. Call initialize() in beforeAll.',
        );
      }
      return datasource;
    },

    async initialize(): Promise<DataSource> {
      schema = generateSchemaName();
      datasource = await makeContainerTestDatasource(entities, { schema });

      tableNames = datasource.entityMetadatas.map(
        (metadata) => metadata.tableName,
      );

      return datasource;
    },

    async cleanup(): Promise<void> {
      if (!datasource?.isInitialized || !schema) return;

      const queryRunner = datasource.createQueryRunner();
      try {
        await queryRunner.startTransaction();
        for (const tableName of tableNames) {
          await queryRunner.query(
            `TRUNCATE TABLE "${schema}"."${tableName}" CASCADE`,
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    },

    async destroy(): Promise<void> {
      if (datasource?.isInitialized) {
        if (schema) {
          await datasource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        }
        await datasource.destroy();
      }
      datasource = null;
      schema = null;
      tableNames = [];
    },
  };
}
