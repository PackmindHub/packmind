import { TableColumnOptions } from 'typeorm';

export const uuidMigrationColumn: TableColumnOptions = {
  name: 'id',
  type: 'uuid',
  isPrimary: true,
};

export const timestampsMigrationColumns: TableColumnOptions[] = [
  {
    name: 'created_at',
    type: 'timestamp with time zone',
    default: 'CURRENT_TIMESTAMP',
    isNullable: false,
  },
  {
    name: 'updated_at',
    type: 'timestamp with time zone',
    default: 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    isNullable: false,
  },
];

export const softDeleteMigrationColumns: TableColumnOptions[] = [
  {
    name: 'deleted_at',
    type: 'timestamp with time zone',
    default: null,
    isNullable: true,
  },
  {
    name: 'deleted_by',
    type: 'varchar',
    default: null,
    isNullable: true,
  },
];
