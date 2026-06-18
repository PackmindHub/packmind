/**
 * Body shape accepted by
 * `POST /organizations/:orgId/marketplaces/:marketplaceId/publish`.
 *
 * The controller maps this to a `PublishPackageOnMarketplaceCommand` enriched
 * with the authenticated user/org context.
 */
export class PublishPackageOnMarketplaceBodyDto {
  packageId!: string;
}
