/**
 * Error thrown when parsing a SKILL.md file fails.
 * This includes missing frontmatter, unclosed frontmatter, or invalid YAML syntax.
 */
export class SkillParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillParseError';
    Object.setPrototypeOf(this, SkillParseError.prototype);
  }
}
