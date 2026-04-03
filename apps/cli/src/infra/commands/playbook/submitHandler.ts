import * as path from 'path';
import slug from 'slug';

import {
  ApplyPlaybookProposalItem,
  ChangeProposalArtefactId,
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
  TargetId,
} from '@packmind/types';

import { createTargetContextResolver } from './submit/targetContextResolver';
import { buildProposals, ProposalItem } from './submit/proposalBuilder';
import {
  formatCommand,
  logConsole,
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../../utils/consoleLogger';
import { IPackmindGateway } from '../../../domain/repositories/IPackmindGateway';
import { isCommunityEditionError } from '../../../domain/errors/CommunityEditionError';
import { capitalize } from '../../utils/stringUtils';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
} from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { resolveUrlBuilder } from '../../utils/urlBuilderUtils';

export type PlaybookSubmitHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
  cwd: string;
  exit: (code: number) => void;
  message: string | undefined;
  noReview: boolean;
  openEditor: (prefill: string) => string | null;
  unlinkSync: (filePath: string) => void;
  rmSync: (dirPath: string, options?: { recursive?: boolean }) => void;
};

function buildEditorPrefill(changes: PlaybookChangeEntry[]): string {
  const lines = [
    '',
    '# Changes to be submitted:',
    ...changes.map(
      (c) =>
        `#  - ${capitalize(c.artifactType)} "${c.artifactName}" ${c.changeType ?? 'updated'}`,
    ),
  ];
  return lines.join('\n');
}

function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .trim();
}

async function checkForDuplicateNames(
  createdEntries: PlaybookChangeEntry[],
  packmindGateway: IPackmindGateway,
): Promise<string[]> {
  const errors: string[] = [];

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
        errors.push(
          `A ${entry.artifactType} named "${entry.artifactName}" is staged multiple times. Remove the duplicate with "playbook unstage" or rename the artifact.`,
        );
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
          errors.push(
            `A ${entry.artifactType} named "${entry.artifactName}" already exists in this space. Use "playbook unstage" to remove it or rename the artifact.`,
          );
        }
      }
    } catch {
      // Gateway failure — skip pre-flight check for this group
    }
  }

  return errors;
}

async function fetchAvailablePackageSlugs(
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

function logPackageAddGuidance(
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

async function logRemovedPackagesNotification(
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

export async function playbookSubmitHandler(
  deps: PlaybookSubmitHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    playbookLocalRepository,
    lockFileRepository,
    cwd,
    exit,
    message,
    noReview,
    openEditor,
  } = deps;

  const changes = playbookLocalRepository.getChanges();
  if (changes.length === 0) {
    logConsole('Nothing to submit.');
    exit(0);
    return;
  }

  // Resolve message
  let resolvedMessage: string;
  if (message) {
    resolvedMessage = message;
  } else if (noReview) {
    resolvedMessage = '';
  } else {
    const prefill = buildEditorPrefill(changes);
    const editorResult = openEditor(prefill);
    if (!editorResult) {
      logErrorConsole('Aborting: empty message.');
      exit(1);
      return;
    }
    const stripped = stripCommentLines(editorResult);
    if (!stripped) {
      logErrorConsole('Aborting: empty message.');
      exit(1);
      return;
    }
    resolvedMessage = stripped;
  }

  // Pre-flight: check for duplicate artifact names
  const createdEntries = changes.filter((c) => c.changeType === 'created');
  if (createdEntries.length > 0) {
    const duplicateErrors = await checkForDuplicateNames(
      createdEntries,
      packmindCliHexa.getPackmindGateway(),
    );
    if (duplicateErrors.length > 0) {
      for (const error of duplicateErrors) {
        logErrorConsole(error);
      }
      exit(1);
      return;
    }
  }

  // Per-target lock file resolution cache
  const resolver = await createTargetContextResolver({
    lockFileRepository,
    cwd,
    packmindCliHexa,
  });

  // Build proposals
  const { proposals: allProposals, skippedRemovals } = await buildProposals(
    changes,
    resolver.getTargetContext,
    noReview,
  );

  if (allProposals.length === 0) {
    logConsole(
      'Nothing to submit — no changes detected compared to deployed versions.',
    );
    for (const entry of changes) {
      playbookLocalRepository.removeChange(entry.filePath, entry.spaceId);
    }
    exit(0);
    return;
  }

  // Collect packageIds from removal proposals for post-submit notification
  const removalPackageIds = new Set<string>();
  for (const proposal of allProposals) {
    if (
      proposal.type === ChangeProposalType.removeStandard ||
      proposal.type === ChangeProposalType.removeCommand ||
      proposal.type === ChangeProposalType.removeSkill
    ) {
      const payload = proposal.payload as { packageIds: string[] };
      for (const id of payload.packageIds) {
        removalPackageIds.add(id);
      }
    }
  }

  // Group file paths by spaceId (for incremental clearing)
  const filePathsBySpaceId = new Map<string, Set<string>>();
  for (const entry of changes) {
    const existing = filePathsBySpaceId.get(entry.spaceId) ?? new Set();
    existing.add(entry.filePath);
    filePathsBySpaceId.set(entry.spaceId, existing);
  }

  // Group by spaceId
  const proposalsBySpaceId = new Map<string, ProposalItem[]>();
  for (const proposal of allProposals) {
    const existing = proposalsBySpaceId.get(proposal.spaceId) ?? [];
    existing.push(proposal);
    proposalsBySpaceId.set(proposal.spaceId, existing);
  }

  // Submit
  const packmindGateway = packmindCliHexa.getPackmindGateway();

  if (noReview) {
    const applyProposals: ApplyPlaybookProposalItem[] = allProposals.map(
      (p) => ({
        spaceId: p.spaceId as SpaceId,
        type: p.type,
        artefactId: p.artefactId as StandardId | RecipeId | SkillId | null,
        payload: p.payload as ChangeProposalPayload<ChangeProposalType>,
        targetId: (p.targetId ?? '') as TargetId,
      }),
    );

    if (applyProposals.length === 0) {
      logConsole('Nothing to apply directly.');
      exit(0);
      return;
    }

    let response: Awaited<
      ReturnType<typeof packmindGateway.changeProposals.batchApply>
    >;
    try {
      response = await packmindGateway.changeProposals.batchApply({
        proposals: applyProposals,
        message: resolvedMessage,
        directUpdate: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logErrorConsole(`Failed to apply changes: ${errorMessage}`);
      exit(1);
      return;
    }

    if (!response.success) {
      logErrorConsole(`Failed to apply changes: ${response.error.message}`);
      logInfoConsole(
        'Your playbook has not been modified. Fix the issue and retry.',
      );
      exit(1);
      return;
    }

    for (const [spaceId, filePaths] of filePathsBySpaceId) {
      for (const filePath of filePaths) {
        playbookLocalRepository.removeChange(filePath, spaceId);
      }
    }

    await logRemovedPackagesNotification(packmindCliHexa, removalPackageIds);

    const formatCount = (
      items: readonly unknown[],
      noun: string,
    ): string | null =>
      items.length > 0
        ? `${items.length} ${noun}${items.length !== 1 ? 's' : ''}`
        : null;

    const collectParts = (counts: {
      standards: readonly unknown[];
      commands: readonly unknown[];
      skills: readonly unknown[];
    }): string[] =>
      [
        formatCount(counts.standards, 'standard'),
        formatCount(counts.commands, 'command'),
        formatCount(counts.skills, 'skill'),
      ].filter((p): p is string => p !== null);

    const createdParts = collectParts(response.created);
    const updatedParts = collectParts(response.updated);

    const messageParts: string[] = [];
    if (createdParts.length > 0)
      messageParts.push(`${createdParts.join(', ')} created`);
    if (updatedParts.length > 0)
      messageParts.push(`${updatedParts.join(', ')} updated`);
    if (messageParts.length > 0) {
      logSuccessConsole(messageParts.join(', '));
    } else {
      logInfoConsole('No changes were applied.');
    }

    const createTypes = new Set([
      ChangeProposalType.createStandard,
      ChangeProposalType.createCommand,
      ChangeProposalType.createSkill,
    ]);
    const createdSpaceIds = [
      ...new Set(
        applyProposals
          .filter((p) => createTypes.has(p.type))
          .map((p) => p.spaceId),
      ),
    ];
    const packageSlugs = await fetchAvailablePackageSlugs(
      packmindCliHexa,
      createdSpaceIds,
    );
    logPackageAddGuidance(response.created, packageSlugs);
    exit(0);
    return;
  }

  const spaceNameById = new Map<string, string>();
  for (const change of changes) {
    if (change.spaceName && !spaceNameById.has(change.spaceId)) {
      spaceNameById.set(change.spaceId, change.spaceName);
    }
  }
  const displaySpace = (id: string) => spaceNameById.get(id) ?? id;

  let totalCreated = 0;
  let totalSkipped = 0;
  const succeededSpaces: string[] = [];
  const failedSpaces: Array<{ spaceId: string; errors: string[] }> = [];

  for (const [spaceId, proposals] of proposalsBySpaceId) {
    let response: Awaited<
      ReturnType<typeof packmindGateway.changeProposals.batchCreate>
    >;
    try {
      response = await packmindGateway.changeProposals.batchCreate({
        spaceId: spaceId as SpaceId,
        proposals: proposals.map((p) => ({
          type: p.type,
          artefactId:
            p.artefactId as ChangeProposalArtefactId<ChangeProposalType>,
          payload: p.payload as ChangeProposalPayload<ChangeProposalType>,
          captureMode: ChangeProposalCaptureMode.commit,
          message: resolvedMessage,
          targetId: (p.targetId ?? '') as TargetId,
        })),
      });
    } catch (error) {
      if (isCommunityEditionError(error)) {
        logErrorConsole(error.message);
        logInfoConsole(
          `Run ${formatCommand('`packmind-cli playbook submit --no-review`')} to apply changes directly.`,
        );
        exit(1);
        return;
      }
      throw error;
    }

    totalCreated += response.created;
    totalSkipped += response.skipped;

    if (response.errors.length > 0) {
      const filePaths = filePathsBySpaceId.get(spaceId) ?? new Set();
      const spaceChanges = changes.filter((c) => filePaths.has(c.filePath));
      const allRemovals =
        spaceChanges.length > 0 &&
        spaceChanges.every((c) => c.changeType === 'removed');
      const allSpaceNotFound = response.errors.every(
        (e) => e.code === 'SpaceNotFoundError',
      );

      if (allRemovals && allSpaceNotFound) {
        logWarningConsole(
          `Space ${spaceId} no longer exists — cleaning up local files.`,
        );
        for (const filePath of filePaths) {
          playbookLocalRepository.removeChange(filePath, spaceId);
        }
        const removedEntries = spaceChanges.filter(
          (c) => c.changeType === 'removed',
        );
        for (const entry of removedEntries) {
          const entryCtx = resolver.getCachedContext(entry.configDir);
          if (!entryCtx?.projectDir) continue;
          try {
            const fullPath = path.join(entryCtx.projectDir, entry.filePath);
            if (entry.artifactType === 'skill') {
              deps.rmSync(fullPath, { recursive: true });
            } else {
              deps.unlinkSync(fullPath);
            }
          } catch {
            // File may already be deleted (manual deletion case)
          }
        }
      } else {
        failedSpaces.push({
          spaceId,
          errors: response.errors.map((e) => e.message),
        });
      }
    } else {
      succeededSpaces.push(spaceId);
      const filePaths = filePathsBySpaceId.get(spaceId) ?? new Set();
      for (const filePath of filePaths) {
        playbookLocalRepository.removeChange(filePath, spaceId);
      }

      // Delete local files for removed entries
      const removedEntries = changes.filter(
        (c) => c.changeType === 'removed' && filePaths.has(c.filePath),
      );
      for (const entry of removedEntries) {
        const entryCtx = resolver.getCachedContext(entry.configDir);
        if (!entryCtx?.projectDir) continue;
        try {
          const fullPath = path.join(entryCtx.projectDir, entry.filePath);
          if (entry.artifactType === 'skill') {
            deps.rmSync(fullPath, { recursive: true });
          } else {
            deps.unlinkSync(fullPath);
          }
        } catch {
          // File may already be deleted (manual deletion case)
        }
      }
    }
  }

  if (failedSpaces.length > 0) {
    for (const { spaceId, errors } of failedSpaces) {
      logErrorConsole(
        `Failed to submit to space '${displaySpace(spaceId)}': ${errors.join(', ')}`,
      );
    }
    if (succeededSpaces.length > 0) {
      logWarningConsole(
        `Submitted to: ${succeededSpaces.map(displaySpace).join(', ')}. ` +
          `Run 'packmind playbook submit' again to retry failed spaces.`,
      );
    }
    exit(1);
    return;
  }

  await logRemovedPackagesNotification(packmindCliHexa, removalPackageIds);

  const parts: string[] = [];
  if (totalCreated > 0) {
    parts.push(`${totalCreated} submitted`);
  }
  if (totalSkipped > 0) {
    parts.push(`${totalSkipped} skipped (already submitted)`);
  }

  if (totalCreated > 0 && totalSkipped === 0) {
    logSuccessConsole(
      `Submitted ${totalCreated} change proposal${totalCreated !== 1 ? 's' : ''}`,
    );
  } else if (totalCreated === 0 && totalSkipped > 0) {
    logWarningConsole(
      `All proposals were already submitted (${totalSkipped} skipped)`,
    );
  } else {
    logSuccessConsole(`Change proposals: ${parts.join(', ')}`);
  }
  exit(0);
}
