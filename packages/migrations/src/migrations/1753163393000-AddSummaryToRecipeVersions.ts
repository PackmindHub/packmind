import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSummaryToRecipeVersions1753163393000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            ADD COLUMN "summary" text NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            DROP COLUMN "summary"
        `);
  }
}
