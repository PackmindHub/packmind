import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToRecipeVersions1754134836502 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the column as nullable (remains nullable for git commits)
    await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            ADD COLUMN "user_id" uuid NULL
        `);

    // Note: We intentionally leave user_id as nullable since:
    // - Git commits don't have a specific user (null)
    // - UI updates have a specific user (UserId)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            DROP COLUMN "user_id"
        `);
  }
}
