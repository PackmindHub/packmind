# Refactoring PackmindGateway - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract HTTP client logic and move business orchestration from gateway to use cases.

**Architecture:** Create `PackmindHttpClient` for auth/HTTP, add atomic gateway methods, create `CreateStandardFromPlaybookUseCase` for orchestration.

**Tech Stack:** TypeScript, Jest, Node.js fetch API

---

## Task 1: Create PackmindHttpClient

**Files:**
- Create: `apps/cli/src/infra/http/PackmindHttpClient.ts`
- Create: `apps/cli/src/infra/http/PackmindHttpClient.spec.ts`

### Step 1: Write the failing test for getAuthContext

```typescript
// apps/cli/src/infra/http/PackmindHttpClient.spec.ts
import { PackmindHttpClient } from './PackmindHttpClient';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

describe('PackmindHttpClient', () => {
  const createTestApiKey = (orgId = 'org-123') => {
    const jwtPayload = { organization: { id: orgId, name: 'Test Org' } };
    const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString('base64');
    const jwt = `header.${jwtPayloadBase64}.signature`;
    return Buffer.from(JSON.stringify({
      host: 'https://api.packmind.com',
      jwt,
    })).toString('base64');
  };

  describe('getAuthContext', () => {
    it('returns host, jwt and organizationId for valid API key', () => {
      const client = new PackmindHttpClient(createTestApiKey('org-456'));

      const context = client.getAuthContext();

      expect(context.host).toBe('https://api.packmind.com');
      expect(context.organizationId).toBe('org-456');
      expect(context.jwt).toContain('header.');
    });

    describe('when API key is empty', () => {
      it('throws NotLoggedInError', () => {
        const client = new PackmindHttpClient('');

        expect(() => client.getAuthContext()).toThrow(NotLoggedInError);
      });
    });

    describe('when API key is invalid base64', () => {
      it('throws error', () => {
        const client = new PackmindHttpClient('not-valid-base64!@#');

        expect(() => client.getAuthContext()).toThrow('Invalid API key');
      });
    });

    describe('when JWT is missing organizationId', () => {
      it('throws error', () => {
        const jwtPayload = { user: 'test' };
        const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString('base64');
        const jwt = `header.${jwtPayloadBase64}.signature`;
        const apiKey = Buffer.from(JSON.stringify({
          host: 'https://api.packmind.com',
          jwt,
        })).toString('base64');
        const client = new PackmindHttpClient(apiKey);

        expect(() => client.getAuthContext()).toThrow('missing organizationId');
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindHttpClient.spec.ts"`
Expected: FAIL - module not found

### Step 3: Write minimal implementation for getAuthContext

```typescript
// apps/cli/src/infra/http/PackmindHttpClient.ts
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

interface ApiKeyPayload {
  host: string;
  jwt: string;
}

interface JwtPayload {
  organization?: { id?: string };
}

interface AuthContext {
  host: string;
  jwt: string;
  organizationId: string;
}

export class PackmindHttpClient {
  constructor(private readonly apiKey: string) {}

  getAuthContext(): AuthContext {
    if (!this.apiKey) {
      throw new NotLoggedInError();
    }

    let payload: ApiKeyPayload;
    try {
      const jsonString = Buffer.from(this.apiKey.trim(), 'base64').toString('utf-8');
      payload = JSON.parse(jsonString) as ApiKeyPayload;
    } catch {
      throw new Error('Invalid API key: failed to decode');
    }

    if (!payload.host || typeof payload.host !== 'string') {
      throw new Error('Invalid API key: missing or invalid host field');
    }

    if (!payload.jwt || typeof payload.jwt !== 'string') {
      throw new Error('Invalid API key: missing or invalid jwt field');
    }

    const jwtPayload = this.decodeJwt(payload.jwt);
    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid API key: missing organizationId in JWT');
    }

    return {
      host: payload.host,
      jwt: payload.jwt,
      organizationId: jwtPayload.organization.id,
    };
  }

  private decodeJwt(jwt: string): JwtPayload | null {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindHttpClient.spec.ts"`
Expected: PASS

### Step 5: Commit

```bash
git add apps/cli/src/infra/http/
git commit -m "feat(cli): add PackmindHttpClient with getAuthContext"
```

---

## Task 2: Add request method to PackmindHttpClient

**Files:**
- Modify: `apps/cli/src/infra/http/PackmindHttpClient.ts`
- Modify: `apps/cli/src/infra/http/PackmindHttpClient.spec.ts`

### Step 1: Write the failing tests for request method

Add to `PackmindHttpClient.spec.ts`:

```typescript
describe('request', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('makes GET request with auth headers', async () => {
    const client = new PackmindHttpClient(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    });

    const result = await client.request<{ data: string }>('/test-path');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.packmind.com/test-path',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer '),
        }),
      }),
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('makes POST request with body', async () => {
    const client = new PackmindHttpClient(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: '123' }),
    });

    await client.request('/create', {
      method: 'POST',
      body: { name: 'test' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.packmind.com/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    );
  });

  describe('when response is not ok', () => {
    it('throws error with message from response body', async () => {
      const client = new PackmindHttpClient(createTestApiKey());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Invalid data' }),
      });

      await expect(client.request('/test')).rejects.toThrow('Invalid data');
    });
  });

  describe('when network error occurs', () => {
    it('throws server not accessible error', async () => {
      const client = new PackmindHttpClient(createTestApiKey());
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      await expect(client.request('/test')).rejects.toThrow(
        'Packmind server is not accessible',
      );
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindHttpClient.spec.ts"`
Expected: FAIL - request method not defined

### Step 3: Write implementation for request method

Add to `PackmindHttpClient.ts`:

```typescript
interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export class PackmindHttpClient {
  // ... existing code ...

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { host } = this.getAuthContext();
    const { method = 'GET', body } = options;

    const url = `${host}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        let errorMsg = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // ignore
        }
        const error: Error & { statusCode?: number } = new Error(errorMsg);
        error.statusCode = response.status;
        throw error;
      }

      return response.json();
    } catch (error: unknown) {
      const err = error as {
        code?: string;
        name?: string;
        message?: string;
        cause?: { code?: string };
        statusCode?: number;
      };

      // Re-throw if already processed
      if (err.statusCode) throw error;

      const code = err?.code || err?.cause?.code;
      if (
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        err?.name === 'FetchError' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('Failed to fetch') ||
            err.message.includes('network') ||
            err.message.includes('NetworkError')))
      ) {
        throw new Error(
          `Packmind server is not accessible at ${host}. Please check your network connection or the server URL.`,
        );
      }

      throw new Error(`Request failed: ${err?.message || JSON.stringify(error)}`);
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindHttpClient.spec.ts"`
Expected: PASS

### Step 5: Commit

```bash
git add apps/cli/src/infra/http/
git commit -m "feat(cli): add request method to PackmindHttpClient"
```

---

## Task 3: Add atomic gateway methods to interface

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackmindGateway.ts`

### Step 1: Add new method signatures

Add to `IPackmindGateway.ts` interface:

```typescript
// Add these types before the interface
export type GetGlobalSpaceResult = {
  id: string;
  slug: string;
};

export type CreateStandardCommand = {
  name: string;
  description: string;
  scope: string;
  rules: Array<{ content: string }>;
};

export type CreateStandardResult = {
  id: string;
  name: string;
};

export type StandardRule = {
  id: string;
  content: string;
};

export type AddExampleCommand = {
  language: string;
  positive: string;
  negative: string;
};

// Add to IPackmindGateway interface
export interface IPackmindGateway {
  // ... existing methods ...

  getGlobalSpace(): Promise<GetGlobalSpaceResult>;
  createStandard(spaceId: string, data: CreateStandardCommand): Promise<CreateStandardResult>;
  getRulesForStandard(spaceId: string, standardId: string): Promise<StandardRule[]>;
  addExampleToRule(
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: AddExampleCommand,
  ): Promise<void>;
}
```

### Step 2: Run typecheck to verify interface change compiles

Run: `npm run withEnv "nx run packmind-cli:typecheck"`
Expected: FAIL - PackmindGateway doesn't implement new methods (this is expected)

### Step 3: Commit

```bash
git add apps/cli/src/domain/repositories/IPackmindGateway.ts
git commit -m "feat(cli): add atomic gateway method signatures to IPackmindGateway"
```

---

## Task 4: Implement atomic gateway methods

**Files:**
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.createStandard.spec.ts`

### Step 1: Write failing tests for getGlobalSpace

Add new describe block in `PackmindGateway.createStandard.spec.ts` (or create a new file):

```typescript
describe('PackmindGateway.getGlobalSpace', () => {
  // ... use same createTestApiKey helper ...

  it('returns space id and slug', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
    });

    const result = await gateway.getGlobalSpace();

    expect(result).toEqual({ id: 'space-uuid', slug: 'global' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/global'),
      expect.any(Object),
    );
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindGateway.createStandard.spec.ts"`
Expected: FAIL - getGlobalSpace not defined

### Step 3: Implement getGlobalSpace, createStandard, getRulesForStandard, addExampleToRule

Add to `PackmindGateway.ts`:

```typescript
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class PackmindGateway implements IPackmindGateway {
  private readonly httpClient: PackmindHttpClient;

  constructor(private readonly apiKey: string) {
    this.httpClient = new PackmindHttpClient(apiKey);
  }

  public getGlobalSpace = async (): Promise<GetGlobalSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GetGlobalSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };

  public createStandard = async (
    spaceId: string,
    data: CreateStandardCommand,
  ): Promise<CreateStandardResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateStandardResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards`,
      { method: 'POST', body: data },
    );
  };

  public getRulesForStandard = async (
    spaceId: string,
    standardId: string,
  ): Promise<StandardRule[]> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<StandardRule[]>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules`,
    );
  };

  public addExampleToRule = async (
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: AddExampleCommand,
  ): Promise<void> => {
    const { organizationId } = this.httpClient.getAuthContext();
    await this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`,
      {
        method: 'POST',
        body: {
          lang: example.language,
          positive: example.positive,
          negative: example.negative,
        },
      },
    );
  };

  // ... keep existing methods for now ...
}
```

### Step 4: Run tests

Run: `npm run withEnv "nx test packmind-cli --testFile=PackmindGateway"`
Expected: PASS

### Step 5: Commit

```bash
git add apps/cli/src/infra/repositories/PackmindGateway.ts apps/cli/src/infra/repositories/PackmindGateway.createStandard.spec.ts
git commit -m "feat(cli): implement atomic gateway methods"
```

---

## Task 5: Create CreateStandardFromPlaybookUseCase

**Files:**
- Create: `apps/cli/src/domain/useCases/ICreateStandardFromPlaybookUseCase.ts`
- Create: `apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.ts`
- Create: `apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.spec.ts`

### Step 1: Create interface

```typescript
// apps/cli/src/domain/useCases/ICreateStandardFromPlaybookUseCase.ts
export interface PlaybookInput {
  name: string;
  description: string;
  scope: string;
  rules: Array<{
    content: string;
    examples?: {
      positive: string;
      negative: string;
      language: string;
    };
  }>;
}

export interface CreateStandardResult {
  standardId: string;
  name: string;
}

export interface ICreateStandardFromPlaybookUseCase {
  execute(playbook: PlaybookInput): Promise<CreateStandardResult>;
}
```

### Step 2: Write failing test

```typescript
// apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.spec.ts
import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockGateway = {
      getGlobalSpace: jest.fn(),
      createStandard: jest.fn(),
      getRulesForStandard: jest.fn(),
      addExampleToRule: jest.fn(),
      // ... other methods as jest.fn()
    } as unknown as jest.Mocked<IPackmindGateway>;

    useCase = new CreateStandardFromPlaybookUseCase(mockGateway);
  });

  it('creates standard without examples', async () => {
    mockGateway.getGlobalSpace.mockResolvedValue({ id: 'space-1', slug: 'global' });
    mockGateway.createStandard.mockResolvedValue({ id: 'std-1', name: 'Test Standard' });
    mockGateway.getRulesForStandard.mockResolvedValue([]);

    const result = await useCase.execute({
      name: 'Test Standard',
      description: 'Desc',
      scope: 'test',
      rules: [{ content: 'Rule 1' }],
    });

    expect(result).toEqual({ standardId: 'std-1', name: 'Test Standard' });
    expect(mockGateway.getGlobalSpace).toHaveBeenCalled();
    expect(mockGateway.createStandard).toHaveBeenCalledWith('space-1', {
      name: 'Test Standard',
      description: 'Desc',
      scope: 'test',
      rules: [{ content: 'Rule 1' }],
    });
    expect(mockGateway.addExampleToRule).not.toHaveBeenCalled();
  });

  it('creates standard with examples', async () => {
    mockGateway.getGlobalSpace.mockResolvedValue({ id: 'space-1', slug: 'global' });
    mockGateway.createStandard.mockResolvedValue({ id: 'std-1', name: 'Test' });
    mockGateway.getRulesForStandard.mockResolvedValue([
      { id: 'rule-1', content: 'Rule 1' },
    ]);

    await useCase.execute({
      name: 'Test',
      description: 'Desc',
      scope: 'test',
      rules: [{
        content: 'Rule 1',
        examples: { positive: 'good', negative: 'bad', language: 'TYPESCRIPT' },
      }],
    });

    expect(mockGateway.addExampleToRule).toHaveBeenCalledWith(
      'space-1',
      'std-1',
      'rule-1',
      { positive: 'good', negative: 'bad', language: 'TYPESCRIPT' },
    );
  });

  it('succeeds even if example creation fails', async () => {
    mockGateway.getGlobalSpace.mockResolvedValue({ id: 'space-1', slug: 'global' });
    mockGateway.createStandard.mockResolvedValue({ id: 'std-1', name: 'Test' });
    mockGateway.getRulesForStandard.mockResolvedValue([{ id: 'rule-1', content: 'Rule 1' }]);
    mockGateway.addExampleToRule.mockRejectedValue(new Error('Failed'));

    const result = await useCase.execute({
      name: 'Test',
      description: 'Desc',
      scope: 'test',
      rules: [{
        content: 'Rule 1',
        examples: { positive: 'good', negative: 'bad', language: 'TYPESCRIPT' },
      }],
    });

    expect(result).toEqual({ standardId: 'std-1', name: 'Test' });
  });
});
```

### Step 3: Run test to verify it fails

Run: `npm run withEnv "nx test packmind-cli --testFile=CreateStandardFromPlaybookUseCase.spec.ts"`
Expected: FAIL - module not found

### Step 4: Write implementation

```typescript
// apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.ts
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  PlaybookInput,
  CreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export class CreateStandardFromPlaybookUseCase
  implements ICreateStandardFromPlaybookUseCase
{
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(playbook: PlaybookInput): Promise<CreateStandardResult> {
    const space = await this.gateway.getGlobalSpace();

    const standard = await this.gateway.createStandard(space.id, {
      name: playbook.name,
      description: playbook.description,
      scope: playbook.scope,
      rules: playbook.rules.map((r) => ({ content: r.content })),
    });

    const rulesWithExamples = playbook.rules.filter((r) => r.examples);

    if (rulesWithExamples.length > 0) {
      const createdRules = await this.gateway.getRulesForStandard(
        space.id,
        standard.id,
      );

      for (let i = 0; i < playbook.rules.length; i++) {
        const rule = playbook.rules[i];
        if (rule.examples && createdRules[i]) {
          try {
            await this.gateway.addExampleToRule(
              space.id,
              standard.id,
              createdRules[i].id,
              rule.examples,
            );
          } catch {
            // Example creation failure doesn't fail the whole operation
          }
        }
      }
    }

    return { standardId: standard.id, name: standard.name };
  }
}
```

### Step 5: Run tests

Run: `npm run withEnv "nx test packmind-cli --testFile=CreateStandardFromPlaybookUseCase.spec.ts"`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/domain/useCases/ICreateStandardFromPlaybookUseCase.ts apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.ts apps/cli/src/app/useCases/CreateStandardFromPlaybookUseCase.spec.ts
git commit -m "feat(cli): add CreateStandardFromPlaybookUseCase"
```

---

## Task 6: Update createStandardHandler to use the new use case

**Files:**
- Modify: `apps/cli/src/infra/commands/createStandardHandler.ts`
- Modify: `apps/cli/src/infra/commands/createStandardHandler.spec.ts`

### Step 1: Update handler to accept use case instead of gateway

```typescript
// apps/cli/src/infra/commands/createStandardHandler.ts
import { readPlaybookFile } from '../utils/readPlaybookFile';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export interface CreateStandardResult {
  success: boolean;
  standardId?: string;
  standardName?: string;
  error?: string;
}

export async function createStandardHandler(
  filePath: string,
  useCase: ICreateStandardFromPlaybookUseCase,
): Promise<CreateStandardResult> {
  const readResult = await readPlaybookFile(filePath);

  if (!readResult.isValid) {
    return {
      success: false,
      error: `Validation failed: ${readResult.errors?.join(', ')}`,
    };
  }

  if (!readResult.data) {
    return {
      success: false,
      error: 'Failed to read playbook data',
    };
  }

  try {
    const result = await useCase.execute(readResult.data);

    return {
      success: true,
      standardId: result.standardId,
      standardName: result.name,
    };
  } catch (e) {
    return {
      success: false,
      error: `Error creating standard: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}
```

### Step 2: Update tests

Update `createStandardHandler.spec.ts` to mock the use case instead of the gateway.

### Step 3: Run tests

Run: `npm run withEnv "nx test packmind-cli --testFile=createStandardHandler.spec.ts"`
Expected: PASS

### Step 4: Update callers

Find and update any places that call `createStandardHandler` to pass the use case.

### Step 5: Commit

```bash
git add apps/cli/src/infra/commands/createStandardHandler.ts apps/cli/src/infra/commands/createStandardHandler.spec.ts
git commit -m "refactor(cli): update createStandardHandler to use CreateStandardFromPlaybookUseCase"
```

---

## Task 7: Remove createStandardFromPlaybook from gateway

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackmindGateway.ts`
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`
- Delete or update: `apps/cli/src/infra/repositories/PackmindGateway.createStandard.spec.ts`

### Step 1: Remove method from interface

Remove `createStandardFromPlaybook` from `IPackmindGateway` interface.

### Step 2: Remove implementation from gateway

Remove the entire `createStandardFromPlaybook` method from `PackmindGateway.ts`.

### Step 3: Update/remove tests

Update `PackmindGateway.createStandard.spec.ts` to test the atomic methods instead.

### Step 4: Run all tests

Run: `npm run quality-gate`
Expected: PASS

### Step 5: Commit

```bash
git add -A
git commit -m "refactor(cli): remove createStandardFromPlaybook from gateway"
```

---

## Out of Scope (Future Tasks)

- Refactor existing gateway methods to use `PackmindHttpClient` (reduces ~1000 lines of duplication)
- Extract `UploadSkillUseCase` from gateway
- Add integration tests for the new use case
