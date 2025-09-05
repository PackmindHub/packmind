import { DataSource, EntitySchema } from 'typeorm';
import { newDb } from 'pg-mem';

export async function makeTestDatasource(
  entities: EntitySchema[],
): Promise<DataSource> {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });

  db.public.registerFunction({
    implementation() {
      return '17';
    },
    name: 'version',
  });

  return db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
  });
}
