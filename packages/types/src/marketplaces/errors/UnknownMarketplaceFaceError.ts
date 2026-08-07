/**
 * Error thrown when a requested assistant has no publisher registered in
 * Packmind, so no descriptor could be projected for it.
 */
export class UnknownMarketplaceFaceError extends Error {
  constructor(public readonly faceId: string) {
    super(`Packmind cannot publish to '${faceId}'`);
    this.name = 'UnknownMarketplaceFaceError';
  }
}
