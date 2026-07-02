import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Request body for `POST /organizations/:orgId/marketplaces`.
 *
 * Carries the coordinates of the Git repository that should be linked as an
 * organization-level marketplace via the private (token-bearing) path.
 */
export class LinkMarketplaceBodyDto {
  @IsUUID()
  @IsNotEmpty()
  gitProviderId!: string;

  @IsString()
  @IsNotEmpty()
  owner!: string;

  @IsString()
  @IsNotEmpty()
  repo!: string;

  @IsString()
  @IsNotEmpty()
  branch!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
