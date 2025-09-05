import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScopeToStandards1753799258922 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standards" 
            ADD COLUMN "scope" varchar NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "standards" 
            DROP COLUMN "scope"
        `);
  }
}
