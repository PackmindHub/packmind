# @packmind/spaces

A TypeScript package for space management in the Packmind monorepo. This package follows hexagonal architecture principles and provides functionality for managing spaces within organizations.

## Architecture

The package follows **hexagonal architecture** with clear separation of concerns:

- **Domain Layer** (`domain/`): Repository interfaces, domain errors and the `SpaceName` value object (entity types live in `@packmind/types`)
- **Application Layer** (`application/`): Use cases, services orchestrating domain logic, and the `SpacesAdapter` implementing `ISpacesPort`
- **Infrastructure Layer** (`infra/`): TypeORM implementations and database schemas
- **Hexagon** (`SpacesHexa.ts`): Main entry point with dependency injection

## Features

### Space Management

- ✅ Space creation with slug generation
- ✅ Space slug uniqueness validation per organization
- ✅ Default "Global" space for every organization
- ✅ Soft delete support
- ✅ Organization scoping

### Space Membership

- ✅ Space members with roles (`UserSpaceMembership`)
- ✅ Adding, removing and role updates for space members
- ✅ Listing the spaces a user belongs to

## Installation

This package is private to the monorepo; consumers declare it with the workspace protocol:

```json
{
  "dependencies": {
    "@packmind/spaces": "workspace:*"
  }
}
```

## Usage

### Basic Setup

```typescript
import { SpacesHexa, spacesSchemas } from '@packmind/spaces';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...spacesSchemas],
});

const spacesHexa = new SpacesHexa(dataSource);
```

In the API the hexa is not constructed by hand: it is registered in a `HexaRegistry`, which constructs it and calls `initialize()` so its adapter can resolve the accounts port.

### Space Management

Domain operations are exposed through the `ISpacesPort` adapter:

```typescript
const spacesPort = spacesHexa.getAdapter();

// Create a new space
const space = await spacesPort.createSpace({
  userId,
  organizationId,
  name: 'My Space',
});

// Get space by ID
const space = await spacesPort.getSpaceById(spaceId);

// Get space by slug within organization
const space = await spacesPort.getSpaceBySlug('my-space', organizationId);

// List spaces for an organization
const spaces = await spacesPort.listSpacesByOrganization(organizationId);
```

## Data Models

### Space Entity

Defined in `@packmind/types`:

```typescript
type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  type: SpaceType;
  organizationId: OrganizationId;
  isDefaultSpace: boolean;
  color: SpaceColor;
};
```

## Database Schema

The package includes TypeORM schemas with automatic timestamp, UUID, and soft delete management:

```typescript
import { spacesSchemas } from '@packmind/spaces';

const dataSource = new DataSource({
  type: 'postgres',
  entities: [...spacesSchemas],
});
```

### Tables Created

- `spaces`: Space records with a unique (slug, organization_id) index on non-deleted rows
- `user_space_memberships`: Space membership records keyed by (user_id, space_id)

## Testing

```bash
# Run tests
nx test spaces

# Run tests with coverage
nx test spaces --coverage

# Run linting
nx lint spaces
```

## Dependencies

- `uuid`: UUID generation
- `slug`: Slug generation
- `typeorm`: Database ORM
- `@packmind/node-utils`: `BaseHexa`, `HexaRegistry`, schema helpers
- `@packmind/types`: Entity types and use case contracts
- `@packmind/logger`: Logging
- `@packmind/accounts`, `@packmind/test-utils`: Test factories and helpers used by the specs (at runtime, accounts is reached through `IAccountsPort`)

## License

Private package for Packmind monorepo.
