import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { AddSortableVersionToPackageReleases1825000000000 } from '../migrations/1825000000000-AddSortableVersionToPackageReleases';

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
   * The same two introspection queries `AddVersionSpecToDistributedPackages`
   * answers by hand, for the same reason: TypeORM re-reads the table before
   * emitting its DDL, and neither the correlated information_schema subquery
   * nor the pg_am read is within pg-mem. The ALTER itself runs for real.
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

const packageId = '00000000-0000-0000-0000-0000000000b1';
const otherPackageId = '00000000-0000-0000-0000-0000000000b2';

type Row = Record<string, unknown>;

describe('AddSortableVersionToPackageReleases1825000000000', () => {
  const migration = new AddSortableVersionToPackageReleases1825000000000(
    silentLogger,
  );
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const insertRelease = (id: string, pkg: string, version: string) =>
    queryRunner.query(
      `INSERT INTO "package_releases" ("id", "package_id", "version", "name", "description")
       VALUES ('${id}', '${pkg}', '${version}', 'ops', 'the ops package')`,
    );

  const columnNames = async (): Promise<string[]> => {
    const rows = (await queryRunner.query(
      `SELECT "column_name" FROM information_schema.columns
       WHERE "table_name" = 'package_releases'`,
    )) as { column_name: string }[];
    return rows.map((row) => row.column_name);
  };

  const rowById = async (id: string): Promise<Row> => {
    const rows = (await queryRunner.query(
      `SELECT * FROM "package_releases" WHERE "id" = '${id}'`,
    )) as Row[];
    return rows[0];
  };

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "package_releases" (
        "id" uuid PRIMARY KEY,
        "package_id" uuid NOT NULL,
        "version" varchar NOT NULL,
        "name" varchar NOT NULL,
        "description" text NOT NULL
      )
    `);

    await insertRelease(
      '00000000-0000-0000-0000-0000000000c1',
      packageId,
      '0.9.0',
    );
    await insertRelease(
      '00000000-0000-0000-0000-0000000000c2',
      packageId,
      '0.10.0',
    );
    await insertRelease(
      '00000000-0000-0000-0000-0000000000c3',
      otherPackageId,
      '1.2.3',
    );
    // Nothing writes one today, but the column must survive if one ever did.
    await insertRelease(
      '00000000-0000-0000-0000-0000000000c4',
      otherPackageId,
      'nonsense',
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

    it('adds the triple to the table', async () => {
      expect(await columnNames()).toEqual([
        'id',
        'package_id',
        'version',
        'name',
        'description',
        'version_major',
        'version_minor',
        'version_patch',
      ]);
    });

    it('splits a version into its triple', async () => {
      expect(
        await rowById('00000000-0000-0000-0000-0000000000c3'),
      ).toMatchObject({
        version_major: 1,
        version_minor: 2,
        version_patch: 3,
      });
    });

    it('leaves a version the pattern refuses with no triple', async () => {
      expect(
        (await rowById('00000000-0000-0000-0000-0000000000c4'))[
          'version_major'
        ] ?? null,
      ).toBeNull();
    });

    it('orders 0.10.0 above 0.9.0, which the version string does not', async () => {
      const rows = (await queryRunner.query(
        `SELECT "version" FROM "package_releases"
         WHERE "package_id" = '${packageId}'
         ORDER BY "version_major" DESC, "version_minor" DESC, "version_patch" DESC`,
      )) as Row[];

      expect(rows.map((row) => row['version'])).toEqual(['0.10.0', '0.9.0']);
    });

    describe('and then rolled back', () => {
      beforeEach(async () => {
        await migration.down(queryRunner);
      });

      /*
       * Read off information_schema rather than a row, because pg-mem keeps a
       * dropped column on rows it has already materialised; the catalogue is
       * the only place that answers what the table now holds.
       */
      it('drops the triple', async () => {
        expect(await columnNames()).toEqual([
          'id',
          'package_id',
          'version',
          'name',
          'description',
        ]);
      });
    });
  });
});
