---
description: 'Create and evolve TypeORM-backed domain models, schemas, repositories, and migrations to keep your database structure consistent, maintainable, and backward compatible when business requirements or existing entities change.'
---

Create new models and update existing ones with TypeORM to ensure proper database structure and maintainability when adapting to evolving business requirements.

## When to Use

- When you need to create a new entity in your hexagonal domain
- When adding new properties to existing models
- When modifying existing property types or relationships
- When business logic requirements change and database schema needs updating

## Context Validation Checkpoints

- [ ] Have you identified which hexagon package the model belongs to?
- [ ] Do you know the TypeORM column types needed for each property?
- [ ] Have you considered backward compatibility when adding required fields?
- [ ] Is there an existing test factory for similar entities to use as reference?

## Recipe Steps

### Step 1: Define Business Model

Create the business model in packages/<hexagon>/src/domain/entities/<MyModel>.ts and define the corresponding repository interface in packages/<hexagon>/src/domain/repositories/I<MyModel>Repository.ts. Export both from the hexagon.

```typescript
// packages/<hexagon>/src/domain/entities/MyModel.ts
export type MyModel = {
  id: string;
  name: string;
  description?: string;
};
```

### Step 2: Define TypeORM Schema

Create the TypeORM schema in packages/<hexagon>/src/infra/schemas/<MyModel>Schema.ts using EntitySchema with proper column definitions, UUID schema, and timestamp schemas from @packmind/node-utils.

```typescript
import { EntitySchema } from 'typeorm';
import { MyModel } from '../../domain/entities/MyModel';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';

export const MyModelSchema = new EntitySchema<WithTimestamps<MyModel>>({
  name: 'MyModel',
  tableName: 'mymodels',
  columns: {
    ...uuidSchema,
    name: { type: 'varchar' },
    description: { type: 'text', nullable: true },
    ...timestampsSchemas,
  },
});
```

### Step 3: Make Schema Available to App

Register the new schema in apps/api/src/app/app.module.ts to ensure TypeORM recognizes it during database operations.

### Step 4: Implement Repository

Create repository implementation in packages/<hexagon>/src/infra/repository/<MyModel>Repository.ts that implements the repository interface and uses the TypeORM schema.

```typescript
import { MyModel } from '../../domain/entities/MyModel';
import { IMyModelRepository } from '../../domain/repositories/IMyModelRepository';
import dataSource from '../datasource';
import { MyModelSchema } from '../schemas/MyModelSchema';
import { Repository } from 'typeorm';

export class MyModelRepository implements IMyModelRepository {
  constructor(
    private readonly repository: Repository<MyModel> = dataSource.getRepository<MyModel>(
      MyModelSchema,
    ),
  ) {}

  async add(model: MyModel): Promise<MyModel> {
    return this.repository.save(model);
  }

  async list(): Promise<MyModel[]> {
    return this.repository.find();
  }
}
```

### Step 5: Create Migration

Create a new migration using the TypeORM CLI command and implement the up/down methods to define all required fields. Always use the CLI to create migrations, never create them manually.

```bash
npm run typeorm migration:create ./migrations/MyModel
```

### Step 6: Run Migration

Execute the migration to apply database changes using the TypeORM CLI with the appropriate datasource configuration.

```bash
npm run typeorm migration:run -- --dataSource=datasource.ts
```

### Step 7: Update Existing Models (When Needed)

When updating existing models, always add new fields as nullable first to avoid breaking existing data. Update the entity type definition, TypeORM schema, create a migration with ALTER TABLE statements, update test factories, and update services/use cases that create or update the model. Consider backward compatibility and test migrations on a copy of production data before deploying.
