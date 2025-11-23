# API Organization-Scoping Migration Recipe

## Context

This recipe documents how to migrate API controllers from root-level routes to organization-scoped routes under `/organizations/:orgId/*`.

**Why?** Previously, the API used JWT cookies to extract the organization ID. The new pattern uses organization ID from the URL, providing:
- More RESTful API design
- Clearer security boundaries
- Explicit organization context in URLs
- Better alignment with multi-tenant architecture

## Before You Start

### Identify if Migration is Needed

A controller should be migrated if:
- ✅ It manages resources that BELONG to an organization (users, targets, deployments, etc.)
- ✅ It currently uses `request.organization.id` from JWT
- ✅ It uses `authService.makePackmindCommand()` helper

A controller should NOT be migrated if:
- ❌ It's infrastructure/account-level (auth, organization CRUD, health checks)
- ❌ It's a public endpoint
- ❌ It manages cross-organization resources

### Check for Duplicates

Before migrating, check if an organization-scoped version already exists:
- Look in `apps/api/src/app/organizations/` directory
- If duplicate exists, plan to deprecate the old one instead of migrating

## Migration Steps

### Step 1: Create New Module Structure

Create the new module under the organizations directory:

```bash
# Example for users controller
apps/api/src/app/organizations/users/
├── users.module.ts
└── users.controller.ts
```

**Module Template:**
```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AccountsModule } from '@packmind/accounts';

@Module({
  imports: [AccountsModule],
  controllers: [UsersController],
})
export class OrganizationsUsersModule {}
```

### Step 2: Register Module in BOTH Places (CRITICAL!)

**⚠️ IMPORTANT**: The module must be registered in TWO places for NestJS to work correctly:

#### 2.1: Add to OrganizationsModule imports

In `apps/api/src/app/organizations/organizations.module.ts`:

```typescript
import { OrganizationsUsersModule } from './users/users.module';

@Module({
  imports: [
    OrganizationsSpacesModule,
    OrganizationsUsersModule,  // ← MUST import here!
  ],
  // ...
})
export class OrganizationsModule {}
```

**Why?** NestJS requires parent modules to import child modules for proper dependency injection and module registration. Without this, routes will return 404!

#### 2.2: Add to RouterModule configuration

In `apps/api/src/app/app.module.ts`:

```typescript
RouterModule.register([
  {
    path: 'organizations/:orgId',
    module: OrganizationsModule,
    children: [
      {
        path: 'users',
        module: OrganizationsUsersModule,  // ← Add route mapping here
      },
      // ... other children
    ],
  },
])
```

### Step 3: Migrate Controller

#### Add Organization Access Guard

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

@Controller()
@UseGuards(OrganizationAccessGuard)  // ← Add this guard
export class UsersController {
  // ...
}
```

#### Update Route Handlers - CRITICAL PATTERN

**❌ OLD Pattern (Reading from JWT):**
```typescript
@Get('organization')
async getUsers(@Req() request: AuthenticatedRequest) {
  const organizationId = request.organization.id;  // ❌ FROM JWT
  const userId = request.user.userId;
  
  return await this.usersService.getUsers(organizationId, userId);
}
```

**✅ NEW Pattern (Controller creates command, service passes to adapter):**
```typescript
@Get()  // Route is now just '/' since it's under /organizations/:orgId/users
async getUsers(
  @Param('orgId') organizationId: OrganizationId,  // ✅ FROM URL PARAM
  @Req() request: AuthenticatedRequest,
) {
  // Controller creates the full command object
  const command: ListOrganizationUsersCommand = {
    userId: request.user.userId,  // From JWT - user identity
    organizationId,                // From URL param
  };
  
  // Service just passes it to the adapter
  return await this.usersService.getOrganizationUsers(command);
}
```

**Service Implementation:**
```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(ACCOUNTS_ADAPTER_TOKEN)
    private readonly accountsAdapter: IAccountsPort,
  ) {}

  async getOrganizationUsers(
    command: ListOrganizationUsersCommand,
  ): Promise<ListOrganizationUsersResponse> {
    // Service just passes the command to the adapter - no transformation
    return this.accountsAdapter.listOrganizationUsers(command);
  }
}
```

**Key Points:**
- ✅ **DO** read `organizationId` from `@Param('orgId')` in controller
- ✅ **DO** read `userId` from `request.user.userId` (user identity still from JWT)
- ✅ **DO** create the full command object in the controller
- ✅ **DO** have the service accept the command and pass it directly to the adapter
- ❌ **DON'T** use `request.organization.id` (that's the old JWT pattern)
- ❌ **DON'T** use `authService.makePackmindCommand()` helper
- ❌ **DON'T** pass individual parameters to the service - pass the command object

#### Update Route Paths

Routes should be simplified since they're now nested under `/organizations/:orgId`:

```typescript
// OLD: @Get('organization')  at /users
// NEW: @Get()                at /organizations/:orgId/users

// OLD: @Get('statuses')      at /users
// NEW: @Get('statuses')      at /organizations/:orgId/users

// OLD: @Patch(':id/role')    at /users
// NEW: @Patch(':userId/role') at /organizations/:orgId/users
```

### Step 4: Update Frontend Gateway

**CRITICAL:** Routes under `/organizations/:orgId/*` must use `NewGateway<>` pattern!

#### Update Gateway Interface

In `apps/frontend/src/domain/<domain>/api/gateways/I*Gateway.ts`:

**❌ OLD (using Gateway<>):**
```typescript
import { Gateway, IListOrganizationUsersUseCase } from '@packmind/types';

export interface IUserGateway {
  getUsersInMyOrganization: Gateway<IListOrganizationUsersUseCase>;
}
```

**✅ NEW (using NewGateway<>):**
```typescript
import { NewGateway, IListOrganizationUsersUseCase } from '@packmind/types';

export interface IUserGateway {
  getUsersInMyOrganization: NewGateway<IListOrganizationUsersUseCase>;
}
```

**Why NewGateway?**
- `Gateway<>` uses `PackmindCommandBody<>` which **omits both** `userId` and `organizationId`
- `NewGateway<>` uses `NewPackmindCommandBody<>` which **only omits** `userId` (keeps `organizationId`)
- Organization-scoped routes NEED `organizationId` in the params to construct the URL

#### Update Gateway Implementation

In `apps/frontend/src/domain/<domain>/api/gateways/*GatewayApi.ts`:

**❌ OLD:**
```typescript
async getUsersInMyOrganization(): Promise<ListOrganizationUsersResponse> {
  return this._api.get('/users/organization');
}
```

**✅ NEW:**
```typescript
import { NewGateway, NewPackmindCommandBody } from '@packmind/types';

getUsersInMyOrganization: NewGateway<IListOrganizationUsersUseCase> = async ({
  organizationId,
}: NewPackmindCommandBody<ListOrganizationUsersCommand>) => {
  return this._api.get<ListOrganizationUsersResponse>(
    `${this._endpoint}/${organizationId}/users`,
  );
};
```

**Key Points:**
- Use arrow function syntax (property assignment, not method)
- Destructure params from `NewPackmindCommandBody<>`
- `organizationId` is now available in params (not omitted like with `PackmindCommandBody`)
- Use it to construct the URL path

### Step 5: Update Frontend Query Hooks

Update hooks in `apps/frontend/src/domain/<domain>/api/queries/`:

**✅ RECOMMENDED Pattern (get organizationId from auth context):**
```typescript
import { useAuthContext } from '../../hooks/useAuthContext';

export const useGetUsersQuery = () => {
  const { organization } = useAuthContext();
  
  return useQuery({
    queryKey: ['organizations', organization?.id, 'users'],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch users');
      }
      return userGateway.getUsersInMyOrganization({
        organizationId: organization.id,
      });
    },
    enabled: !!organization?.id,  // Don't run query if no organization
  });
};
```

**Key Points:**
- Get `organizationId` from `useAuthContext()` instead of accepting it as a parameter
- Use `organization?.id` in `queryKey` for cache invalidation
- Add early `if (!organization?.id)` check in `queryFn` to satisfy TypeScript - the `enabled` flag prevents this from executing, but TypeScript doesn't know that
- After the null check, you can safely use `organization.id` (no `!` or `?`)
- Add `enabled: !!organization?.id` to prevent execution when organization is undefined

### Step 6: Update Components

Ensure components have access to `orgId` from route params:
**IMPORTANT:** Components should NOT need to change if you've updated query hooks and mutations correctly!

**✅ CORRECT - No changes needed in components:**
```typescript
import { useParams } from '@react-router/react';
function UsersPage() {
  // Query hooks get organizationId from useAuthContext() internally
  const { data: users } = useGetUsersQuery();
  const { mutate: changeRole } = useChangeUserRoleMutation();
  
  const handleChangeRole = (userId: UserId, newRole: UserOrganizationRole) => {
    // Mutation also gets organizationId internally
    changeRole({ targetUserId: userId, newRole });
  };
  
  // ...
}
```

**❌ WRONG - Don't add useAuthContext() to components:**
```typescript
function UsersPage() {
  const { orgId } = useParams();
  const { data: users } = useGetUsersQuery(orgId);
  const { organization } = useAuthContext();  // ❌ Unnecessary!
  
  // Don't pass organizationId to hooks - they get it internally
  const { data: users } = useGetUsersQuery();  // ✅ Correct
  
  // ...
}
```

### Step 7: Run Quality Gate & Test
**Key Points:**
- ✅ **DO** let query hooks and mutations handle `organizationId` internally using `useAuthContext()`
- ✅ **DO** keep components simple - they shouldn't need to know about organizationId
- ✅ **DO** use `useAuthContext()` in components if they need `organizationId` for other purposes (e.g., building URLs, conditional rendering)
- ❌ **DON'T** add `useAuthContext()` to components ONLY to pass `organizationId` to hooks
- ❌ **DON'T** pass `organizationId` as a parameter to hooks that get it from context internally

### Step 7: Check CLI Gateway (if applicable)

If the endpoints you migrated are used by the CLI, update the CLI gateway:

**Check if CLI uses these endpoints:**
```bash
grep -r "api/v0/your-endpoint" apps/cli/src/infra/repositories/PackmindGateway.ts
```

**Update CLI routes to organization-scoped:**

In `apps/cli/src/infra/repositories/PackmindGateway.ts`:

**❌ OLD:**
```typescript
const url = `${host}/api/v0/users`;
```

**✅ NEW:**
```typescript
// Extract organizationId from JWT (already available in most CLI methods)
const jwtPayload = decodeJwt(jwt);
if (!jwtPayload?.organization?.id) {
  throw new Error('Invalid JWT: missing organizationId');
}
const organizationId = jwtPayload.organization.id;

const url = `${host}/api/v0/organizations/${organizationId}/users`;
```

**Key Points:**
- The CLI uses API keys that contain a JWT with organization info
- Decode the JWT to extract `organizationId` 
- Use the same organization-scoped URL pattern as frontend
- Most CLI methods already have this pattern - follow the existing examples

### Step 8: Run Quality Gate & Test

```bash
npm run quality-gate
```

Fix any issues found:
- Type errors
- Linting issues
- Test failures

### Step 8: Commit
### Step 9: Commit

Follow the commit guidelines from CLAUDE.md:
- Run quality gate before committing
- Ask for validation before committing
- Reference GitHub issue if applicable
- Use conventional commit format

```bash
git add .
git commit -m "✨ Add organization-scoped users controller"
```

### Step 9: Remove Old Controller
### Step 10: Remove Old Controller

After frontend is updated and tested:

1. Delete old controller file
2. Delete old module file
3. Remove module registration from app.module.ts
4. Run quality gate
5. Commit: `🔥 Remove legacy /users controller`

## Common Issues & Solutions

### Issue 1: Routes returning 404 after migration ⚠️ MOST COMMON

**Problem:** New routes return 404 even though module is registered in RouterModule

**Cause:** Module not imported by parent `OrganizationsModule`

**Solution:** Add the new module to BOTH places:
1. Import in `apps/api/src/app/organizations/organizations.module.ts`
2. Register in RouterModule in `apps/api/src/app/app.module.ts`

```typescript
// In OrganizationsModule
@Module({
  imports: [
    OrganizationsSpacesModule,
    OrganizationsUsersModule,  // ← MUST be here!
  ],
})
```

**Restart the API server after adding the import!**

### Issue 2: Tests failing after migration

**Problem:** Tests still expect old routes

**Solution:** Update test requests to use new routes:
```typescript
// OLD
const response = await request(app.getHttpServer())
  .get('/users/organization');

// NEW
const response = await request(app.getHttpServer())
  .get('/organizations/org-123/users');
```

### Issue 3: Frontend tests failing

**Problem:** Frontend gateway tests not passing organizationId parameter

**Solution:** Update test calls to match new signature:
```typescript
// OLD
await gateway.getUsersInMyOrganization();

// NEW
const organizationId = createOrganizationId('org-123');
await gateway.getUsersInMyOrganization({ organizationId });
```

### Issue 4: Frontend can't access orgId

**Problem:** Components don't have access to organization ID

**Solution:** Use React Router params or organization context:
```typescript
const { orgId } = useParams();
// OR
const { organization } = useAuthContext();
const orgId = organization?.id;
```

### Issue 5: Guard blocking requests

**Problem:** `OrganizationAccessGuard` throwing 403 errors

**Solution:** Verify:
- User's JWT contains organization info
- `orgId` in URL matches user's organization from JWT
- Guard is properly imported and applied

### Issue 6: TypeScript errors with organizationId parameter

**Problem:** Type errors when passing organizationId (string vs OrganizationId)

**Solution:** Use the branded type helper:
```typescript
import { createOrganizationId } from '@packmind/types';

const orgId = createOrganizationId(organization.id);
```

### Issue 7: TypeScript error "organization is possibly undefined" in query hooks

**Problem:** TypeScript complains that `organization` is possibly undefined in queryFn even though you have `enabled: !!organization?.id`

**Example Error:**
```
error TS18048: 'organization' is possibly 'undefined'.
  organizationId: organization.id,
                  ~~~~~~~~~~~~
```

**Solution:** Add an early null check in the queryFn - TypeScript doesn't understand that the `enabled` flag prevents execution:
```typescript
queryFn: () => {
  if (!organization?.id) {
    throw new Error('Organization ID is required to fetch users');
  }
  return userGateway.getUsersInMyOrganization({
    organizationId: organization.id,  // ✅ Safe after null check
  });
},
enabled: !!organization?.id,  // Prevents execution at runtime
```

## Migration Checklist

Use this checklist when migrating a controller:

- [ ] Identified controller needs migration (uses org context)
- [ ] Checked for existing org-scoped duplicate
- [ ] Created new module structure under `/organizations/`
- [ ] **⚠️ CRITICAL:** Imported module in `OrganizationsModule.imports` array
- [ ] Registered module in RouterModule in `app.module.ts`
- [ ] Added `@UseGuards(OrganizationAccessGuard)`
- [ ] Updated all route handlers to use `@Param('orgId')`
- [ ] Removed usage of `request.organization.id`
- [ ] Removed usage of `authService.makePackmindCommand()`
- [ ] Updated route paths (simplified for nested routes)
- [ ] Updated frontend gateway methods
- [ ] Updated frontend query hooks
- [ ] Updated components to pass orgId
- [ ] Ran quality gate and fixed issues
- [ ] Tested endpoints manually
- [ ] Committed changes
- [ ] Removed old controller
- [ ] Verified no references to old routes remain

## Examples

See the users controller migration as a reference example:
- Backend: `apps/api/src/app/organizations/users/users.controller.ts`
- Frontend Gateway: `apps/frontend/src/domain/accounts/api/gateways/UserGatewayApi.ts`
- Frontend Hooks: `apps/frontend/src/domain/accounts/api/queries/UserQueries.ts`

## Controllers That Need Migration

Based on audit (as of 2025-11-22):

**High Priority (Duplicates):**
- [ ] `/recipes` - DUPLICATE, prefer space-scoped version
- [ ] `/standards` - DUPLICATE, prefer space-scoped version
- [ ] `/standards/:standardId/rules` - INCOMPLETE duplicate

**Medium Priority:**
- [x] `/users` - Migrated
- [ ] `/targets`
- [ ] `/git/providers`
- [ ] `/git/repositories`
- [ ] `/deployments`

**Correctly Placed (No migration needed):**
- [x] `/auth` - Account-level
- [x] `/organizations` - Organization CRUD
- [x] `/mcp`, `/sse`, `/healthcheck` - Infrastructure
- [x] `/:orgId/hooks` - Already org-scoped (special case)
