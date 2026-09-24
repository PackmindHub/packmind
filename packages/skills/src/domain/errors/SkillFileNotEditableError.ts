import { SkillsError } from './SkillsError';

/**
 * Error thrown when attempting to edit a skill file that cannot be edited from the UI.
 * This includes non-markdown files and files stored as base64 (binary content).
 */
export class SkillFileNotEditableError extends SkillsError {
  constructor(filePath: string) {
    super(
      'invalid_input',
      'skill_file_not_editable',
      { skillFilePath: filePath },
      `File "${filePath}" cannot be edited from the UI`,
    );
    this.name = 'SkillFileNotEditableError';
  }
}
