import { SpaceId } from '@packmind/types';

import {
  formatCommand,
  logInfoConsole,
  logWarningConsole,
} from '../../../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../../../utils/credentials';
import { resolveUrlBuilder } from '../../../utils/urlBuilderUtils';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';

export async function fetchAvailablePackageSlugs(
  packmindCliHexa: PackmindCliHexa,
  spaceIds: SpaceId[],
): Promise<string[]> {
  try {
    const allSpaces = await packmindCliHexa.getSpaces();
    const relevantSpaces = allSpaces.filter((s) =>
      spaceIds.includes(s.id as SpaceId),
    );
    const packagesBySpace = await Promise.all(
      relevantSpaces.map(async (space) => ({
        space,
        packages: await packmindCliHexa.listPackages({
          spaceId: space.id as SpaceId,
        }),
      })),
    );
    const multipleSpaces = relevantSpaces.length > 1;
    return packagesBySpace.flatMap(({ space, packages }) =>
      packages.map((pkg) =>
        multipleSpaces ? `@${space.slug}/${pkg.slug}` : pkg.slug,
      ),
    );
  } catch {
    return [];
  }
}

export function logPackageAddGuidance(
  created: {
    standards: Array<{ slug: string }>;
    commands: Array<{ slug: string }>;
    skills: Array<{ slug: string }>;
  },
  packageSlugs: string[],
): void {
  const { standards, commands, skills } = created;
  const totalCount = standards.length + commands.length + skills.length;
  if (totalCount === 0) return;

  const pkgPlaceholder =
    packageSlugs.length === 1 ? packageSlugs[0] : '<package-slug>';

  if (totalCount === 1) {
    logInfoConsole('To add the created artifact to a package, run:');
    if (standards.length === 1) {
      logInfoConsole(
        `  ${formatCommand(`\`packmind-cli packages add --to ${pkgPlaceholder} --standard ${standards[0].slug}\``)}`,
      );
    } else if (commands.length === 1) {
      logInfoConsole(
        `  ${formatCommand(`\`packmind-cli packages add --to ${pkgPlaceholder} --command ${commands[0].slug}\``)}`,
      );
    } else if (skills.length === 1) {
      logInfoConsole(
        `  ${formatCommand(`\`packmind-cli packages add --to ${pkgPlaceholder} --skill ${skills[0].slug}\``)}`,
      );
    }
  } else {
    logInfoConsole(
      `To add the created artifacts to a package, use ${formatCommand(`\`packmind-cli packages add --to ${pkgPlaceholder} --standard <artifact-slug>\``)} for each artifact.`,
    );
  }

  if (packageSlugs.length > 1) {
    logInfoConsole(`  Available packages: ${packageSlugs.join(', ')}`);
  }
}

export async function logRemovedPackagesNotification(
  packmindCliHexa: PackmindCliHexa,
  packageIds: Set<string>,
): Promise<void> {
  if (packageIds.size === 0) return;
  try {
    const [allPackages, allSpaces] = await Promise.all([
      packmindCliHexa.listPackages({}),
      packmindCliHexa.getSpaces(),
    ]);
    const affectedPackages = allPackages.filter((pkg) =>
      packageIds.has(pkg.id as string),
    );

    if (affectedPackages.length === 0) return;

    const buildUrl = resolveUrlBuilder((id) => `packages/${id}`);
    const spaceById = new Map(allSpaces.map((s) => [s.id as string, s]));

    logWarningConsole(
      'Some changes could not be applied: playbook submit does not allow remove artefacts. Review the following affected packages:',
    );
    for (const pkg of affectedPackages) {
      const space = spaceById.get(pkg.spaceId as string);
      const spaceSlug = space?.slug ?? '';
      const url = buildUrl(spaceSlug, pkg.id as string);
      if (url) {
        logInfoConsole(`  - ${pkg.name}: ${url}`);
      } else {
        logInfoConsole(`  - ${pkg.name}`);
      }
    }
  } catch {
    // Best effort — don't fail if package info can't be fetched
  }
}

export function warnSkippedRemovals(skipped: PlaybookChangeEntry[]): void {
  if (skipped.length === 0) return;
  const apiKey = loadApiKey();
  const host = apiKey ? decodeApiKey(apiKey)?.host : null;
  logWarningConsole(
    `${skipped.length} removal(s) skipped — removals are not supported via --no-review.`,
  );
  if (host) {
    logInfoConsole(`To remove artifacts, visit: ${host}`);
  }
}

export const formatCount = (
  items: readonly unknown[],
  noun: string,
): string | null =>
  items.length > 0
    ? `${items.length} ${noun}${items.length !== 1 ? 's' : ''}`
    : null;

export const collectParts = (counts: {
  standards: readonly unknown[];
  commands: readonly unknown[];
  skills: readonly unknown[];
}): string[] =>
  [
    formatCount(counts.standards, 'standard'),
    formatCount(counts.commands, 'command'),
    formatCount(counts.skills, 'skill'),
  ].filter((p): p is string => p !== null);
