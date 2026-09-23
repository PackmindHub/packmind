import { SkillsInternalError } from './SkillsInternalError';

/**
 * An existing skill has no version at all.
 *
 * A broken invariant: every skill is created together with its first
 * version, so one with none reached this state through a bug, not a caller
 * mistake.
 */
export class SkillVersionMissingError extends SkillsInternalError {
  constructor(skillId: string) {
    super(
      'skill_version_missing',
      { skillId },
      'No skill version found for this skill.',
    );
    this.name = 'SkillVersionMissingError';
  }
}
