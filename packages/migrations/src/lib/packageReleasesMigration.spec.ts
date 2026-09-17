import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { CreatePackageReleases1821000000000 } from '../migrations/1821000000000-CreatePackageReleases';

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

  // This migration passes table names (not Table objects) to createIndex and
  // createForeignKey, so TypeORM re-reads the schema before emitting each one.
  // pg-mem cannot answer two of those introspection queries: the column one
  // correlates a subquery against the outer information_schema.columns alias,
  // and the index one reads pg_am, which pg-mem does not implement. Both are
  // answered here from what pg-mem does know, which is enough for TypeORM to
  // locate the table and emit the DDL. The DDL itself — including the ON DELETE
  // clauses these tests are about — is executed by pg-mem for real.
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

const packageId = '00000000-0000-0000-0000-0000000000a1';
const releaseId = '00000000-0000-0000-0000-0000000000b1';
const pinnedCommandVersionId = '00000000-0000-0000-0000-0000000000c1';
const unpinnedCommandVersionId = '00000000-0000-0000-0000-0000000000c2';
const pinnedStandardVersionId = '00000000-0000-0000-0000-0000000000d1';
const pinnedSkillVersionId = '00000000-0000-0000-0000-0000000000e1';

describe('CreatePackageReleases1821000000000', () => {
  const migration = new CreatePackageReleases1821000000000(silentLogger);
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const countRows = async (table: string): Promise<number> => {
    const rows = await queryRunner.query(`SELECT * FROM "${table}"`);
    return rows.length;
  };

  const deleteVersion = (table: string, id: string): Promise<unknown> =>
    queryRunner.query(`DELETE FROM "${table}" WHERE "id" = '${id}'`);

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "packages" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "command_versions" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "standard_versions" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "skill_versions" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL
      )
    `);

    await queryRunner.query(
      `INSERT INTO "packages" ("id", "name") VALUES ('${packageId}', 'billing')`,
    );
    await queryRunner.query(
      `INSERT INTO "command_versions" ("id", "name") VALUES
         ('${pinnedCommandVersionId}', 'pinned command'),
         ('${unpinnedCommandVersionId}', 'unpinned command')`,
    );
    await queryRunner.query(
      `INSERT INTO "standard_versions" ("id", "name") VALUES ('${pinnedStandardVersionId}', 'pinned standard')`,
    );
    await queryRunner.query(
      `INSERT INTO "skill_versions" ("id", "name") VALUES ('${pinnedSkillVersionId}', 'pinned skill')`,
    );
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  describe('when the migration is applied and a release pins one version of each kind', () => {
    beforeEach(async () => {
      await migration.up(queryRunner);

      await queryRunner.query(
        `INSERT INTO "package_releases" ("id", "package_id", "version", "name", "description")
         VALUES ('${releaseId}', '${packageId}', '1.0.0', 'billing', 'the billing package')`,
      );
      await queryRunner.query(
        `INSERT INTO "package_release_command_versions" ("package_release_id", "command_version_id")
         VALUES ('${releaseId}', '${pinnedCommandVersionId}')`,
      );
      await queryRunner.query(
        `INSERT INTO "package_release_standard_versions" ("package_release_id", "standard_version_id")
         VALUES ('${releaseId}', '${pinnedStandardVersionId}')`,
      );
      await queryRunner.query(
        `INSERT INTO "package_release_skill_versions" ("package_release_id", "skill_version_id")
         VALUES ('${releaseId}', '${pinnedSkillVersionId}')`,
      );
    });

    // Control case: an unpinned version still deletes. Without it, the refusal
    // cases below would pass just as happily if the foreign key had never been
    // created, since the deletes would then have nothing to refuse.
    it('deletes a command version that no release pins', async () => {
      await deleteVersion('command_versions', unpinnedCommandVersionId);

      expect(await countRows('command_versions')).toBe(1);
    });

    it('refuses to delete a command version that a release pins', async () => {
      await expect(
        deleteVersion('command_versions', pinnedCommandVersionId),
      ).rejects.toThrow();
    });

    it('keeps the join row when a pinned command version delete is refused', async () => {
      await deleteVersion('command_versions', pinnedCommandVersionId).catch(
        () => undefined,
      );

      expect(await countRows('package_release_command_versions')).toBe(1);
    });

    it('refuses to delete a standard version that a release pins', async () => {
      await expect(
        deleteVersion('standard_versions', pinnedStandardVersionId),
      ).rejects.toThrow();
    });

    it('keeps the join row when a pinned standard version delete is refused', async () => {
      await deleteVersion('standard_versions', pinnedStandardVersionId).catch(
        () => undefined,
      );

      expect(await countRows('package_release_standard_versions')).toBe(1);
    });

    it('refuses to delete a skill version that a release pins', async () => {
      await expect(
        deleteVersion('skill_versions', pinnedSkillVersionId),
      ).rejects.toThrow();
    });

    it('keeps the join row when a pinned skill version delete is refused', async () => {
      await deleteVersion('skill_versions', pinnedSkillVersionId).catch(
        () => undefined,
      );

      expect(await countRows('package_release_skill_versions')).toBe(1);
    });

    describe('and the release itself is deleted', () => {
      beforeEach(async () => {
        await queryRunner.query(
          `DELETE FROM "package_releases" WHERE "id" = '${releaseId}'`,
        );
      });

      it('cascades every join row away', async () => {
        expect([
          await countRows('package_release_command_versions'),
          await countRows('package_release_standard_versions'),
          await countRows('package_release_skill_versions'),
        ]).toEqual([0, 0, 0]);
      });
    });
  });
});
