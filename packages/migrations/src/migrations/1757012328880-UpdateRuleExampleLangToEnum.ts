import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'UpdateRuleExampleLangToTYPESCRIPT1757012328880';

export class UpdateRuleExampleLangToTYPESCRIPT1757012328880
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: NormalizeRuleExampleLang');

    try {
      this.logger.debug('Updating existing lang values to match enum values');

      await queryRunner.query(`
                UPDATE rule_examples 
                SET lang = CASE 
                    WHEN LOWER(lang) IN ('typescript', 'ts') OR lang = 'TypeScript' THEN 'TYPESCRIPT'
                    ELSE COALESCE(lang, 'JAVASCRIPT')  -- Keep existing value or default to JAVASCRIPT
                END
            `);
      this.logger.info(
        'Migration NormalizeRuleExampleLang completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration NormalizeRuleExampleLang failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: NormalizeRuleExampleLang');

    try {
      // Revert the language values back to their original string format
      this.logger.debug('Reverting lang values to original format');
      await queryRunner.query(`
                UPDATE rule_examples 
                SET lang = CASE 
                    WHEN lang = 'TYPESCRIPT' THEN 'TypeScript'
                    ELSE lang  -- Keep as-is for any other values
                END
            `);

      this.logger.info(
        'Rollback NormalizeRuleExampleLang completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback NormalizeRuleExampleLang failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
