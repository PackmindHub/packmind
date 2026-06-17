import { Module } from '@nestjs/common';
import { OrganizationsSearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchAdapter } from './SearchAdapter';
import { SEARCH_ADAPTER_TOKEN } from './search.tokens';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

/**
 * Module for organization-scoped global search.
 *
 * Registered as a child of OrganizationsModule via RouterModule in AppModule,
 * inheriting the /organizations/:orgId prefix; final route is
 * /organizations/:orgId/search.
 *
 * The SearchAdapter is bound locally (no SearchHexa/registry entry) and injected
 * via SEARCH_ADAPTER_TOKEN. It uses the DataSource directly for QueryBuilder
 * queries, so no TypeOrmModule.forFeature is required.
 */
@Module({
  controllers: [OrganizationsSearchController],
  providers: [
    SearchService,
    { provide: SEARCH_ADAPTER_TOKEN, useClass: SearchAdapter },
    OrganizationAccessGuard,
  ],
  exports: [SearchService],
})
export class OrganizationsSearchModule {}
