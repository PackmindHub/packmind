import * as path from 'path';
import * as yaml from 'yaml';
import slug from 'slug';

import {
  ApplyPlaybookProposalItem,
  ChangeProposalArtefactId,
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  FileModification,
  NewSkillPayload,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
  TargetId,
} from '@packmind/types';
import { parseSkillMd } from '@packmind/node-utils';

import { parseStandardMd } from '../../../application/utils/parseStandardMd';
import { parseLenientStandard } from '../../../application/utils/parseLenientStandard';
import { parseCommandFile } from '../../../application/utils/parseCommandFile';
import {
  compareStandardFields,
  compareCommandFields,
  compareSkillDefinitionFields,
} from '../../../application/utils/artifactComparison';
import { normalizePath } from '../../../application/utils/pathUtils';
import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
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
import { PackmindLockFile } from '../../../domain/repositories/PackmindLockFile';
import { fetchDeployedFiles } from '../../utils/deployedFilesUtils';
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

type ProposalItem = {
  type: ChangeProposalType;
  artefactId: string | null;
  payload: unknown;
  targetId: string | undefined;
  spaceId: string;
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

function resolveArtifactIdFromLockFile(
  filePath: string,
  lockFile: PackmindLockFile | null,
): string | null {
  if (!lockFile) return null;
  const normalized = normalizePath(filePath);
  for (const entry of Object.values(lockFile.artifacts)) {
    for (const file of entry.files) {
      const normalizedFilePath = normalizePath(file.path);
      if (
        normalizedFilePath === normalized ||
        (entry.type === 'skill' &&
          normalizedFilePath.startsWith(normalized + '/'))
      ) {
        return entry.id;
      }
    }
  }
  return null;
}

function buildCreatedStandardProposals(
  entry: PlaybookChangeEntry,
): ProposalItem[] {
  const parsed = parseStandardMd(entry.content, entry.filePath);
  if (parsed) {
    return [
      {
        type: ChangeProposalType.createStandard,
        artefactId: null,
        payload: {
          name: parsed.name,
          description: parsed.description,
          scope: parsed.scope,
          rules: parsed.rules.map((r) => ({ content: r })),
        },
        targetId: entry.targetId,
        spaceId: entry.spaceId,
      },
    ];
  }

  const lenient = parseLenientStandard(entry.content);
  if (lenient) {
    return [
      {
        type: ChangeProposalType.createStandard,
        artefactId: null,
        payload: {
          name: lenient.name,
          description: lenient.description,
          scope: '',
          rules: lenient.rules.map((r) => ({ content: r })),
        },
        targetId: entry.targetId,
        spaceId: entry.spaceId,
      },
    ];
  }

  return [];
}

function buildCreatedCommandProposals(
  entry: PlaybookChangeEntry,
): ProposalItem[] {
  const parsed = parseCommandFile(entry.content, entry.filePath);
  const content = parsed.success ? parsed.parsed.content : entry.content;

  return [
    {
      type: ChangeProposalType.createCommand,
      artefactId: null,
      payload: {
        name: entry.artifactName,
        content,
      },
      targetId: entry.targetId,
      spaceId: entry.spaceId,
    },
  ];
}

function buildCreatedSkillProposals(
  entry: PlaybookChangeEntry,
): ProposalItem[] {
  const parsed = yaml.parse(entry.content);
  return [
    {
      type: ChangeProposalType.createSkill,
      artefactId: null,
      payload: {
        name: parsed.name,
        description: parsed.description,
        prompt: parsed.prompt,
        skillMdPermissions: parsed.skillMdPermissions ?? '',
        ...(parsed.license ? { license: parsed.license } : {}),
        ...(parsed.compatibility
          ? { compatibility: parsed.compatibility }
          : {}),
        ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
        ...(parsed.allowedTools ? { allowedTools: parsed.allowedTools } : {}),
        ...(parsed.files ? { files: parsed.files } : {}),
      },
      targetId: entry.targetId,
      spaceId: entry.spaceId,
    },
  ];
}

function buildUpdatedStandardProposals(
  entry: PlaybookChangeEntry,
  artifactId: string | null,
  deployedContent: string | null,
): ProposalItem[] {
  if (!artifactId) return [];

  const base = {
    artefactId: artifactId,
    targetId: entry.targetId,
    spaceId: entry.spaceId,
  };

  if (deployedContent) {
    const fieldChanges = compareStandardFields(
      entry.content,
      deployedContent,
      entry.filePath,
    );
    return fieldChanges.map((change) => ({
      ...base,
      type: change.type,
      payload: change.payload,
    }));
  }

  // No deployed content: parse local and emit all rules as adds
  const localParsed = parseStandardMd(entry.content, entry.filePath);
  if (!localParsed) return [];

  const proposals: ProposalItem[] = [];
  const localRules = new Set(localParsed.rules);
  for (const rule of localRules) {
    proposals.push({
      ...base,
      type: ChangeProposalType.addRule,
      payload: { item: { content: rule } },
    });
  }
  return proposals;
}

function buildUpdatedCommandProposals(
  entry: PlaybookChangeEntry,
  artifactId: string | null,
  deployedContent: string | null,
): ProposalItem[] {
  if (!artifactId || !deployedContent) return [];

  const fieldChanges = compareCommandFields(
    entry.content,
    deployedContent,
    entry.filePath,
  );

  const base = {
    artefactId: artifactId,
    targetId: entry.targetId,
    spaceId: entry.spaceId,
  };

  return fieldChanges.map((change) => ({
    ...base,
    type: change.type,
    payload: change.payload,
  }));
}

function buildUpdatedSkillProposals(
  entry: PlaybookChangeEntry,
  artifactId: string | null,
  deployedFiles: FileModification[],
): ProposalItem[] {
  if (!artifactId) return [];

  const proposals: ProposalItem[] = [];
  const base: Pick<ProposalItem, 'artefactId' | 'targetId' | 'spaceId'> = {
    artefactId: artifactId,
    targetId: entry.targetId,
    spaceId: entry.spaceId,
  };

  // Parse the local YAML content (NewSkillPayload)
  let local: NewSkillPayload;
  try {
    local = yaml.parse(entry.content);
  } catch {
    logWarningConsole(
      `Skipping "${entry.artifactName}" — failed to parse local skill content.`,
    );
    return [];
  }

  // Find the deployed SKILL.md to compare against
  const normalizedEntryPath = normalizePath(entry.filePath);
  const skillMdFile = deployedFiles.find((f) => {
    const normalized = normalizePath(f.path);
    return (
      normalized.startsWith(normalizedEntryPath + '/') &&
      normalized.endsWith('/SKILL.md')
    );
  });

  if (skillMdFile?.content) {
    const deployed = parseSkillMd(skillMdFile.content);
    if (deployed) {
      // Compare SKILL.md fields and generate granular proposals
      const fieldChanges = compareSkillDefinitionFields(local, deployed);
      proposals.push(
        ...fieldChanges.map((change) => ({
          ...base,
          type: change.type,
          payload: change.payload,
        })),
      );
    } else {
      // Fallback: if parsing fails, submit prompt as full update
      proposals.push({
        ...base,
        type: ChangeProposalType.updateSkillPrompt,
        payload: { oldValue: '', newValue: local.prompt },
      });
    }
  } else {
    logWarningConsole(
      `Skipping "${entry.artifactName}" — deployed SKILL.md content not found.`,
    );
    return [];
  }

  // Handle helper files
  const deployedHelperFiles = deployedFiles.filter((f) => {
    const normalized = normalizePath(f.path);
    return (
      normalized.startsWith(normalizedEntryPath + '/') &&
      !normalized.endsWith('/SKILL.md') &&
      f.skillFileId
    );
  });

  const localFiles = local.files ?? [];

  // Updated or unchanged helper files
  for (const deployed of deployedHelperFiles) {
    const relativePath = normalizePath(deployed.path).slice(
      normalizedEntryPath.length + 1,
    );
    const localFile = localFiles.find((f) => f.path === relativePath);

    if (!localFile) {
      // File deleted locally
      proposals.push({
        ...base,
        type: ChangeProposalType.deleteSkillFile,
        payload: {
          targetId: deployed.skillFileId,
          item: {
            id: deployed.skillFileId,
            path: relativePath,
            content: deployed.content ?? '',
            permissions: deployed.skillFilePermissions ?? 'read',
            isBase64: 'isBase64' in deployed ? !!deployed.isBase64 : false,
          },
        },
      });
    } else if (localFile.content !== deployed.content) {
      // File content changed
      proposals.push({
        ...base,
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: deployed.skillFileId,
          oldValue: deployed.content ?? '',
          newValue: localFile.content,
          isBase64: localFile.isBase64 ?? false,
        },
      });
    }

    // Check for permission changes (independent of content changes)
    const localPermissions = localFile?.permissions ?? 'rw-r--r--';
    const deployedPermissions = deployed.skillFilePermissions ?? 'read';
    if (localFile && localPermissions !== deployedPermissions) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateSkillFilePermissions,
        payload: {
          targetId: deployed.skillFileId,
          oldValue: deployedPermissions,
          newValue: localPermissions,
        },
      });
    }
  }

  // New helper files (exist locally but not deployed)
  const deployedRelativePaths = new Set(
    deployedHelperFiles.map((f) =>
      normalizePath(f.path).slice(normalizedEntryPath.length + 1),
    ),
  );
  for (const localFile of localFiles) {
    if (!deployedRelativePaths.has(localFile.path)) {
      proposals.push({
        ...base,
        type: ChangeProposalType.addSkillFile,
        payload: {
          item: {
            path: localFile.path,
            content: localFile.content,
            permissions: localFile.permissions ?? 'rw-r--r--',
            isBase64: localFile.isBase64 ?? false,
          },
        },
      });
    }
  }

  return proposals;
}

function buildRemovedProposals(
  entry: PlaybookChangeEntry,
  artifactId: string,
  lockFile: PackmindLockFile | null,
): ProposalItem[] {
  const typeMap: Record<string, ChangeProposalType> = {
    standard: ChangeProposalType.removeStandard,
    command: ChangeProposalType.removeCommand,
    skill: ChangeProposalType.removeSkill,
  };

  const proposalType = typeMap[entry.artifactType];
  if (!proposalType) return [];

  const lockEntry = lockFile
    ? Object.values(lockFile.artifacts).find((e) => e.id === artifactId)
    : undefined;
  const packageIds = lockEntry?.packageIds ?? [];

  return [
    {
      type: proposalType,
      artefactId: artifactId,
      payload: { packageIds },
      targetId: entry.targetId,
      spaceId: entry.spaceId,
    },
  ];
}

function findDeployedContentForPath(
  filePath: string,
  deployedFiles: FileModification[],
): string | null {
  const normalized = normalizePath(filePath);
  const match = deployedFiles.find((f) => normalizePath(f.path) === normalized);
  return match?.content ?? null;
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
  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

  type TargetContext = {
    lockFile: PackmindLockFile | null;
    deployedFiles: FileModification[];
    projectDir: string | null;
  };

  const targetContextCache = new Map<string, TargetContext>();

  async function getTargetContext(
    entry: PlaybookChangeEntry,
  ): Promise<TargetContext> {
    const key = entry.configDir ?? '__cwd__';
    if (targetContextCache.has(key)) return targetContextCache.get(key)!;

    let projectDir: string | null;
    if (entry.configDir !== undefined && gitRoot) {
      projectDir = path.join(gitRoot, entry.configDir);
    } else {
      projectDir = await findNearestConfigDir(cwd, packmindCliHexa);
    }

    const lockFile = projectDir
      ? await lockFileRepository.read(projectDir)
      : null;
    const deployedFiles =
      lockFile && Object.keys(lockFile.artifacts).length > 0
        ? await fetchDeployedFiles(
            packmindCliHexa.getPackmindGateway(),
            lockFile,
          )
        : [];

    const ctx = { lockFile, deployedFiles, projectDir };
    targetContextCache.set(key, ctx);
    return ctx;
  }

  // Build proposals
  const allProposals: ProposalItem[] = [];

  for (const entry of changes) {
    const ctx = await getTargetContext(entry);

    // Fall back to the lock file's targetId for entries staged before the fix
    // where resolveDeployedContext couldn't resolve it (e.g. no git provider configured).
    if (!entry.targetId && ctx.lockFile?.targetId) {
      entry.targetId = ctx.lockFile.targetId;
    }

    if (entry.changeType === 'created') {
      switch (entry.artifactType) {
        case 'standard':
          allProposals.push(...buildCreatedStandardProposals(entry));
          break;
        case 'command':
          allProposals.push(...buildCreatedCommandProposals(entry));
          break;
        case 'skill':
          allProposals.push(...buildCreatedSkillProposals(entry));
          break;
      }
    } else if (entry.changeType === 'removed') {
      const artifactId = resolveArtifactIdFromLockFile(
        entry.filePath,
        ctx.lockFile,
      );
      if (!artifactId) {
        logWarningConsole(
          `Skipping "${entry.artifactName}" — artifact not found in lock file.`,
        );
        continue;
      }
      allProposals.push(
        ...buildRemovedProposals(entry, artifactId, ctx.lockFile),
      );
    } else {
      const artifactId = resolveArtifactIdFromLockFile(
        entry.filePath,
        ctx.lockFile,
      );

      if (!artifactId) {
        logWarningConsole(
          `Skipping "${entry.artifactName}" — artifact not found in lock file. Try running a deploy first.`,
        );
        continue;
      }

      const deployedContent = findDeployedContentForPath(
        entry.filePath,
        ctx.deployedFiles,
      );

      if (
        !deployedContent &&
        (entry.artifactType === 'standard' || entry.artifactType === 'command')
      ) {
        logWarningConsole(
          `Skipping "${entry.artifactName}" — deployed content unavailable. Run \`packmind pull\` to sync before submitting updates.`,
        );
        continue;
      }

      switch (entry.artifactType) {
        case 'standard':
          allProposals.push(
            ...buildUpdatedStandardProposals(
              entry,
              artifactId,
              deployedContent,
            ),
          );
          break;
        case 'command':
          allProposals.push(
            ...buildUpdatedCommandProposals(entry, artifactId, deployedContent),
          );
          break;
        case 'skill':
          allProposals.push(
            ...buildUpdatedSkillProposals(entry, artifactId, ctx.deployedFiles),
          );
          break;
      }
    }
  }

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

    const formatCount = (items: unknown[], noun: string): string | null =>
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

  let totalCreated = 0;
  let totalSkipped = 0;
  let hasErrors = false;

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
          const entryCtx = targetContextCache.get(entry.configDir ?? '__cwd__');
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
        hasErrors = true;
        for (const error of response.errors) {
          logErrorConsole(`Error: ${error.message}`);
        }
      }
    } else {
      const filePaths = filePathsBySpaceId.get(spaceId) ?? new Set();
      for (const filePath of filePaths) {
        playbookLocalRepository.removeChange(filePath, spaceId);
      }

      // Delete local files for removed entries
      const removedEntries = changes.filter(
        (c) => c.changeType === 'removed' && filePaths.has(c.filePath),
      );
      for (const entry of removedEntries) {
        const entryCtx = targetContextCache.get(entry.configDir ?? '__cwd__');
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

  if (hasErrors) {
    if (totalCreated > 0) {
      logWarningConsole(
        `Partially submitted: ${totalCreated} succeeded, some failed`,
      );
    } else {
      logErrorConsole('Proposals failed to submit');
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
