/**
 * Error thrown when the requested assistant set is empty. A marketplace with no
 * assistant serves nothing, so the change is refused rather than silently
 * leaving the previous set in place.
 */
export class EmptyMarketplaceFacesError extends Error {
  constructor() {
    super('A marketplace must serve at least one assistant');
    this.name = 'EmptyMarketplaceFacesError';
  }
}
