import slug from 'slug';

import { SpaceId } from '@packmind/types';

import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { IPackmindGateway } from '../../../../domain/repositories/IPackmindGateway';

export type DuplicateNameError = {
  spaceId: string;
  artifactType: PlaybookChangeEntry['artifactType'];
  artifactName: string;
  message: string;
};

/**
 * Identity a duplicate-name conflict applies to.
 *
 * Names are only compared within one space and one artifact type, and they are
 * compared slugged — a standard and a command may share a name, and so may two
 * artifacts in different spaces. Callers that need to match staged entries
 * against reported conflicts must key off this, never off the raw name, or they
 * would drop artifacts that never conflicted.
 */
export function duplicateNameKey(entry: {
  spaceId: string;
  artifactType: PlaybookChangeEntry['artifactType'];
  artifactName: string;
}): string {
  return `${entry.spaceId}:${entry.artifactType}:${slug(entry.artifactName)}`;
}

export async function checkForDuplicateNames(
  createdEntries: PlaybookChangeEntry[],
  packmindGateway: IPackmindGateway,
): Promise<DuplicateNameError[]> {
  const errors: DuplicateNameError[] = [];

  // Group by (spaceId, artifactType)
  const groups = new Map<string, PlaybookChangeEntry[]>();
  for (const entry of createdEntries) {
    const key = `${entry.spaceId}:${entry.artifactType}`;
    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }

  // Check duplicates among staged entries themselves
  for (const [, entries] of groups) {
    const seen = new Map<string, string>();
    for (const entry of entries) {
      const sluggedName = slug(entry.artifactName);
      if (seen.has(sluggedName)) {
        errors.push({
          spaceId: entry.spaceId,
          artifactType: entry.artifactType,
          artifactName: entry.artifactName,
          message: `A ${entry.artifactType} named "${entry.artifactName}" is staged multiple times. Remove the duplicate with "playbook unstage" or rename the artifact.`,
        });
      } else {
        seen.set(sluggedName, entry.artifactName);
      }
    }
  }

  // Fetch existing artifacts and check collisions
  for (const [key, entries] of groups) {
    const [rawSpaceId, artifactType] = key.split(':');
    const typedSpaceId = rawSpaceId as SpaceId;
    try {
      let existingNames: string[] = [];
      if (artifactType === 'standard') {
        const response = await packmindGateway.standards.list({
          spaceId: typedSpaceId,
        });
        existingNames = response.standards.map((s) => s.name);
      } else if (artifactType === 'command') {
        const response = await packmindGateway.commands.list({
          spaceId: typedSpaceId,
        });
        existingNames = response.recipes.map((r) => r.name);
      } else if (artifactType === 'skill') {
        const response = await packmindGateway.skills.list({
          spaceId: typedSpaceId,
        });
        existingNames = response.map((s) => s.name);
      }

      const existingNamesSlugged = new Set(existingNames.map((n) => slug(n)));

      for (const entry of entries) {
        if (existingNamesSlugged.has(slug(entry.artifactName))) {
          errors.push({
            spaceId: entry.spaceId,
            artifactType: entry.artifactType,
            artifactName: entry.artifactName,
            message: `A ${entry.artifactType} named "${entry.artifactName}" already exists in this space. Use "playbook unstage" to remove it or rename the artifact.`,
          });
        }
      }
    } catch {
      // Gateway failure — skip pre-flight check for this group
    }
  }

  return errors;
}
