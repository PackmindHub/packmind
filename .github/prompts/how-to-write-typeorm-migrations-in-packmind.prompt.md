---
description: 'Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.'
agent: 'agent'
---

Write TypeORM migrations in the Packmind monorepo to manage database schema changes effectively while ensuring proper logging and rollback capabilities.

## When to Use

- When you need to create new database tables
- When adding or modifying columns in existing tables
- When creating or updating foreign key relationships
- When making any database schema changes that need to be version controlled

## Context Validation Checkpoints

* [ ] Have you identified the exact database schema changes needed?
* [ ] Do you know the TypeORM column types for all fields?
* [ ] Have you planned the rollback strategy (down method)?
* [ ] Are you familiar with the shared migration utilities in @packmind/shared?

## Recipe Steps

### Step 1: Create Migration File Using TypeORM CLI

IMPORTANT: Always create migration files using the TypeORM CLI command. Never create migration files manually. The CLI automatically generates a timestamp prefix and sets up the basic structure.

```bash
# Create new migration file (TypeORM will automatically add timestamp)
npx typeorm migration:create packages/migrations/src/migrations/DescriptiveName
```

### Step 2: Set Up Basic Migration Structure with Logging

Implement the migration class with PackmindLogger for comprehensive logging. Include try-catch blocks and log start, progress, completion, and any errors.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/shared';

export class YourMigrationName1234567890 implements MigrationInterface {
  private readonly logger = new PackmindLogger(
    'YourMigrationName1234567890',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: YourMigrationName');
    
    try {
      // Your migration logic here
      this.logger.info('Migration YourMigrationName completed successfully');
    } catch (error) {
      this.logger.error('Migration YourMigrationName failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: YourMigrationName');
    
    try {
      // Your rollback logic here
      this.logger.info('Rollback YourMigrationName completed successfully');
    } catch (error) {
      this.logger.error('Rollback YourMigrationName failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
```

### Step 3: Implement Table Creation Pattern

Use TypeORM Table class with shared helper columns (uuidMigrationColumn, timestampsMigrationColumns) from @packmind/shared to create new tables with consistent structure.

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';

export class CreateYourTable1234567890 implements MigrationInterface {
  private readonly table = new Table({
    name: 'your_table',
    columns: [
      uuidMigrationColumn, // Standard UUID primary key
      {
        name: 'name',
        type: 'varchar',
      },
      {
        name: 'description',
        type: 'text',
        isNullable: true,
      },
      ...timestampsMigrationColumns, // created_at, updated_at
    ],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(this.table);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.table);
  }
}
```

### Step 4: Implement Column Addition Pattern

Use TableColumn class for adding individual columns or raw SQL for multiple columns. Always make new columns nullable initially for backward compatibility.

```typescript
// Single column with TableColumn
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsToTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'your_table',
      new TableColumn({
        name: 'new_column',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('your_table', 'new_column');
  }
}

// Multiple columns with raw SQL
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE "your_table" 
    ADD COLUMN "column1" varchar NULL,
    ADD COLUMN "column2" varchar NULL,
    ADD COLUMN "column3" varchar NULL
  `);
}
```

### Step 5: Implement Foreign Key Pattern

Create foreign key relationships using TableForeignKey class with proper cascade behavior. Always handle foreign keys before dropping related tables.

```typescript
import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddForeignKey1234567890 implements MigrationInterface {
  private readonly foreignKey = new TableForeignKey({
    columnNames: ['parent_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'parent_table',
    onDelete: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey('child_table', this.foreignKey);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('child_table', this.foreignKey);
  }
}
```

### Step 6: Run and Test Migrations

Execute migrations using npm scripts for both local development and Docker environments. Test both up and down migrations.

```bash
# Local development
npm run typeorm migration:run
npm run typeorm migration:revert
npm run typeorm migration:show

# Docker environment
npm run typeorm migration:run -- -d datasourceDocker.ts
```

### Step 7: Follow Migration Best Practices

Always include comprehensive logging with PackmindLogger, wrap operations in try-catch blocks, write reversible migrations with corresponding down operations, use descriptive names with verbs (Add, Remove, Update, Create, Drop), and handle foreign key dependencies properly when dropping tables.