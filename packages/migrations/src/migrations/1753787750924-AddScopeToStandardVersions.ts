import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScopeToStandardVersions1753787750924
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            ADD COLUMN "scope" varchar NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            DROP COLUMN "scope"
        `);
  }
}
