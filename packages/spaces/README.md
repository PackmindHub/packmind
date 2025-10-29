# @packmind/spaces

A TypeScript package for space management in the Packmind monorepo. This package follows hexagonal architecture principles and provides functionality for managing spaces within organizations.

## Architecture

The package follows **hexagonal architecture** with clear separation of concerns:

- **Domain Layer** (`domain/`): Core business entities and repository interfaces
- **Application Layer** (`application/`): Services orchestrating domain logic
- **Infrastructure Layer** (`infra/`): TypeORM implementations and database schemas
- **Hexagon** (`SpacesHexa.ts`): Main entry point with dependency injection

## Features

### Space Management

- ✅ Space creation with slug generation
- ✅ Space slug uniqueness validation per organization
- ✅ Default "Global" space for every organization
- ✅ Soft delete support
- ✅ Organization scoping

## Installation

```bash
npm install @packmind/spaces
```

## Usage

### Basic Setup

```typescript
import { SpacesHexa } from '@packmind/spaces';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...spacesSchemas],
});

const spacesHexa = new SpacesHexa({ dataSource });
```

### Space Management

```typescript
// Create a new space
const space = await spacesHexa.createSpace('My Space', organizationId);

// Get space by ID
const space = await spacesHexa.getSpaceById(spaceId);

// Get space by slug within organization
const space = await spacesHexa.getSpaceBySlug('my-space', organizationId);

// List spaces for an organization
const spaces = await spacesHexa.listSpacesByOrganization(organizationId);
```

## Data Models

### Space Entity

```typescript
type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
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

- `spaces`: Space records with unique (slug, organization_id) constraint

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
- `@packmind/shared`: Shared utilities and schemas

## License

Private package for Packmind monorepo.
