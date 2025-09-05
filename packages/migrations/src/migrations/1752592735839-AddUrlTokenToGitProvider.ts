import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrlTokenToGitProvider1752592735839
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "git_providers" 
            ADD COLUMN "url" varchar NULL,
            ADD COLUMN "token" varchar NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "git_providers" 
            DROP COLUMN "url",
            DROP COLUMN "token"
        `);
  }
}
