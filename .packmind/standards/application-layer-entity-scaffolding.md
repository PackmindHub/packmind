# Application Layer Entity Scaffolding

**Summary:** Use consistent templates for UseCase, Service, and Repository creation to standardize dependency injection, logging, and interface implementation across the domain layer.

**Why now:** Analysis of 47 UseCase, 56 Service, and 29 Repository files reveals 100% pattern compliance; scaffolding can be automated.

## Evidence

- `packages/accounts/src/application/useCases/signInUser/SignInUserUseCase.ts:13-19`
- `packages/accounts/src/application/services/UserService.ts:31-40`
- `packages/accounts/src/infra/repositories/UserRepository.ts:11-22`

## Rules

### Create UseCase files implementing an interface with execute() method

**Rationale:** Uniform interface implementation allows predictable dependency graphs and testability across all use cases.

**Positive example:**
```typescript
// packages/accounts/src/application/useCases/signInUser/SignInUserUseCase.ts
export interface ISignInUserUseCase {
  execute(command: SignInUserCommand): Promise<SignInUserResponse>;
}

export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(
    private readonly userService: IUserService,
    private readonly logger: PackmindLogger = new PackmindLogger('SignInUserUseCase')
  ) {}

  async execute(command: SignInUserCommand): Promise<SignInUserResponse> {
    this.logger.info('Executing SignInUserUseCase', { email: command.email });
    // Implementation
  }
}
```

**Negative example:**
```typescript
// Extending AbstractUseCase — inconsistent with codebase pattern
export class SignInUserUseCase extends AbstractUseCase {
  execute() { /* ... */ }
}

// Using service locator — hides dependencies, harder to test
export class SignInUserUseCase implements ISignInUserUseCase {
  constructor(private readonly container: ServiceContainer) {}
}
```

### Inject dependencies via constructor with readonly modifiers

**Rationale:** Enables dependency substitution in tests and clear declaration of what each layer needs.

**Positive example:**
```typescript
constructor(
  private readonly userService: IUserService,
  private readonly logger: PackmindLogger = new PackmindLogger('SignInUserUseCase')
) {}
```

**Negative example:**
```typescript
// Hides dependencies behind a facade
constructor(private readonly services: ServiceContainer) {}

// Global state access — untestable
constructor() {
  this.userService = globalServiceLocator.get('UserService');
}
```

### Create Service files with repository and PackmindLogger injection; delegate CRUD to repository

**Rationale:** Separates domain logic from persistence, enables logging at application boundary.

**Positive example:**
```typescript
// packages/accounts/src/application/services/UserService.ts
export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: PackmindLogger = new PackmindLogger('UserService')
  ) {}

  async createUser(userData: CreateUserDTO): Promise<User> {
    this.logger.info('Creating user', { email: userData.email });
    const user = await this.userRepository.add(new User(userData));
    this.logger.info('User created', { userId: user.id });
    return user;
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
}
```

**Negative example:**
```typescript
// Service making raw database queries — violates separation of concerns
export class UserService {
  async createUser(userData: CreateUserDTO): Promise<User> {
    const user = await dataSource
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(userData)
      .execute();
    return user;
  }
}

// Service handling HTTP responses — not domain logic
export class UserService {
  async createUser(userData: CreateUserDTO): Promise<Response> {
    const user = new User(userData);
    return Response.json({ user }, { status: 201 });
  }
}
```

### Create Repository files extending AbstractRepository with domain-specific QueryBuilder queries

**Rationale:** AbstractRepository provides CRUD; repositories add specialized lookups, reducing duplication.

**Positive example:**
```typescript
// packages/accounts/src/infra/repositories/UserRepository.ts
export class UserRepository extends AbstractRepository<User> implements IUserRepository {
  constructor(
    repository: Repository<User> = localDataSource.getRepository<User>(UserSchema),
    logger: PackmindLogger = new PackmindLogger('UserRepository')
  ) {
    super(repository, UserSchema, logger);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findActiveUsers(): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }
}
```

**Negative example:**
```typescript
// Repository implements all CRUD from scratch — duplicates base class logic
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async add(user: User): Promise<User> {
    return this.repository.save(user);
  }
  // ... duplicates AbstractRepository methods
}
```
