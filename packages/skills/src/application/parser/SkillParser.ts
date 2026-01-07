import { parse as parseYaml } from 'yaml';

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
    const { frontmatter, body } = this.extractFrontmatter(content);
    const metadata = this.parseYamlFrontmatter(frontmatter);

    return { metadata, body };
  }

  private extractFrontmatter(content: string): {
    frontmatter: string;
    body: string;
  } {
    const trimmedContent = content.trim();

    if (!trimmedContent.startsWith(FRONTMATTER_DELIMITER)) {
      throw new SkillParseError(
        'Missing frontmatter: SKILL.md must start with ---',
      );
    }

    const contentAfterOpening = trimmedContent.slice(
      FRONTMATTER_DELIMITER.length,
    );
    const closingIndex = contentAfterOpening.indexOf(
      `\n${FRONTMATTER_DELIMITER}`,
    );

    if (closingIndex === -1) {
      throw new SkillParseError(
        'Unclosed frontmatter: missing closing --- delimiter',
      );
    }

    const frontmatter = contentAfterOpening.slice(0, closingIndex).trim();
    const body = contentAfterOpening
      .slice(closingIndex + FRONTMATTER_DELIMITER.length + 1)
      .trim();

    return { frontmatter, body };
  }

  private parseYamlFrontmatter(frontmatter: string): SkillProperties {
    try {
      const parsed = parseYaml(frontmatter) as SkillProperties;

      if (parsed === null || typeof parsed !== 'object') {
        throw new SkillParseError(
          'Invalid frontmatter: expected YAML object with key-value pairs',
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof SkillParseError) {
        throw error;
      }
      throw new SkillParseError(
        `Invalid YAML syntax: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
