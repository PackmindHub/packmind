import { EntitySchemaColumnOptions } from 'typeorm';

export const uuidSchema = {
  id: {
    type: 'uuid',
    primary: true,
  } as EntitySchemaColumnOptions,
};

export const timestampsSchemas = {
  createdAt: {
    name: 'created_at',
    type: 'timestamp with time zone',
    createDate: true,
  } as EntitySchemaColumnOptions,
  updatedAt: {
    name: 'updated_at',
    type: 'timestamp with time zone',
    updateDate: true,
  } as EntitySchemaColumnOptions,
};

export const softDeleteSchemas = {
  deletedAt: {
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
    deleteDate: true,
  } as EntitySchemaColumnOptions,
  deletedBy: {
    name: 'deleted_by',
    type: 'varchar',
    nullable: true,
  } as EntitySchemaColumnOptions,
};
