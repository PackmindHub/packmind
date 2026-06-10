import slug from 'slug';
import { ArtifactType, SpaceId } from '@packmind/types';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';

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
