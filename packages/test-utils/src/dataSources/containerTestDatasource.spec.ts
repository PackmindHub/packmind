import * as fs from 'fs';
import { EntitySchema } from 'typeorm';
import { createContainerTestDatasourceFixture } from './containerTestDatasource';

function isDockerAvailable(): boolean {
  if (process.env.DOCKER_HOST) return true;
  if (fs.existsSync('/var/run/docker.sock')) return true;
  return false;
}

const describeIfDocker = isDockerAvailable() ? describe : describe.skip;

interface Widget {
  id: number;
  name: string;
}

const WidgetSchema = new EntitySchema<Widget>({
  name: 'Widget',
  tableName: 'widgets',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    name: { type: 'varchar' },
  },
});

describeIfDocker('createContainerTestDatasourceFixture', () => {
  const fixture = createContainerTestDatasourceFixture([WidgetSchema]);

  beforeAll(async () => {
    await fixture.initialize();
  }, 120_000);

  afterEach(async () => {
    await fixture.cleanup();
  });

  afterAll(async () => {
    await fixture.destroy();
  });

  it('persists rows in a real PostgreSQL container', async () => {
    const repo = fixture.datasource.getRepository(WidgetSchema);
    await repo.save({ name: 'first' });
    await repo.save({ name: 'second' });

    const rows = await repo.find();
    expect(rows.map((r) => r.name).sort()).toEqual(['first', 'second']);
  });

  it('supports JSONB operators that pg-mem cannot emulate', async () => {
    const result = await fixture.datasource.query(
      `SELECT '{"a":1,"b":2}'::jsonb @> '{"a":1}'::jsonb AS contains`,
    );
    expect(result[0].contains).toBe(true);
  });

  it('truncates between tests', async () => {
    const repo = fixture.datasource.getRepository(WidgetSchema);
    const rows = await repo.find();
    expect(rows).toEqual([]);
  });
});
