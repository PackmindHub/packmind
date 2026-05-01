import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { isDockerAvailable } from '@packmind/test-utils';

const describeIfDocker = isDockerAvailable() ? describe : describe.skip;

describeIfDocker('migrations against real PostgreSQL', () => {
  let container: StartedPostgreSqlContainer;
  let datasource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();

    datasource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      migrations: [path.join(__dirname, 'migrations', '*.ts')],
      synchronize: false,
    });

    await datasource.initialize();
  }, 180_000);

  afterAll(async () => {
    if (datasource?.isInitialized) {
      await datasource.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  it('runs every migration successfully', async () => {
    const applied = await datasource.runMigrations({ transaction: 'each' });
    expect(applied.length).toBeGreaterThan(0);
  });

  it('is idempotent on re-run', async () => {
    const applied = await datasource.runMigrations({ transaction: 'each' });
    expect(applied).toEqual([]);
  });
});
