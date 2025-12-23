import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddOperationToDistributedPackages1765885638548';

export class AddOperationToDistributions1765885638548 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddOperationToDistributedPackages');

    try {
      await queryRunner.query(`
        ALTER TABLE "distributed_packages"
        ADD COLUMN "operation" varchar NOT NULL DEFAULT 'add'
      `);

      this.logger.info(
        'Migration AddOperationToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddOperationToDistributedPackages failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddOperationToDistributedPackages');

    try {
      await queryRunner.query(`
        ALTER TABLE "distributed_packages"
        DROP COLUMN "operation"
      `);

      this.logger.info(
        'Rollback AddOperationToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddOperationToDistributedPackages failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
