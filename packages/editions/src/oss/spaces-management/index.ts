export { SpacesManagementHexa } from './SpacesManagementHexa';
export { SpacesManagementAdapter } from './SpacesManagementAdapter';
export { SpacesManagementModule } from './nest-api/spaces-management.module';

export class MoveArtifactsToSpaceUseCase {}
export class SpaceNotFoundError extends Error {
  constructor(message = 'Space not found') {
    super(message);
  }
}
export class SpaceOwnershipMismatchError extends Error {
  constructor(message = 'Space ownership mismatch') {
    super(message);
  }
}
