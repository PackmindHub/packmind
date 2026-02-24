Implement gateways in the Packmind frontend to create a clean abstraction for API communication, enhancing maintainability and testability across the application.

## When to Use

- When you need to add API communication for a new domain
- When implementing CRUD operations in the frontend
- When you want to standardize API interaction patterns
- When you need a testable abstraction for API calls

## Context Validation Checkpoints

* [ ] Have you identified the domain and its entities?
* [ ] Do you know which API endpoints the gateway will interact with?
* [ ] Is the PackmindGateway base class available in your shared folder?
* [ ] Have you defined the entity types in the domain package?

## Recipe Steps

### Step 1: Create Gateway Interface

Create I{Domain}Gateway.ts in apps/frontend/src/domain/{domain}/api/gateways/ that defines the contract for all gateway operations. Include method signatures for CRUD operations and any domain-specific queries.

```typescript
import { EntityType } from '@packmind/{domain}';

export interface I{Domain}Gateway {
  get{Entities}(): Promise<EntityType[]>;
  get{Entity}ById(id: string): Promise<EntityType>;
  create{Entity}(entity: Omit<EntityType, 'id' | 'slug' | 'version'>): Promise<EntityType>;
  // Add other CRUD operations as needed
}
```

### Step 2: Create Gateway Implementation

Create {Domain}GatewayApi.ts that extends PackmindGateway and implements the interface. Pass the API endpoint to the super constructor and implement each method using this._api.

```typescript
import { EntityType } from '@packmind/{domain}';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { I{Domain}Gateway } from './I{Domain}Gateway';

export class {Domain}GatewayApi extends PackmindGateway implements I{Domain}Gateway {
  constructor() {
    super('/{domain-endpoint}');
  }

  async get{Entities}(): Promise<EntityType[]> {
    return this._api.get<EntityType[]>(this._endpoint);
  }

  async get{Entity}ById(id: string): Promise<EntityType> {
    return this._api.get<EntityType>(`${this._endpoint}/${id}`);
  }

  async create{Entity}(entity: Omit<EntityType, 'id' | 'slug' | 'version'>): Promise<EntityType> {
    return this._api.put<EntityType>(this._endpoint, entity);
  }
}
```

### Step 3: Export Gateway Instance

Create index.ts in the gateways folder to instantiate and export the gateway singleton. This provides a single instance for the entire application.

```typescript
import { I{Domain}Gateway } from './I{Domain}Gateway';
import { {Domain}GatewayApi } from './{Domain}GatewayApi';

export const {domain}Gateway: I{Domain}Gateway = new {Domain}GatewayApi();
```

### Step 4: Use Gateway in React Query Hooks

Import and use the gateway in your queries file to create React Query hooks. Define query hooks for reads and mutation hooks for writes, including proper cache invalidation.

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityType } from '@packmind/{domain}';
import { {domain}Gateway } from '../gateways';

export const useGet{Entities}Query = () => {
  return useQuery({
    queryKey: ['{entities}'],
    queryFn: () => {domain}Gateway.get{Entities}(),
  });
};

export const useGet{Entity}ByIdQuery = (id: string) => {
  return useQuery({
    queryKey: ['{entity}', id],
    queryFn: () => {domain}Gateway.get{Entity}ById(id),
    enabled: !!id,
  });
};

export const useCreate{Entity}Mutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['create{Entity}'],
    mutationFn: async (newEntity: Omit<EntityType, 'id' | 'slug' | 'version'>) => {
      return {domain}Gateway.create{Entity}({ ...newEntity });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['{entities}'],
      });
    },
  });
};
```

### Step 5: Use Query Hooks in Components

Import and use the query hooks in your React components. Handle loading, error, and success states appropriately for good UX.

```typescript
import { useGet{Entities}Query } from '../api/queries/{Domain}Queries';

export const {Domain}List = () => {
  const { data: entities, isLoading, isError } = useGet{Entities}Query();
  
  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error loading entities.</p>;
  
  return (
    <div>
      {entities?.map(entity => (
        <div key={entity.id}>{entity.name}</div>
      ))}
    </div>
  );
};
```
