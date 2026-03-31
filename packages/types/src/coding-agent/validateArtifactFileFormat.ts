import { ArtifactType } from '../deployments';

// Skills have no extension restriction here because skill validation is handled
// downstream by parseSkillDirectory (checks for SKILL.md, frontmatter name, etc.).
export const ACCEPTED_ARTIFACT_EXTENSIONS: Record<ArtifactType, string[]> = {
  command: ['.md'],
  standard: ['.md', '.mdc'],
  skill: [],
};

export type ArtifactFileFormatValidation =
  | { valid: true }
  | { valid: false; reason: string };

export function validateArtifactFileFormat(
  filePath: string,
  artifactType: ArtifactType,
): ArtifactFileFormatValidation {
  const extensions = ACCEPTED_ARTIFACT_EXTENSIONS[artifactType];
  if (extensions.length === 0) {
    return { valid: true };
  }
  const normalizedPath = filePath.toLowerCase();
  const hasValidExtension = extensions.some((ext) =>
    normalizedPath.endsWith(ext),
  );
  if (!hasValidExtension) {
    const accepted = extensions.join(', ');
    return {
      valid: false,
      reason: `Invalid file format for ${artifactType}. Accepted: ${accepted}`,
    };
  }
  return { valid: true };
}
