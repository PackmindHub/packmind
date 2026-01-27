# Frontend Gateway Pattern

Gateways provide a clean abstraction layer for API communication in the frontend application. They separate the interface contract from the HTTP implementation, enabling testability and consistent data fetching patterns across domains.

**Key References:**
- `apps/frontend/src/domain/accounts/api/gateways/ITrialGateway.ts` - Interface example
- `apps/frontend/src/domain/accounts/api/gateways/TrialGatewayApi.ts` - Implementation example
- `apps/frontend/src/shared/PackmindGateway.ts` - Base class

## Rules

### Name gateway interface files with `I` prefix following pattern `I{Domain}Gateway.ts`

#### Positive Example
```typescript
// File: ITrialGateway.ts
export interface ITrialGateway {
  startTrial: PublicGateway<IStartTrial>;
}
```

#### Negative Example
```typescript
// File: TrialGateway.ts (missing I prefix)
export interface TrialGateway {
  startTrial: PublicGateway<IStartTrial>;
}
```

### Name gateway implementation files following pattern `{Domain}GatewayApi.ts`

#### Positive Example
```typescript
// File: TrialGatewayApi.ts
export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  // ...
}
```

#### Negative Example
```typescript
// File: TrialGateway.ts (missing Api suffix)
export class TrialGateway extends PackmindGateway implements ITrialGateway {
  // ...
}
```

### Use `Gateway<IUseCase>` type helper for authenticated operations or `PublicGateway<IUseCase>` for public operations when the method corresponds to a backend use case

#### Positive Example
```typescript
import { PublicGateway, IStartTrial, Gateway, IGetUser } from '@packmind/types';

export interface ITrialGateway {
  startTrial: PublicGateway<IStartTrial>;
}

export interface IUserGateway {
  getUser: Gateway<IGetUser>;
}
```

#### Negative Example
```typescript
export interface ITrialGateway {
  startTrial: (command: StartTrialCommand) => Promise<StartTrialResult>;
}
```

### Import Command and Response types from `@packmind/types` when they are defined in use case contracts

#### Positive Example
```typescript
import { StartTrialCommand, StartTrialResult } from '@packmind/types';

startTrial = async (params: StartTrialCommand): Promise<StartTrialResult> => {
  return this._api.get<StartTrialResult>(`${this._endpoint}?agent=${params.agent}`);
};
```

#### Negative Example
```typescript
// Duplicating types that already exist in @packmind/types
interface StartTrialCommand {
  agent: string;
}

interface StartTrialResult {
  token: string;
}
```

### Define Command and Response types locally in the interface file only for gateway-specific operations not backed by a use case

#### Positive Example
```typescript
// In ITrialGateway.ts - gateway-specific operation
export interface GetActivationTokenCommand {
  mcpToken: string;
}

export interface GetActivationTokenResponse {
  activationUrl: string;
}

export interface ITrialGateway {
  getActivationToken: (command: GetActivationTokenCommand) => Promise<GetActivationTokenResponse>;
}
```

#### Negative Example
```typescript
// Defining types locally when they exist in @packmind/types
export interface StartTrialCommand {
  agent: string;
}
```

### Extend `PackmindGateway` base class in implementation and call `super('/endpoint-base')` in constructor

#### Positive Example
```typescript
import { PackmindGateway } from '../../../../shared/PackmindGateway';

export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  constructor() {
    super('/quick-start');
  }
}
```

#### Negative Example
```typescript
export class TrialGatewayApi implements ITrialGateway {
  private endpoint = '/quick-start';
  private api = new AxiosClient();
}
```

### Implement the gateway interface explicitly using `implements I{Domain}Gateway`

#### Positive Example
```typescript
export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  // TypeScript enforces interface contract
}
```

#### Negative Example
```typescript
export class TrialGatewayApi extends PackmindGateway {
  // No interface contract enforcement
}
```

### Define methods as arrow function properties instead of regular class methods

#### Positive Example
```typescript
export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  startTrial = async (params: StartTrialCommand): Promise<StartTrialResult> => {
    return this._api.get<StartTrialResult>(`${this._endpoint}?agent=${params.agent}`);
  };

  getActivationToken = async (command: GetActivationTokenCommand): Promise<GetActivationTokenResponse> => {
    return this._api.post<GetActivationTokenResponse>(`${this._endpoint}/get-activation-token`, command);
  };
}
```

#### Negative Example
```typescript
export class AuthGatewayApi extends PackmindGateway implements IAuthGateway {
  async signIn(request: SignInUserCommand): Promise<SignInUserResponse> {
    return this._api.post<SignInUserResponse>(`${this._endpoint}/signin`, request);
  }

  async signOut(): Promise<SignOutResponse> {
    return this._api.post<SignOutResponse>(`${this._endpoint}/signout`, {});
  }
}
```

### Return typed API calls using `this._api.get<ResponseType>()` or `this._api.post<ResponseType>()`

#### Positive Example
```typescript
startTrial = async (params: StartTrialCommand): Promise<StartTrialResult> => {
  return this._api.get<StartTrialResult>(`${this._endpoint}?agent=${params.agent}`);
};

getActivationToken = async (command: GetActivationTokenCommand): Promise<GetActivationTokenResponse> => {
  return this._api.post<GetActivationTokenResponse>(`${this._endpoint}/get-activation-token`, command);
};
```

#### Negative Example
```typescript
startTrial = async (params: StartTrialCommand) => {
  return this._api.get(`${this._endpoint}?agent=${params.agent}`);
};
```
