import { parseSkillMdContent } from '@packmind/node-utils';

import { SkillParseError } from '../errors/SkillParseError';
import { ParsedSkill, SkillProperties } from '../../domain/SkillProperties';

const FRONTMATTER_DELIMITER = '---';

/**
 * Parses SKILL.md file content and extracts frontmatter metadata and body.
 *
 * The SKILL.md file must contain YAML frontmatter enclosed by `---` delimiters
 * followed by Markdown content.
 *
 * @see https://agentskills.io/specification
 */
export class SkillParser {
  /**
   * Parses a SKILL.md file content and returns the metadata and body.
   *
   * @param content - The raw content of a SKILL.md file
   * @returns The parsed skill with metadata and body
   * @throws {SkillParseError} If frontmatter is missing, unclosed, or contains invalid YAML
   */
  parse(content: string): ParsedSkill {
    this.validateFrontmatterStructure(content);

    const result = parseSkillMdContent(content);
    if (!result) {
      throw new SkillParseError(
        'Invalid frontmatter: expected YAML object with key-value pairs',
      );
    }

    return {
      metadata: result.properties as SkillProperties,
      body: result.body,
    };
  }

  private validateFrontmatterStructure(content: string): void {
    const trimmed = content.trim();

    if (!trimmed.startsWith(FRONTMATTER_DELIMITER)) {
      throw new SkillParseError(
        'Missing frontmatter: SKILL.md must start with ---',
      );
    }

    const afterOpening = trimmed.slice(FRONTMATTER_DELIMITER.length);
    const closingIndex = afterOpening.indexOf(`\n${FRONTMATTER_DELIMITER}`);

    if (closingIndex === -1) {
      throw new SkillParseError(
        'Unclosed frontmatter: missing closing --- delimiter',
      );
    }
  }
}
