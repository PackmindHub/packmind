import * as yaml from 'yaml';
import {
  ChangeProposalType,
  FileModification,
  NewSkillPayload,
} from '@packmind/types';
import { parseSkillMd } from '@packmind/node-utils';
import { parseStandardMd } from '../../../../application/utils/parseStandardMd';
import { parseLenientStandard } from '../../../../application/utils/parseLenientStandard';
import { parseCommandFile } from '../../../../application/utils/parseCommandFile';
import {
  compareStandardFields,
  compareCommandFields,
  compareSkillDefinitionFields,
} from '../../../../application/utils/artifactComparison';
import { normalizePath } from '../../../../application/utils/pathUtils';
import { logWarningConsole } from '../../../utils/consoleLogger';
import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { PackmindLockFile } from '../../../../domain/repositories/PackmindLockFile';
import { TargetContext } from './targetContextResolver';

export type ProposalItem = {
  type: ChangeProposalType;
  artefactId: string | null;
  payload: unknown;
  targetId: string | undefined;
  spaceId: string;
};

export function resolveArtifactIdFromLockFile(
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

export async function buildProposals(
  changes: PlaybookChangeEntry[],
  getTargetContext: (entry: PlaybookChangeEntry) => Promise<TargetContext>,
  noReview: boolean,
): Promise<{
  proposals: ProposalItem[];
  skippedRemovals: PlaybookChangeEntry[];
}> {
  const proposals: ProposalItem[] = [];
  const skippedRemovals: PlaybookChangeEntry[] = [];

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
          proposals.push(...buildCreatedStandardProposals(entry));
          break;
        case 'command':
          proposals.push(...buildCreatedCommandProposals(entry));
          break;
        case 'skill':
          proposals.push(...buildCreatedSkillProposals(entry));
          break;
      }
    } else if (entry.changeType === 'removed') {
      if (noReview) {
        skippedRemovals.push(entry);
        continue;
      }
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
      proposals.push(...buildRemovedProposals(entry, artifactId, ctx.lockFile));
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
          proposals.push(
            ...buildUpdatedStandardProposals(
              entry,
              artifactId,
              deployedContent,
            ),
          );
          break;
        case 'command':
          proposals.push(
            ...buildUpdatedCommandProposals(entry, artifactId, deployedContent),
          );
          break;
        case 'skill':
          proposals.push(
            ...buildUpdatedSkillProposals(entry, artifactId, ctx.deployedFiles),
          );
          break;
      }
    }
  }

  return { proposals, skippedRemovals };
}
