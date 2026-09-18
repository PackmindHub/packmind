import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToDetectionPrograms1756190000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            ADD COLUMN "status" varchar NOT NULL DEFAULT 'CONFIGURED'
        `);

    // Remove the default after adding the column (new records will need to explicitly set status)
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            ALTER COLUMN "status" DROP DEFAULT
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            DROP COLUMN "status"
        `);
  }
}
