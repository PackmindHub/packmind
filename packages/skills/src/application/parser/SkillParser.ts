import { parseSkillMdContent } from '@packmind/node-utils';

import { SkillParseError } from '../errors/SkillParseError';
import {
  CLAUDE_CODE_ADDITIONAL_FIELDS,
  ParsedSkill,
  SkillProperties,
} from '../../domain/SkillProperties';

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

    const { properties, additionalProperties } =
      this.extractAdditionalProperties(result.properties);

    return {
      metadata: {
        ...properties,
        ...(Object.keys(additionalProperties).length > 0 && {
          additionalProperties,
        }),
      } as SkillProperties,
      body: result.body,
    };
  }

  private extractAdditionalProperties(properties: Record<string, unknown>): {
    properties: Record<string, unknown>;
    additionalProperties: Record<string, unknown>;
  } {
    const additionalProperties: Record<string, unknown> = {};
    const remaining: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      const camelCaseKey = CLAUDE_CODE_ADDITIONAL_FIELDS[key];
      if (camelCaseKey) {
        additionalProperties[camelCaseKey] = value;
      } else {
        remaining[key] = value;
      }
    }

    return { properties: remaining, additionalProperties };
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
