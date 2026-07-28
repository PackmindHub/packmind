import slug from 'slug';

/** Structural on purpose, so the util stays trivially testable without a full `Skill`. */
type NamedSkill = { name: string };

/**
 * Returns the detected names that already belong to a skill in the space.
 *
 * Names are compared slugged, because that is what the upload endpoint does:
 * it looks the skill up by `slug(name)`, so "My Skill" and "my-skill" are the
 * same skill server-side and a case- or separator-only difference would still
 * collide. Detected names are returned as given, so the caller can show the
 * user the directory they actually picked.
 *
 * This is a pre-flight check on the directory name. The authoritative name
 * comes from the SKILL.md frontmatter, which the server parses — so a skill
 * whose frontmatter name differs from its directory name can still be rejected
 * server-side.
 */
export function findSkillNameConflicts(
  detectedNames: string[],
  existingSkills: NamedSkill[],
): string[] {
  const existing = new Set(existingSkills.map((skill) => slug(skill.name)));
  return detectedNames.filter((name) => existing.has(slug(name)));
}
