import { Inject } from '@nestjs/common';

/**
 * Local DI token for the search adapter.
 *
 * Unlike the domain adapters (spaces, standards, ...) there is no SearchHexa
 * registered in HexaRegistryModule, so the adapter is bound directly in
 * SearchModule via `{ provide: SEARCH_ADAPTER_TOKEN, useClass: SearchAdapter }`
 * and injected with @InjectSearchAdapter(). Mirrors the HexaInjection pattern.
 */
export const SEARCH_ADAPTER_TOKEN = 'SEARCH_ADAPTER';

export const InjectSearchAdapter = () => Inject(SEARCH_ADAPTER_TOKEN);
