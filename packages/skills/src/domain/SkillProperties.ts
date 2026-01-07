import { Skill } from '@packmind/types';

/**
 * Allowed fields in the SKILL.md frontmatter according to the Agent Skills specification.
 * @see https://agentskills.io/specification
 */
export const ALLOWED_FRONTMATTER_FIELDS = [
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowedTools',
] as const;

export type AllowedFrontmatterField =
  (typeof ALLOWED_FRONTMATTER_FIELDS)[number];

/**
 * Represents the parsed frontmatter properties from a SKILL.md file.
 * Derived from Skill, excluding entity-specific fields (id, spaceId, version, prompt).
 *
 * The parser transforms 'allowed-tools' from YAML to 'allowedTools' in TypeScript.
 *
 * @see https://agentskills.io/specification
 */
export type SkillProperties = Omit<
  Skill,
  'id' | 'spaceId' | 'version' | 'prompt'
>;

/**
 * Represents the result of parsing a SKILL.md file.
 */
export type ParsedSkill = {
  /** The parsed frontmatter metadata */
  metadata: SkillProperties;
  /** The Markdown body content after the frontmatter */
  body: string;
};
