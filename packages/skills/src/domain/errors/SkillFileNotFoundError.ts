import { SkillsError } from './SkillsError';

/**
 * The file path asked for does not exist in the skill's latest version.
 *
 * The caller-supplied path is named in the message; the skill id is not,
 * and moves to the context instead.
 */
export class SkillFileNotFoundError extends SkillsError {
  constructor(skillId: string, filePath: string) {
    super(
      'not_found',
      'skill_file_not_found',
      { skillId, skillFilePath: filePath },
      `File "${filePath}" was not found in this skill.`,
    );
    this.name = 'SkillFileNotFoundError';
  }
}
