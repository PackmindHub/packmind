export class OrganizationSlugConflictError extends Error {
  constructor(name: string) {
    super(
      `An organization with a similar name already exists. The name "${name}" conflicts with an existing organization when converted to URL-friendly format.`,
    );
    this.name = 'OrganizationSlugConflictError';
    Object.setPrototypeOf(this, OrganizationSlugConflictError.prototype);
  }
}

// Backward compatibility alias - can be removed after all references are updated
export const OrganizationNameConflictError = OrganizationSlugConflictError;
