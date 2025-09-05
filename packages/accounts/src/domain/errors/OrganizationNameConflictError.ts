export class OrganizationNameConflictError extends Error {
  constructor(name: string) {
    super(`An organization with the name '${name}' already exists`);
    this.name = 'OrganizationNameConflictError';
    Object.setPrototypeOf(this, OrganizationNameConflictError.prototype);
  }
}
