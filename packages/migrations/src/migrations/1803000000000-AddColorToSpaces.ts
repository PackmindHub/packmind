import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { hashNameToSpaceColor } from '../lib/hashNameToSpaceColor';

const origin = 'AddColorToSpaces1803000000000';

export class AddColorToSpaces1803000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddColorToSpaces');

    try {
      await queryRunner.query(`
        ALTER TABLE "spaces"
        ADD COLUMN "color" varchar(16) NULL
      `);

      const rows: Array<{ id: string; name: string }> = await queryRunner.query(
        `SELECT id, name FROM "spaces"`,
      );

      for (const row of rows) {
        const color = hashNameToSpaceColor(row.name);
        await queryRunner.query(
          `UPDATE "spaces" SET "color" = $1 WHERE id = $2`,
          [color, row.id],
        );
      }

      await queryRunner.query(`
        ALTER TABLE "spaces"
        ALTER COLUMN "color" SET NOT NULL
      `);

      this.logger.info('Migration AddColorToSpaces completed successfully', {
        backfilledRows: rows.length,
      });
    } catch (error) {
      this.logger.error('Migration AddColorToSpaces failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddColorToSpaces');

    try {
      await queryRunner.query(`
        ALTER TABLE "spaces" DROP COLUMN "color"
      `);
      this.logger.info('Rollback AddColorToSpaces completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddColorToSpaces failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
