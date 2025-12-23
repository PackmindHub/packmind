import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'ReplaceUsernameWithEmail1758633415000';

/**
 * Replaces the username field with email field in the users table.
 * Converts existing usernames to email format by appending @packmind.com domain.
 */
export class ReplaceUsernameWithEmail1758633415000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: ReplaceUsernameWithEmail');

    try {
      // Add the new email column
      await queryRunner.query(`
        ALTER TABLE users
        ADD COLUMN email VARCHAR(255)
      `);
      this.logger.info('Added email column to users table');

      // Copy username data to email with @packmind.com suffix only if not already an email
      await queryRunner.query(`
        UPDATE users
        SET email = CASE
          WHEN username LIKE '%@%' THEN username
          ELSE CONCAT(username, '@packmind.com')
        END
        WHERE username IS NOT NULL
      `);
      this.logger.info('Migrated username data to email format');

      // Add NOT NULL constraint to email
      await queryRunner.query(`
        ALTER TABLE users
        ALTER COLUMN email SET NOT NULL
      `);
      this.logger.info('Added NOT NULL constraint to email column');

      // Add unique constraint to email
      await queryRunner.query(`
        ALTER TABLE users
        ADD CONSTRAINT unique_email UNIQUE (email)
      `);
      this.logger.info('Added unique constraint to email column');

      // Drop the username column
      await queryRunner.query(`
        ALTER TABLE users
        DROP COLUMN username
      `);
      this.logger.info('Dropped username column from users table');

      this.logger.info('Migration completed: ReplaceUsernameWithEmail');
    } catch (error) {
      this.logger.error(
        'Error during migration: ReplaceUsernameWithEmail',
        error,
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: ReplaceUsernameWithEmail');

    try {
      // Add the username column back
      await queryRunner.query(`
        ALTER TABLE users
        ADD COLUMN username VARCHAR(255)
      `);
      this.logger.info('Added username column back to users table');

      // Copy email data to username (removing @packmind.com suffix if present, keeping original emails)
      await queryRunner.query(`
        UPDATE users
        SET username = CASE
          WHEN email LIKE '%@packmind.com' THEN REPLACE(email, '@packmind.com', '')
          ELSE email
        END
        WHERE email IS NOT NULL
      `);
      this.logger.info('Reverted email data back to username');

      // Add NOT NULL constraint to username
      await queryRunner.query(`
        ALTER TABLE users
        ALTER COLUMN username SET NOT NULL
      `);
      this.logger.info('Added NOT NULL constraint to username column');

      // Add unique constraint to username
      await queryRunner.query(`
        ALTER TABLE users
        ADD CONSTRAINT unique_username UNIQUE (username)
      `);
      this.logger.info('Added unique constraint to username column');

      // Drop the email column
      await queryRunner.query(`
        ALTER TABLE users
        DROP CONSTRAINT unique_email
      `);
      await queryRunner.query(`
        ALTER TABLE users
        DROP COLUMN email
      `);
      this.logger.info('Dropped email column from users table');

      this.logger.info('Rollback completed: ReplaceUsernameWithEmail');
    } catch (error) {
      this.logger.error(
        'Error during rollback: ReplaceUsernameWithEmail',
        error,
      );
      throw error;
    }
  }
}
