import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchToGitRepo1752700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "git_repos" 
            ADD COLUMN "branch" varchar NOT NULL DEFAULT 'main'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "git_repos" 
            DROP COLUMN "branch"
        `);
  }
}
