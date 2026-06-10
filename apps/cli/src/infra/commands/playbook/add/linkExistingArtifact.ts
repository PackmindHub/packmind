import slug from 'slug';
import {
  ArtifactType,
  MultiFileCodingAgent,
  PackmindLockFile,
  PackmindLockFileEntry,
  SpaceId,
} from '@packmind/types';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { normalizePath } from '../../../../application/utils/pathUtils';

export type ExistingArtifact = {
  id: string;
  name: string;
};

export async function resolveExistingArtifact(
  packmindCliHexa: PackmindCliHexa,
  artifactType: ArtifactType,
  spaceId: string,
  artifactName: string,
): Promise<ExistingArtifact | null> {
  const artifacts = await listArtifactsForSpace(
    packmindCliHexa,
    artifactType,
    spaceId,
  );
  const match = artifacts.find((a) => slug(a.name) === slug(artifactName));
  return match ? { id: match.id, name: match.name } : null;
}

async function listArtifactsForSpace(
  packmindCliHexa: PackmindCliHexa,
  artifactType: ArtifactType,
  spaceId: string,
): Promise<Array<{ id: string; name: string }>> {
  switch (artifactType) {
    case 'skill': {
      const skills = await packmindCliHexa.listSkills({
        spaceId: spaceId as SpaceId,
      });
      return skills.map((s) => ({ id: s.id, name: s.name }));
    }
    case 'command': {
      const commands = await packmindCliHexa.listCommands({
        spaceId: spaceId as SpaceId,
      });
      return commands.map((c) => ({ id: c.id, name: c.name }));
    }
    case 'standard': {
      const standards = await packmindCliHexa.listStandards({
        spaceId: spaceId as SpaceId,
      });
      return standards.map((s) => ({ id: s.id, name: s.name }));
    }
  }
}

export type AdoptArtifactParams = {
  lockFile: PackmindLockFile | null;
  artifact: {
    id: string;
    name: string;
    type: ArtifactType;
    version: number;
    spaceId: string;
  };
  relativeFilePath: string;
  agent: MultiFileCodingAgent;
};

export function adoptArtifactIntoLockFile({
  lockFile,
  artifact,
  relativeFilePath,
  agent,
}: AdoptArtifactParams): PackmindLockFile {
  const base: PackmindLockFile = lockFile ?? {
    lockfileVersion: 2,
    packageSlugs: [],
    agents: [],
    artifacts: {},
  };

  const key = `user:${artifact.type}:${slug(artifact.name)}`;
  const existing = base.artifacts[key];

  const normalized = normalizePath(relativeFilePath);
  const files = existing ? [...existing.files] : [];
  if (!files.some((f) => normalizePath(f.path) === normalized)) {
    files.push({ path: relativeFilePath, agent });
  }

  const entry: PackmindLockFileEntry = {
    name: artifact.name,
    type: artifact.type,
    id: artifact.id,
    version: artifact.version,
    spaceId: artifact.spaceId,
    packageIds: existing?.packageIds ?? [],
    source: 'user',
    files,
  };

  return {
    ...base,
    artifacts: { ...base.artifacts, [key]: entry },
  };
}
