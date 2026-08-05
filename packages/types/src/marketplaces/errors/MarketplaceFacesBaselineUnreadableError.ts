/**
 * Error thrown when an assistant was being enabled, but the catalogue Packmind
 * already maintains could not be read — so the plugins already served cannot be
 * carried over. Enabling anyway would advertise an assistant with an empty
 * catalogue, which is worse than not enabling it yet.
 */
export class MarketplaceFacesBaselineUnreadableError extends Error {
  constructor() {
    super(
      'The marketplace catalogue could not be read, so the new assistant cannot be given the plugins already served',
    );
    this.name = 'MarketplaceFacesBaselineUnreadableError';
  }
}
