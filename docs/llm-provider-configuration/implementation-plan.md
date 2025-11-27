# LLM Provider Configuration Feature - Implementation Plan

**GitHub Issue**: #11

## Overview

Implement an LLM Provider Configuration feature allowing organization admins to configure custom LLM providers (OpenAI, Anthropic, Gemini, Azure OpenAI, OpenAI-compatible) with encrypted API key storage in Redis cache.

## Requirements Summary

| Requirement | Implementation Decision |
|-------------|------------------------|
| Admin-only access | Use `AbstractAdminUseCase` pattern |
| One config per organization | Redis cache key: `llm-config:{organizationId}` |
| Test before saving | Use existing `test-connection` endpoint |
| Connection status display | Test on page load with loader |
| Config replacement | Require confirmation dialog |
| API key encryption | Encrypt in Redis using `EncryptionService` |
| Cache TTL | 24 hours (86400 seconds) |

---

## Phase 1: Frontend (using existing test-connection endpoint)

### Sub-Task 1: Create Frontend Route [DONE]

**Commit**: `feat(frontend): add LLM settings route and navigation #11`

#### Files Created

**`apps/frontend/app/routes/org.$orgSlug._protected.settings.llm._index.tsx`**
- Route module rendering `LLMConfigurationPage`
- Uses `useAuthContext` to get organization context

#### Files Modified

**`apps/frontend/app/routes/org.$orgSlug._protected.settings.tsx`**
- Added sidebar navigation link "AI Provider" under Distribution section

**`apps/frontend/src/shared/utils/routes.ts`**
- Added `toSettingsLLM: (orgSlug: string) => \`/org/${orgSlug}/settings/llm\``

---

### Sub-Task 2: Create Frontend Components [DONE]

**Commit**: `feat(frontend): implement LLM configuration components #11`

#### Files Created

**`apps/frontend/src/domain/llm/components/LLMConfigurationPage.tsx`**
- Main page component orchestrating status and form
- Uses `PMPage` layout

**`apps/frontend/src/domain/llm/components/LLMConfigurationStatus.tsx`**
- PMAlert showing connection status (loading, connected, failed, not_configured)
- PMSpinner during status check
- Provider name, model, status display
- Error message display for failures

**`apps/frontend/src/domain/llm/components/LLMConfigurationForm.tsx`**
- Provider dropdown (`PMNativeSelect`) using `getConfigurableProviders(deploymentEnv)`
- **Dynamic form fields** from `LLM_PROVIDER_METADATA[provider].fields` - no switch/case needed
- **Dynamic config building** - config is built from metadata fields, not hardcoded per provider
- PMField with PMInput (type="text" or type="password" for secrets)
- Test Connection button - functional using existing endpoint
- Save button - disabled with tooltip until backend ready
- Form validation for required fields
- **User-friendly error messages** - `extractReadableErrorMessage()` parses verbose API errors

**`apps/frontend/src/domain/llm/components/index.ts`**
- Export barrel file

#### Test Files Created

**`apps/frontend/src/domain/llm/components/LLMConfigurationForm.spec.tsx`**
- Provider selection changes form fields
- Required field validation
- Test connection triggers callback
- Verbose JSON errors are extracted to readable messages

**`apps/frontend/src/domain/llm/components/LLMConfigurationStatus.spec.tsx`**
- Loader display during loading state
- Status rendering for each state
- Error message display

#### Implementation Notes

- **No switch/case for providers**: The `buildConfig()` function dynamically builds configuration from `LLM_PROVIDER_METADATA` fields, making it easy to add new providers without frontend code changes
- **Error message extraction**: Added `extractReadableErrorMessage()` helper that parses JSON error responses and extracts user-friendly messages (e.g., "API key not valid" instead of full JSON)

---

### Sub-Task 3: Create Frontend API Layer [DONE]

**Commit**: `feat(frontend): add LLM configuration API gateway and queries #11`

*Note: This was implemented as part of Sub-Task 2*

#### Files Created

**`apps/frontend/src/domain/llm/api/queryKeys.ts`**
```typescript
export const LLM_QUERY_SCOPE = 'llm' as const;

export enum LLMQueryKeys {
  CONFIGURATION = 'configuration',
  STATUS = 'status',
}

export const llmKeys = {
  all: (orgId: string) => [orgId, LLM_QUERY_SCOPE] as const,
  configuration: (orgId: string) => [...llmKeys.all(orgId), LLMQueryKeys.CONFIGURATION] as const,
  status: (orgId: string) => [...llmKeys.all(orgId), LLMQueryKeys.STATUS] as const,
};
```

**`apps/frontend/src/domain/llm/api/gateways/ILLMGateway.ts`**
- Gateway interface defining `testConnection` method

**`apps/frontend/src/domain/llm/api/gateways/LLMGatewayApi.ts`**
- Gateway implementation using ApiService

**`apps/frontend/src/domain/llm/api/gateways/index.ts`**
- Export barrel file

**`apps/frontend/src/domain/llm/api/queries/LLMQueries.ts`**
- `useTestLLMConnectionMutation(orgId)` - uses existing `POST /organizations/:orgId/llm/test-connection`
- Placeholder hooks for save/get/test-saved (to be enabled in Sub-Task 8)

**`apps/frontend/src/domain/llm/api/queries/index.ts`**
- Export barrel file

---

## Phase 2: Backend (save/get/test-saved configuration)

### Sub-Task 4: Define Types and Contracts [DONE]

**Commit**: `feat(types): add LLM configuration contracts and update ILlmPort #11`

#### Files Created

**`packages/types/src/llm/contracts/GetLLMConfigurationUseCase.ts`**
- `GetLLMConfigurationCommand` - extends `PackmindCommand`
- `LLMConfigurationDTO` - display-only DTO (no API keys/secrets)
- `GetLLMConfigurationResponse` - with `configuration` and `hasConfiguration`
- `IGetLLMConfigurationUseCase` - use case type

**`packages/types/src/llm/contracts/SaveLLMConfigurationUseCase.ts`**
- `SaveLLMConfigurationCommand` - extends `PackmindCommand` and `config`
- `SaveLLMConfigurationResponse` - with `success` and `message`
- `ISaveLLMConfigurationUseCase` - use case type

**`packages/types/src/llm/contracts/TestSavedLLMConfigurationUseCase.ts`**
- `TestSavedLLMConfigurationCommand` - extends `PackmindCommand`
- `TestSavedLLMConfigurationResponse` - extends `TestLLMConnectionResponse` with `hasConfiguration`
- `ITestSavedLLMConfigurationUseCase` - use case type

#### Files Modified

**`packages/types/src/llm/ports/ILlmPort.ts`**
- Added `saveLLMConfiguration(command): Promise<SaveLLMConfigurationResponse>`
- Added `getLLMConfiguration(command): Promise<GetLLMConfigurationResponse>`
- Added `testSavedLLMConfiguration(command): Promise<TestSavedLLMConfigurationResponse>`

**`packages/types/src/llm/index.ts`**
- Added exports for all 3 new contract files

**`packages/llm/src/application/adapter/LlmAdapter.ts`**
- Added stub implementations for the 3 new methods (to satisfy interface)

---

### Sub-Task 5: Implement Cache-Based Repository [PENDING]

**Commit**: `feat(llm): implement LLM configuration repository with encryption #11`

### New File

**`packages/llm/src/infra/repositories/LLMConfigurationRepository.ts`**

```typescript
type StoredLLMConfiguration = {
  config: LLMServiceConfig;
  configuredAt: Date;
};

export class LLMConfigurationRepository {
  private cache: Cache;
  private encryptionService: EncryptionService;
  private readonly TTL_SECONDS = 86400; // 24 hours

  private getCacheKey(orgId: OrganizationId): string {
    return `llm-config:${orgId}`;
  }

  async save(orgId: OrganizationId, config: LLMServiceConfig): Promise<void>;
  async get(orgId: OrganizationId): Promise<StoredLLMConfiguration | null>;
  async exists(orgId: OrganizationId): Promise<boolean>;

  // Encrypt apiKey/llmApiKey before storage
  private encryptSecrets(config: LLMServiceConfig): LLMServiceConfig;
  // Decrypt after retrieval
  private decryptSecrets(config: LLMServiceConfig): LLMServiceConfig;
}
```

Key patterns:
- Follow `LoginRateLimiterService` for cache usage
- Follow `GitProviderRepository` for encryption pattern

### Test File

**`packages/llm/src/infra/repositories/LLMConfigurationRepository.spec.ts`**
- Test encryption/decryption of secrets
- Test cache operations (save, get, exists)
- Test TTL is set correctly

---

### Sub-Task 6: Implement Admin-Only Use Cases [PENDING]

**Commit**: `feat(llm): implement admin-only LLM configuration use cases #11`

### New Files

**`packages/llm/src/application/useCases/saveLLMConfiguration/`**
- `saveLLMConfiguration.usecase.ts` - Extends `AbstractAdminUseCase`
- `ISaveLLMConfigurationUseCase.ts` - Interface

**`packages/llm/src/application/useCases/getLLMConfiguration/`**
- `getLLMConfiguration.usecase.ts` - Extends `AbstractAdminUseCase`, strips secrets from response
- `IGetLLMConfigurationUseCase.ts` - Interface

**`packages/llm/src/application/useCases/testSavedLLMConfiguration/`**
- `testSavedLLMConfiguration.usecase.ts` - Extends `AbstractAdminUseCase`, retrieves stored config and tests
- `ITestSavedLLMConfigurationUseCase.ts` - Interface

### Test Files (in each use case folder)

- `saveLLMConfiguration.usecase.spec.ts` - Test admin-only access, successful save
- `getLLMConfiguration.usecase.spec.ts` - Test admin-only access, secrets stripped from response
- `testSavedLLMConfiguration.usecase.spec.ts` - Test admin-only access, missing config handling

---

### Sub-Task 7: Update LlmAdapter and Add API Endpoints [PENDING]

**Commit**: `feat(llm): wire up configuration use cases and API endpoints #11`

### Files to Modify

**`packages/llm/src/application/adapter/LlmAdapter.ts`**
- Add repository and use case properties
- Initialize in `initialize()` method
- Implement 3 new `ILlmPort` methods

**`apps/api/src/app/organizations/llm/llm.controller.ts`**

New endpoints:
```typescript
@Post('configuration')      // Save config (overwrites existing)
@Get('configuration')       // Get config (no secrets)
@Post('configuration/test') // Test saved config
```

**`apps/api/src/app/organizations/llm/llm.service.ts`**

Add corresponding service methods that delegate to `ILlmPort`.

---

### Sub-Task 8: Enable Full Frontend Integration [PENDING]

**Commit**: `feat(frontend): enable full LLM settings integration #11`

### Files to Modify

- Update `LLMConfigurationPage.tsx` to show status section on load
- Enable save button in `LLMConfigurationForm.tsx`
- Connect `useGetLLMConfigurationQuery` and `useTestSavedConfigurationQuery`
- Add confirmation dialog before overwriting existing configuration

---

## Critical Reference Files

| File | Purpose |
|------|---------|
| `packages/types/src/llm/LLMProviderMetadata.ts` | Provider metadata for dynamic form |
| `packages/types/src/llm/ports/ILlmPort.ts` | Interface to extend |
| `packages/llm/src/application/adapter/LlmAdapter.ts` | Adapter pattern reference |
| `packages/node-utils/src/application/AbstractAdminUseCase.ts` | Admin use case base class |
| `packages/node-utils/src/security/EncryptionService.ts` | Encryption utility |
| `packages/node-utils/src/cache/Cache.ts` | Redis cache singleton |
| `packages/accounts/src/application/services/LoginRateLimiterService.ts` | Cache usage pattern |
| `packages/git/src/infra/repositories/GitProviderRepository.ts` | Encryption in repository pattern |
| `apps/api/src/app/organizations/llm/llm.controller.ts` | Existing LLM controller |
| `apps/frontend/app/routes/org.$orgSlug._protected.settings.git._index.tsx` | Settings route pattern |
