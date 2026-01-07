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
  'allowed-tools',
] as const;

export type AllowedFrontmatterField =
  (typeof ALLOWED_FRONTMATTER_FIELDS)[number];

/**
 * Metadata key-value mapping for additional properties not defined by the spec.
 */
export type SkillMetadata = Record<string, string>;

/**
 * Represents the parsed frontmatter properties from a SKILL.md file.
 *
 * Required fields:
 * - name: 1-64 characters, lowercase alphanumeric and hyphens only
 * - description: 1-1024 characters, describes what the skill does
 *
 * Optional fields:
 * - license: License name or reference to bundled license file
 * - compatibility: 1-500 characters, environment requirements
 * - metadata: Arbitrary key-value mapping
 * - allowed-tools: Space-delimited list of pre-approved tools (experimental)
 *
 * @see https://agentskills.io/specification
 */
export type SkillProperties = {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: SkillMetadata;
  'allowed-tools'?: string;
};

/**
 * Represents the result of parsing a SKILL.md file.
 */
export type ParsedSkill = {
  /** The parsed frontmatter metadata */
  metadata: SkillProperties;
  /** The Markdown body content after the frontmatter */
  body: string;
};
