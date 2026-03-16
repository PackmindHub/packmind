export class DefaultSpaceNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`No default space found for organization ${organizationId}`);
    this.name = 'DefaultSpaceNotFoundError';
  }
}
