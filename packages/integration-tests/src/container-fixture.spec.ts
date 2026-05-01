import * as fs from 'fs';
import { EntitySchema } from 'typeorm';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';

function isDockerAvailable(): boolean {
  if (process.env['DOCKER_HOST']) return true;
  if (fs.existsSync('/var/run/docker.sock')) return true;
  return false;
}

const describeIfDocker = isDockerAvailable() ? describe : describe.skip;

interface Document {
  id: number;
  payload: Record<string, unknown>;
}

const DocumentSchema = new EntitySchema<Document>({
  name: 'IntegrationDocument',
  tableName: 'integration_documents',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    payload: { type: 'jsonb' },
  },
});

describeIfDocker('createIntegrationTestFixture (container backend)', () => {
  const fixture = createIntegrationTestFixture([DocumentSchema], {
    backend: 'container',
  });

  beforeAll(async () => {
    await fixture.initialize();
  }, 120_000);

  afterEach(async () => {
    await fixture.cleanup();
  });

  afterAll(async () => {
    await fixture.destroy();
  });

  it('persists rows in real PostgreSQL', async () => {
    const repo = fixture.datasource.getRepository(DocumentSchema);
    await repo.save({ payload: { kind: 'spec', tags: ['a', 'b'] } });

    const rows = await repo.find();
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ kind: 'spec', tags: ['a', 'b'] });
  });

  it('supports JSONB containment, which pg-mem does not implement', async () => {
    const repo = fixture.datasource.getRepository(DocumentSchema);
    await repo.save({ payload: { kind: 'spec', priority: 'high' } });
    await repo.save({ payload: { kind: 'note', priority: 'low' } });

    const matches = await fixture.datasource.query(
      `SELECT id FROM integration_documents WHERE payload @> $1::jsonb`,
      [JSON.stringify({ priority: 'high' })],
    );
    expect(matches).toHaveLength(1);
  });
});
