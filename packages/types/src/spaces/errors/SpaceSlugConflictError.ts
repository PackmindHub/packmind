export class SpaceSlugConflictError extends Error {
  constructor(spaceName: string, organizationId: string) {
    super(
      `A space with the name "${spaceName}" already exists in organization ${organizationId}`,
    );
    this.name = 'SpaceSlugConflictError';
  }
}
