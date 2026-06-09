import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters for `GET /organizations/:orgId/marketplaces/validate-url`.
 *
 * Used by the public-link form to pre-flight a marketplace URL before
 * submitting the link request.
 */
export class ValidateMarketplaceUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  url!: string;
}
