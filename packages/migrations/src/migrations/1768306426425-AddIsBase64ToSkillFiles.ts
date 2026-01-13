import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddIsBase64ToSkillFiles1768306426425';

export class AddIsBase64ToSkillFiles1768306426425 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddIsBase64ToSkillFiles');
    await queryRunner.addColumn(
      'skill_files',
      new TableColumn({
        name: 'is_base64',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
    this.logger.info('Migration AddIsBase64ToSkillFiles completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddIsBase64ToSkillFiles');
    await queryRunner.dropColumn('skill_files', 'is_base64');
    this.logger.info('Rollback AddIsBase64ToSkillFiles completed');
  }
}
