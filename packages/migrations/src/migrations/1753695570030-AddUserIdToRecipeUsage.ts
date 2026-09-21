import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToRecipeUsage1753695570030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete existing recipe_usage data since it would be incomplete without userId
    await queryRunner.query(`
            DELETE FROM "recipe_usage"
        `);

    await queryRunner.query(`
            ALTER TABLE "recipe_usage" 
            ADD COLUMN "user_id" uuid NOT NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "recipe_usage" 
            ADD CONSTRAINT "FK_recipe_usage_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "recipe_usage" 
            DROP CONSTRAINT "FK_recipe_usage_user"
        `);

    await queryRunner.query(`
            ALTER TABLE "recipe_usage" 
            DROP COLUMN "user_id"
        `);
  }
}
