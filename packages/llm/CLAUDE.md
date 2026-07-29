# LLM Package

Provider-agnostic access to large language models. Everything funnels through one factory.

## Single entry point

`createLLMService(config)` in `src/factories/createLLMService.ts` switches on a discriminated union
keyed by `LLMProvider` (declared in `@packmind/types`, along with the `LLMServiceConfig` union) and
returns an `AIService`. Consumers never instantiate a provider service directly.

| `LLMProvider` | Service in `src/infra/services/` |
| --- | --- |
| `OPENAI` | `OpenAIService` |
| `ANTHROPIC` | `AnthropicService` |
| `GEMINI` | `GeminiService` |
| `AZURE_OPENAI` | `AzureOpenAIService` |
| `OPENAI_COMPATIBLE` | `OpenAIAPICompatibleService` |
| `PACKMIND` | `PackmindService` |

`BaseOpenAIService` is the shared base for anything speaking the OpenAI wire format — prefer
extending it, or configuring `OPENAI_COMPATIBLE` with an `llmEndpoint`, over writing a new provider.

## Adding a provider

Start from the types, not from this package: extend `LLMProvider` and `LLMServiceConfig` in
`@packmind/types`, add the service under `src/infra/services/`, then add the `case`. The
`const _exhaustive: never` guard at the end of the switch turns a forgotten case into a compile
error, so the type change is what drives the rest.

## Conventions

- **Model defaults live in `@packmind/types`.** `src/constants/defaultModels.ts` only re-exports
  `DEFAULT_OPENAI_MODELS`, `DEFAULT_ANTHROPIC_MODELS`, `DEFAULT_GEMINI_MODELS` and
  `DEFAULT_AZURE_OPENAI_API_VERSION` for back-compat — change a default there, not here. Provider
  endpoints (`OPENAI_ENDPOINT`, `ANTHROPIC_ENDPOINT`) do live in that file.
- Provider failures are normalised for users by
  `src/infra/services/extractUserFriendlyErrorMessage.ts` — route new provider errors through it
  instead of surfacing raw SDK messages.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
