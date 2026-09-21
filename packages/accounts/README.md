# @packmind/accounts

A TypeScript package for user and organization management in the Packmind monorepo. This package follows hexagonal architecture principles and provides a comprehensive solution for user authentication, organization management, and multi-tenant SaaS functionality.

## Architecture

The package follows **hexagonal architecture** with clear separation of concerns:

- **Domain Layer** (`domain/`): Core business entities, repository interfaces, use case contracts and errors
- **Application Layer** (`application/`): Use cases, services orchestrating domain logic, and the `AccountsAdapter`
- **Infrastructure Layer** (`infra/`): TypeORM implementations and database schemas
- **Hexagon** (`AccountsHexa.ts`): Main entry point extending `BaseHexa`, exposing the domain through `getAdapter()`

Use case command and response contracts live in `@packmind/types` (`packages/types/src/accounts/contracts/`). Organization-scoped use cases extend `AbstractMemberUseCase`, and the ones restricted to organization admins extend `AbstractAdminUseCase`.

## Features

### User Management

- ✅ User creation with bcrypt password hashing
- ✅ Email uniqueness validation
- ✅ Password validation
- ✅ User lookup by ID or email
- ✅ Organization membership management
- ✅ Invitations, account activation and password reset
- ✅ API keys and CLI login codes

### Organization Management

- ✅ Organization creation
- ✅ Organization name and slug uniqueness validation
- ✅ Organization lookup by ID, name or slug
- ✅ Multi-tenant support

### Security

- ✅ bcrypt password hashing (10 salt rounds)
- ✅ Database-level unique constraints
- ✅ Input validation and error handling

## Installation

This is a private workspace package. Add it to a project's `package.json`:

```json
{
  "dependencies": {
    "@packmind/accounts": "workspace:*"
  }
}
```

## Usage

### Basic Setup

`AccountsHexa` is registered in a `HexaRegistry`, which constructs it with the shared `DataSource` and wires its cross-domain ports:

```typescript
import { AccountsHexa, AccountsHexaOpts } from '@packmind/accounts';
import { HexaRegistry } from '@packmind/node-utils';

const registry = new HexaRegistry();
registry.register(AccountsHexa, { apiKeyService } as Partial<AccountsHexaOpts>);
await registry.init(dataSource);

const accounts = registry.get(AccountsHexa).getAdapter();
```

The `apiKeyService` option is optional: without it, the API key and CLI login use cases are not initialized.

### User Management

```typescript
// Sign up a user along with their organization
const { user, organization } = await accounts.signUpWithOrganization({
  email: 'john.doe@example.com',
  password: 'securePassword123!!',
  method: 'password',
});

// Get user by ID
const user = await accounts.getUserById({ userId });

// Check whether an email is still available
const availability = await accounts.checkEmailAvailability({
  email: 'john.doe@example.com',
});

// Validate a password against a hash
const isValid = await accounts.validatePassword({
  password: 'securePassword123!!',
  hash: user.passwordHash,
});

// List the users of an organization
const users = await accounts.listOrganizationUsers({ userId, organizationId });
```

### Organization Management

```typescript
// Create a new organization
const org = await accounts.createOrganization({
  userId,
  name: 'Tech Corporation',
});

// Get organization by ID
const org = await accounts.getOrganizationById({ organizationId });

// Get organization by name
const org = await accounts.getOrganizationByName({ name: 'Tech Corporation' });

// Get organization by slug
const org = await accounts.getOrganizationBySlug({ slug: 'tech-corporation' });
```

## Data Models

### User Entity

```typescript
type User = {
  id: UserId;
  email: string;
  displayName: string | null;
  passwordHash: string | null;
  active: boolean;
  memberships: UserOrganizationMembership[];
  createdAt?: Date;
};
```

### Organization Entity

```typescript
type Organization = {
  id: OrganizationId;
  name: string;
  slug: string;
};
```

Both types are declared in `@packmind/types` (`packages/types/src/accounts/`).

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

- `users`: User records with unique email constraint
- `organizations`: Organization records with unique name and slug constraints
- `user_organization_memberships`: Membership records linking users to organizations with a role
- `user_metadata`: Per-user metadata
- `invitations`: Invitation records
- `password_reset_tokens`: Password reset tokens
- `cli_login_codes`: Short-lived CLI login codes

## Error Handling

The package provides comprehensive error handling through dedicated error classes exported from `@packmind/accounts`:

```typescript
import {
  EmailAlreadyExistsError,
  OrganizationSlugConflictError,
} from '@packmind/accounts';

try {
  await accounts.signUpWithOrganization({
    email: 'existing@example.com',
    password: 'securePassword123!!',
    method: 'password',
  });
} catch (error) {
  // EmailAlreadyExistsError: An account with this email address already exists
}

try {
  await accounts.createOrganization({ userId, name: 'Existing Organization' });
} catch (error) {
  // OrganizationSlugConflictError: name conflicts with an existing organization's slug
}
```

## Testing

The package includes comprehensive test coverage, run with Jest:

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
- `slug`: Organization slug generation
- `validator`: Input validation
- `typeorm`: Database ORM
- `@packmind/types`: Shared types and use case contracts
- `@packmind/node-utils`: `BaseHexa`, `HexaRegistry`, schema helpers and mail/cache services
- `@packmind/logger`: Structured logging

## Contributing

1. Follow the existing hexagonal architecture patterns
2. Write comprehensive tests for all new features
3. Update documentation for API changes
4. Follow the established coding conventions

## License

Private package for Packmind monorepo.
