# Create a new UseCase following application layer pattern

**Summary:** Scaffold a new domain UseCase with proper IInterface implementation, constructor injection, execute() method, and test factory integration.

**Why now:** Analysis of 47 UseCase files reveals universal pattern; automating reduces boilerplate and ensures consistency.

## Evidence

- `packages/accounts/src/application/useCases/signInUser/SignInUserUseCase.ts:13-30`
- `packages/accounts/src/application/useCases/ResetPasswordUseCase.ts:19-35`

## Context Validation Checkpoints

- Is this UseCase handling a distinct business operation (not splitting existing UseCase)?
- Will this UseCase have 1-3 injected dependencies (Service, Repository, Logger)?
- Does the domain package (accounts, recipes, standards, etc.) already exist?

## Steps

### Create UseCase file in application/useCases/{FeatureName}/

Create file `{Domain}/src/application/useCases/{featureName}/{FeatureNameUseCase}.ts` containing interface `IFeatureNameUseCase` and class `FeatureNameUseCase`.

```typescript
import { PackmindLogger } from '@packmind/logger';
import { FeatureNameCommand } from './FeatureNameCommand';
import { FeatureNameResponse } from './FeatureNameResponse';
import { IFeatureService } from '../services/IFeatureService';

const origin = 'FeatureNameUseCase';

export interface IFeatureNameUseCase {
  execute(command: FeatureNameCommand): Promise<FeatureNameResponse>;
}

export class FeatureNameUseCase implements IFeatureNameUseCase {
  constructor(
    private readonly service: IFeatureService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin)
  ) {}

  async execute(command: FeatureNameCommand): Promise<FeatureNameResponse> {
    this.logger.info('Executing FeatureNameUseCase', { command });

    // Call service methods
    const result = await this.service.performOperation(command);

    this.logger.info('FeatureNameUseCase executed successfully', { result });
    return { success: true, data: result };
  }
}
```

### Create Command & Response DTOs

Create `{Domain}/src/application/useCases/{featureName}/FeatureNameCommand.ts` and `FeatureNameResponse.ts` with typed properties.

```typescript
// FeatureNameCommand.ts
export type FeatureNameCommand = {
  id: string;
  // other properties relevant to the operation
};

// FeatureNameResponse.ts
export type FeatureNameResponse = {
  success: boolean;
  data?: any;
  error?: string;
};
```

### Create factory and spec file

Create test factory in `{Domain}/test/{featureName}UseCase.factory.ts` and `{Domain}/src/application/useCases/{featureName}/{FeatureNameUseCase}.spec.ts`.

**Factory:**
```typescript
// packages/domain/test/featureNameUseCaseFactory.ts
import { Factory } from '@packmind/test-utils';
import { v4 as uuid } from 'uuid';
import { FeatureNameCommand } from '../src/application/useCases/featureName/FeatureNameCommand';

export const featureNameCommandFactory: Factory<FeatureNameCommand> = (cmd?: Partial<FeatureNameCommand>) => ({
  id: uuid(),
  ...cmd,
});
```

**Spec:**
```typescript
// packages/domain/src/application/useCases/featureName/FeatureNameUseCase.spec.ts
import { FeatureNameUseCase, IFeatureNameUseCase } from './FeatureNameUseCase';
import { IFeatureService } from '../services/IFeatureService';
import { featureNameCommandFactory } from '../../../test/featureNameUseCaseFactory';
import { PackmindLogger } from '@packmind/logger';

describe('FeatureNameUseCase', () => {
  let useCase: IFeatureNameUseCase;
  let serviceMock: jest.Mocked<IFeatureService>;
  let loggerMock: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    serviceMock = {
      performOperation: jest.fn(),
    } as jest.Mocked<IFeatureService>;

    loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as jest.Mocked<PackmindLogger>;

    useCase = new FeatureNameUseCase(serviceMock, loggerMock);
  });

  describe('when executing a feature operation', () => {
    it('returns success response', async () => {
      const command = featureNameCommandFactory();
      serviceMock.performOperation.mockResolvedValue({ result: 'success' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(serviceMock.performOperation).toHaveBeenCalledWith(command);
    });

    it('logs operation execution', async () => {
      const command = featureNameCommandFactory();
      serviceMock.performOperation.mockResolvedValue({ result: 'success' });

      await useCase.execute(command);

      expect(loggerMock.info).toHaveBeenCalledWith(
        'Executing FeatureNameUseCase',
        expect.any(Object)
      );
    });
  });
});
```

### Wire into module exports

Add UseCase to `{Domain}/src/application/useCases/index.ts` and wire into NestJS module or dependency container.

```typescript
// packages/domain/src/application/useCases/index.ts
export * from './featureName/FeatureNameUseCase';
export * from './featureName/FeatureNameCommand';
export * from './featureName/FeatureNameResponse';

// In your module (NestJS example):
// packages/domain/src/infrastructure/module.ts
import { FeatureNameUseCase } from '../application/useCases';

@Module({
  providers: [
    {
      provide: 'IFeatureNameUseCase',
      useClass: FeatureNameUseCase,
    },
  ],
  exports: ['IFeatureNameUseCase'],
})
export class FeatureModule {}
```
