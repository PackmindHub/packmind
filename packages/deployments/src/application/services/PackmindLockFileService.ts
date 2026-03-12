import {
  ArtifactType,
  CodingAgent,
  FileModification,
  PackmindLockFile,
  PackmindLockFileEntry,
  PackmindLockFileFile,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  resolveArtefactFromPath,
} from '@packmind/types';

type VersionInfo = {
  name: string;
  type: ArtifactType;
  slug: string;
  version: number;
};

export class PackmindLockFileService {
  buildLockFile(params: {
    fileModifications: FileModification[];
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
    codingAgents: CodingAgent[];
    packageSlugs: string[];
    targetId?: string;
    artifactSpaceIds: Record<string, string>;
    artifactPackageIds: Record<string, string[]>;
  }): PackmindLockFile {
    const versionLookup = this.buildVersionLookup(
      params.recipeVersions,
      params.standardVersions,
      params.skillVersions,
    );

    const artifactMap = new Map<
      string,
      {
        entry: Omit<PackmindLockFileEntry, 'files'>;
        files: PackmindLockFileFile[];
      }
    >();
    for (const file of params.fileModifications) {
      if (!file.artifactType || !file.artifactId) {
        continue;
      }

      const resolved = resolveArtefactFromPath(file.path);
      if (!resolved) {
        continue;
      }

      const versionInfo = versionLookup.get(file.artifactId);
      if (!versionInfo) {
        continue;
      }

      const artifactKey = `${versionInfo.type}:${versionInfo.slug}`;

      const lockFileFile: PackmindLockFileFile = {
        path: file.path,
        agent: resolved.codingAgent,
      };

      if (versionInfo.type === 'skill' && !file.skillFileId) {
        lockFileFile.isSkillDefinition = true;
      }

      if (!artifactMap.has(artifactKey)) {
        artifactMap.set(artifactKey, {
          entry: {
            name: versionInfo.name,
            type: versionInfo.type,
            id: file.artifactId,
            version: versionInfo.version,
            spaceId: params.artifactSpaceIds[file.artifactId] ?? '',
            packageIds: params.artifactPackageIds[file.artifactId] ?? [],
          },
          files: [lockFileFile],
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- key existence checked by `has` above
        artifactMap.get(artifactKey)!.files.push(lockFileFile);
      }
    }

    const artifacts: Record<string, PackmindLockFileEntry> = {};
    for (const [key, value] of artifactMap) {
      artifacts[key] = {
        ...value.entry,
        files: value.files,
      };
    }

    return {
      lockfileVersion: 1,
      packageSlugs: [...params.packageSlugs].sort(),
      agents: [...params.codingAgents].sort(),
      installedAt: new Date().toISOString(),
      cliVersion: 'app',
      targetId: params.targetId,
      artifacts,
    };
  }

  createLockFileModification(lockFile: PackmindLockFile): FileModification {
    return {
      path: 'packmind-lock.json',
      content: JSON.stringify(lockFile, null, 2) + '\n',
    };
  }

  private buildVersionLookup(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[],
  ): Map<string, VersionInfo> {
    const lookup = new Map<string, VersionInfo>();

    for (const rv of recipeVersions) {
      lookup.set(String(rv.recipeId), {
        name: rv.name,
        type: 'command',
        slug: rv.slug,
        version: rv.version,
      });
    }

    for (const sv of standardVersions) {
      lookup.set(String(sv.standardId), {
        name: sv.name,
        type: 'standard',
        slug: sv.slug,
        version: sv.version,
      });
    }

    for (const skv of skillVersions) {
      lookup.set(String(skv.skillId), {
        name: skv.name,
        type: 'skill',
        slug: skv.slug,
        version: skv.version,
      });
    }

    return lookup;
  }
}
