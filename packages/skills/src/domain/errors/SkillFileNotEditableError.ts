/**
 * Error thrown when attempting to edit a skill file that cannot be edited from the UI.
 * This includes non-markdown files and files stored as base64 (binary content).
 */
export class SkillFileNotEditableError extends Error {
  constructor(public readonly filePath: string) {
    super(`File "${filePath}" cannot be edited from the UI`);
    this.name = 'SkillFileNotEditableError';
  }
}
