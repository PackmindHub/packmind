# @packmind/accounts

A TypeScript package for user and organization management in the Packmind monorepo. This package follows hexagonal architecture principles and provides a comprehensive solution for user authentication, organization management, and multi-tenant SaaS functionality.

## Architecture

The package follows **hexagonal architecture** with clear separation of concerns:

- **Domain Layer** (`domain/`): Core business entities and repository interfaces
- **Application Layer** (`application/`): Services orchestrating domain logic
- **Infrastructure Layer** (`infra/`): TypeORM implementations and database schemas
- **Hexagon** (`AccountsHexa.ts`): Main entry point with dependency injection following hexagonal architecture

## Features

### User Management

- ✅ User creation with bcrypt password hashing
- ✅ Username uniqueness validation
- ✅ Password validation
- ✅ User lookup by ID or username
- ✅ Organization membership management

### Organization Management

- ✅ Organization creation
- ✅ Organization name uniqueness validation
- ✅ Organization lookup by ID or name
- ✅ Multi-tenant support

### Security

- ✅ bcrypt password hashing (12 salt rounds)
- ✅ Database-level unique constraints
- ✅ Input validation and error handling

## Installation

```bash
npm install @packmind/accounts
```

## Usage

### Basic Setup

```typescript
import { AccountsHexa } from '@packmind/accounts';
import { DataSource } from 'typeorm';

// Initialize with DataSource (recommended)
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...accountsSchemas],
});

const accountsHexa = new AccountsHexa({ dataSource });
```

### User Management

```typescript
// Create a new user
const user = await accountsHexa.signUpUser('john.doe', 'securePassword123', [
  'org-1',
  'org-2',
]);

// Get user by ID
const user = await accountsHexa.getUserById('user-id');

// Get user by username
const user = await accountsHexa.getUserByUsername('john.doe');

// Validate password
const isValid = await accountsHexa.validatePassword(
  'securePassword123',
  user.passwordHash,
);

// List all users
const users = await accountsHexa.listUsers();
```

### Organization Management

```typescript
// Create a new organization
const org = await accountsHexa.createOrganization('Tech Corporation');

// Get organization by ID
const org = await accountsHexa.getOrganizationById('org-id');

// Get organization by name (backend will slugify internally)
const org = await accountsHexa.getOrganizationByName('Tech Corporation');

// List all organizations
const orgs = await accountsHexa.listOrganizations();
```

### Advanced Setup with Custom Services

```typescript
import {
  UserService,
  OrganizationService,
  UserRepository,
  OrganizationRepository,
} from '@packmind/accounts';

// Custom setup with dependency injection
const userRepo = new UserRepository(dataSource.getRepository(UserSchema));
const orgRepo = new OrganizationRepository(
  dataSource.getRepository(OrganizationSchema),
);

const userService = new UserService(userRepo);
const orgService = new OrganizationService(orgRepo);

const accountsHexa = new AccountsHexa({
  services: {
    userService,
    organizationService: orgService,
  },
});
```

## Data Models

### User Entity

```typescript
type User = {
  id: string;
  username: string;
  passwordHash: string;
};
```

### Organization Entity

```typescript
type Organization = {
  id: string;
  name: string;
};
```

## Database Schema

The package includes TypeORM schemas with automatic timestamp and UUID management:

```typescript
import { accountsSchemas } from '@packmind/accounts';

// Add to your TypeORM configuration
const dataSource = new DataSource({
  type: 'postgres',
  entities: [...accountsSchemas],
  // ... other config
});
```

### Tables Created

- `users`: User records with unique username constraint
- `organizations`: Organization records with unique name constraint

## Error Handling

The package provides comprehensive error handling:

```typescript
try {
  await accountsHexa.signUpUser('existing-username', 'password', 'org-id');
} catch (error) {
  // Error: Username 'existing-username' already exists
}

try {
  await accountsHexa.createOrganization('Existing Organization');
} catch (error) {
  // Error: Organization name 'Existing Organization' already exists
}
```

## Testing

The package includes comprehensive test coverage:

```bash
# Run tests
nx test accounts

# Run tests with coverage
nx test accounts --coverage

# Run linting
nx lint accounts
```

## Dependencies

- `bcrypt`: Password hashing
- `uuid`: UUID generation
- `typeorm`: Database ORM
- `@packmind/shared`: Shared utilities and schemas

## Contributing

1. Follow the existing hexagonal architecture patterns
2. Write comprehensive tests for all new features
3. Update documentation for API changes
4. Follow the established coding conventions

## License

Private package for Packmind monorepo.
