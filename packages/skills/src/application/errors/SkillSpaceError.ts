/**
 * Error thrown when space validation or selection fails during skill upload.
 * This includes:
 * - Space not found
 * - Space doesn't belong to organization
 * - No spaces available for auto-selection
 */
export class SkillSpaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillSpaceError';
    Object.setPrototypeOf(this, SkillSpaceError.prototype);
  }
}
