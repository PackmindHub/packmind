import {
  ArtifactType,
  FileModification,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
} from '@packmind/types';

export type ArtifactMetadata = {
  spaceId: string;
  version: number;
  slug: string;
};

export type ArtifactMetadataMap = Record<
  ArtifactType,
  Map<string, ArtifactMetadata>
>;

export function buildArtifactMetadataMap(params: {
  recipes: { spaceIdMap: Map<string, string>; versions: RecipeVersion[] };
  standards: { spaceIdMap: Map<string, string>; versions: StandardVersion[] };
  skills: { spaceIdMap: Map<string, string>; versions: SkillVersion[] };
}): ArtifactMetadataMap {
  const metadata: ArtifactMetadataMap = {
    command: new Map(),
    standard: new Map(),
    skill: new Map(),
  };

  for (const rv of params.recipes.versions) {
    const spaceId = params.recipes.spaceIdMap.get(rv.recipeId as string);
    if (spaceId) {
      metadata.command.set(rv.recipeId as string, {
        spaceId,
        version: rv.version,
        slug: rv.slug,
      });
    }
  }

  for (const sv of params.standards.versions) {
    const spaceId = params.standards.spaceIdMap.get(sv.standardId as string);
    if (spaceId) {
      metadata.standard.set(sv.standardId as string, {
        spaceId,
        version: sv.version,
        slug: sv.slug,
      });
    }
  }

  for (const skv of params.skills.versions) {
    const spaceId = params.skills.spaceIdMap.get(skv.skillId as string);
    if (spaceId) {
      metadata.skill.set(skv.skillId as string, {
        spaceId,
        version: skv.version,
        slug: skv.slug,
      });
    }
  }

  return metadata;
}

export function enrichFileModificationsWithMetadata(
  files: FileModification[],
  metadata: ArtifactMetadataMap,
): void {
  for (const file of files) {
    if (file.artifactType && file.artifactId) {
      const entry = metadata[file.artifactType].get(file.artifactId);
      if (entry) {
        file.spaceId = entry.spaceId;
        file.artifactVersion = entry.version;
        file.artifactSlug = entry.slug;
      }
    }
  }
}
