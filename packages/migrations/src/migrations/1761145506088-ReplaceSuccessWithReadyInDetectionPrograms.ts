import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSuccessWithReadyInDetectionPrograms1761145506088
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update all detection_programs with status='SUCCESS' to status='READY'
    await queryRunner.query(`
      UPDATE "detection_programs" 
      SET "status" = 'READY' 
      WHERE "status" = 'SUCCESS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert all detection_programs with status='READY' to status='SUCCESS'
    await queryRunner.query(`
      UPDATE "detection_programs" 
      SET "status" = 'SUCCESS' 
      WHERE "status" = 'READY'
    `);
  }
}
