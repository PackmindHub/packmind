import { DeploymentsError } from './DeploymentsError';

/**
 * One or more of the addressed package slugs resolved to nothing in the scope
 * the lookup was made in.
 *
 * The slugs are named back to the caller because the caller supplied them:
 * repeating a slug that was already in the request discloses nothing it did
 * not already know.
 */
export class PackagesNotFoundError extends DeploymentsError {
  public readonly unknownSlugs: string[];

  constructor(unknownSlugs: string[]) {
    const slugsList = unknownSlugs.map((slug) => `"${slug}"`).join(', ');
    super(
      'not_found',
      'packages_not_found',
      { slugs: unknownSlugs },
      unknownSlugs.length === 1
        ? `Package ${slugsList} was not found`
        : `Packages ${slugsList} were not found`,
    );
    this.name = 'PackagesNotFoundError';
    this.unknownSlugs = unknownSlugs;
  }
}
