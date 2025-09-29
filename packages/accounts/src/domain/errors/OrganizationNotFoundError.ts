export class OrganizationNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`Organization with id "${organizationId}" was not found`);
    this.name = 'OrganizationNotFoundError';
    Object.setPrototypeOf(this, OrganizationNotFoundError.prototype);
  }
}
