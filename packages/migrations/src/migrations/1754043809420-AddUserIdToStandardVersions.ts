import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToStandardVersions1754043809420 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            ADD COLUMN "user_id" uuid NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standard_versions" 
            DROP COLUMN "user_id"
        `);
  }
}
