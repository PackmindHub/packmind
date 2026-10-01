import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { AddVersionSpecToDistributedPackages1824000000000 } from '../migrations/1824000000000-AddVersionSpecToDistributedPackages';

const silentLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as PackmindLogger;

function makeInMemoryDataSource(): DataSource {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });
  db.public.registerFunction({
    implementation: () => '17',
    name: 'version',
  });

  /*
   * `addColumn` and `dropColumn` make TypeORM re-read the table before emitting
   * their DDL, and two of those introspection queries are beyond pg-mem: the
   * column one correlates a subquery against the outer information_schema alias,
   * and the index one reads pg_am. Both are answered here from what pg-mem does
   * know, which is enough for TypeORM to find the table. The ALTER itself is
   * executed by pg-mem for real, which is what these tests are about.
   */
  db.public.interceptQueries((query) => {
    if (query.includes('col_description')) {
      const columns = db.public.many(
        `SELECT * FROM information_schema.columns WHERE table_schema = 'public'`,
      ) as Record<string, unknown>[];

      return columns.map((column) => ({
        ...column,
        description: null,
        regtype: column['udt_name'],
        format_type: column['data_type'],
      }));
    }

    if (query.includes('"pg_am"')) {
      return [];
    }

    return null;
  });

  return db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [],
  });
}

const distributionId = '00000000-0000-0000-0000-0000000000a1';
const packageId = '00000000-0000-0000-0000-0000000000b1';
const existingRowId = '00000000-0000-0000-0000-0000000000c1';
const pinnedRowId = '00000000-0000-0000-0000-0000000000c2';

type Row = Record<string, unknown>;

describe('AddVersionSpecToDistributedPackages1824000000000', () => {
  const migration = new AddVersionSpecToDistributedPackages1824000000000(
    silentLogger,
  );
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const rowById = async (id: string): Promise<Row> => {
    const rows = (await queryRunner.query(
      `SELECT * FROM "distributed_packages" WHERE "id" = '${id}'`,
    )) as Row[];
    return rows[0];
  };

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "distributed_packages" (
        "id" uuid PRIMARY KEY,
        "distribution_id" uuid NOT NULL,
        "package_id" uuid NOT NULL,
        "operation" varchar NOT NULL DEFAULT 'add'
      )
    `);

    // A row written before the column existed, which the migration must keep.
    await queryRunner.query(
      `INSERT INTO "distributed_packages" ("id", "distribution_id", "package_id")
       VALUES ('${existingRowId}', '${distributionId}', '${packageId}')`,
    );
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  describe('when the migration is applied', () => {
    beforeEach(async () => {
      await migration.up(queryRunner);
    });

    /*
     * `?? null` because pg-mem reports a freshly added column as `undefined` on
     * a row that predates it, where Postgres gives `null`. The claim being made
     * is the one both agree on: the row survived, and it carries no spec — which
     * is also what proves the column is nullable, since an ADD COLUMN NOT NULL
     * with no default would have been refused on a table with rows in it.
     */
    it('leaves rows written before the column with no spec', async () => {
      expect((await rowById(existingRowId))['version_spec'] ?? null).toBeNull();
    });

    it('records the spec a new row is written with', async () => {
      await queryRunner.query(
        `INSERT INTO "distributed_packages" ("id", "distribution_id", "package_id", "version_spec")
         VALUES ('${pinnedRowId}', '${distributionId}', '${packageId}', '0.1.0')`,
      );

      expect((await rowById(pinnedRowId))['version_spec']).toBe('0.1.0');
    });

    describe('and then rolled back', () => {
      beforeEach(async () => {
        await migration.down(queryRunner);
      });

      it('drops the column', async () => {
        expect(await rowById(existingRowId)).not.toHaveProperty('version_spec');
      });
    });
  });
});
