import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSummaryToStandardVersions1753972152000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            ADD COLUMN "summary" text NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            DROP COLUMN "summary"
        `);
  }
}
