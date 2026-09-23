import { SkillsError } from './SkillsError';

/**
 * Error thrown when parsing a SKILL.md file fails.
 * This includes missing frontmatter, unclosed frontmatter, or invalid YAML syntax.
 */
export class SkillParseError extends SkillsError {
  constructor(message: string) {
    super('invalid_input', 'skill_parse_failed', {}, message);
    this.name = 'SkillParseError';
  }
}
