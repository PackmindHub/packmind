/**
 * Type of artifact matched by the global search.
 * Maps to the four searchable entities: standards, recipes (commands), skills, packages.
 */
export type SearchArtifactType = 'standard' | 'command' | 'skill' | 'package';

/**
 * Which field matched the search term.
 * Used to order results: name matches first, then description matches.
 */
export type SearchMatchSource = 'name' | 'description';

/**
 * A single search result item, flattened across artifact types.
 * Presentation DTO: ids/slugs are plain strings so the frontend can build
 * routes without importing branded id helpers.
 *
 * `description` source per type:
 * - standard: Standard.description
 * - command:  latest RecipeVersion.summary (the command summary)
 * - skill:    Skill.description (the skill.md frontmatter description)
 * - package:  Package.description
 * Null when the artifact has no description/summary.
 */
export type SearchResult = {
  id: string;
  slug: string;
  type: SearchArtifactType;
  name: string;
  description: string | null;
  spaceId: string;
  /** Space slug — needed to build the space-scoped single-item route. */
  spaceSlug: string;
  matchSource: SearchMatchSource;
};

/**
 * Response of the global search endpoint.
 * `results` is capped (max 15), ordered with name matches first.
 * `total` is the count of returned (capped) matches.
 */
export type SearchResponse = {
  results: SearchResult[];
  total: number;
};
