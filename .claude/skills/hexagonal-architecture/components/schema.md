# Schema (TypeORM EntitySchema)

**Layer**: Infrastructure
**Location**: `packages/{domain}/src/infra/schemas/{Entity}Schema.ts`

Schemas map domain entities to database tables using TypeORM's `EntitySchema` API (not decorators).

## Structure

```typescript
import { EntitySchema } from 'typeorm';
import { Standard } from '@packmind/types';
import {
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
  WithSoftDelete,
  WithTimestamps,
} from '@packmind/node-utils';

export const StandardSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Standard>>
>({
  name: 'Standard',
  tableName: 'standards',
  columns: {
    name: { type: 'varchar' },
    slug: { type: 'varchar' },
    description: { type: 'text', nullable: true },
    version: { type: 'int', default: 1 },
    userId: { name: 'user_id', type: 'uuid' },
    spaceId: { name: 'space_id', type: 'uuid' },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    versions: {
      type: 'one-to-many',
      target: 'StandardVersion',
      inverseSide: 'standard',
    },
    space: {
      type: 'many-to-one',
      target: 'Space',
      joinColumn: { name: 'space_id' },
    },
  },
  indices: [
    { name: 'idx_standard_user', columns: ['userId'] },
    { name: 'idx_standard_slug_space', columns: ['slug', 'spaceId'], unique: true },
  ],
});
```

## Schema Mixins

Schemas use these shared column definitions from `@packmind/node-utils`:

| Mixin | Columns Added |
|-------|--------------|
| `uuidSchema` | `id` (uuid, primary, generated) |
| `timestampsSchemas` | `createdAt`, `updatedAt` (auto-managed) |
| `softDeleteSchemas` | `deletedAt` (nullable timestamp for soft deletes) |

## Conventions

- **EntitySchema API** — not decorators. Schemas are plain objects.
- **Type wrapper** — `WithSoftDelete<WithTimestamps<Entity>>` ensures TypeScript sees all columns
- **Column naming** — `camelCase` for entity property, `snake_case` for DB column via `name:` field
  - `userId` -> `name: 'user_id'`
  - `spaceId` -> `name: 'space_id'`
- **Table naming** — plural `snake_case` (`standards`, `rule_examples`)
- **Always include `uuidSchema` and `timestampsSchemas`** — `softDeleteSchemas` is a design decision per entity (omit it if the entity should not support soft deletes)
- **Indices** — recommended with meaningful names (`idx_{table}_{columns}`); not all schemas require them
