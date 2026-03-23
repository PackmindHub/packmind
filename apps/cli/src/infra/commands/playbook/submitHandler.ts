import * as path from 'path';
import * as yaml from 'yaml';

import {
  ArtifactVersionEntry,
  ChangeProposalArtefactId,
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  FileModification,
  SpaceId,
  TargetId,
  createRuleId,
} from '@packmind/types';

import { parseStandardMd } from '../../../application/utils/parseStandardMd';
import { parseLenientStandard } from '../../../application/utils/parseLenientStandard';
import { parseCommandFile } from '../../../application/utils/parseCommandFile';
import { matchUpdatedRules } from '../../../application/utils/ruleSimilarity';
import { normalizePath } from '../../../application/utils/pathUtils';
import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import {
  logConsole,
  logErrorConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
} from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../../domain/repositories/PackmindLockFile';

export type PlaybookSubmitHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
  cwd: string;
  exit: (code: number) => void;
  message: string | undefined;
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

  const lenient = parseLenientStandard(entry.content, entry.filePath);
  if (lenient) {
    return [
      {
        type: ChangeProposalType.createStandard,
        artefactId: null,
        payload: {
          name: lenient.name,
          description: lenient.description,
          scope: '',
          rules: [],
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

  const localParsed = parseStandardMd(entry.content, entry.filePath);
  if (!localParsed) return [];

  const serverParsed = deployedContent
    ? parseStandardMd(deployedContent, entry.filePath)
    : null;

  const proposals: ProposalItem[] = [];
  const base = {
    artefactId: artifactId,
    targetId: entry.targetId,
    spaceId: entry.spaceId,
  };

  if (serverParsed) {
    if (
      serverParsed.frontmatterName &&
      localParsed.frontmatterName &&
      serverParsed.frontmatterName !== localParsed.frontmatterName
    ) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateStandardName,
        payload: {
          oldValue: serverParsed.frontmatterName,
          newValue: localParsed.frontmatterName,
        },
      });
    }

    if (serverParsed.name !== localParsed.name) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateStandardName,
        payload: {
          oldValue: serverParsed.name,
          newValue: localParsed.name,
        },
      });
    }

    if (
      serverParsed.frontmatterDescription &&
      localParsed.frontmatterDescription &&
      serverParsed.frontmatterDescription !== localParsed.frontmatterDescription
    ) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateStandardDescription,
        payload: {
          oldValue: serverParsed.frontmatterDescription,
          newValue: localParsed.frontmatterDescription,
        },
      });
    }

    if (serverParsed.description !== localParsed.description) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateStandardDescription,
        payload: {
          oldValue: serverParsed.description,
          newValue: localParsed.description,
        },
      });
    }

    if (serverParsed.scope !== localParsed.scope) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateStandardScope,
        payload: {
          oldValue: serverParsed.scope,
          newValue: localParsed.scope,
        },
      });
    }
  }

  const serverRules = new Set(serverParsed?.rules ?? []);
  const localRules = new Set(localParsed.rules);
  const deletedRules = [...serverRules].filter((r) => !localRules.has(r));
  const addedRules = [...localRules].filter((r) => !serverRules.has(r));

  const { updates, remainingDeleted, remainingAdded } = matchUpdatedRules(
    deletedRules,
    addedRules,
  );

  for (const update of updates) {
    const ruleId = createRuleId('unresolved');
    proposals.push({
      ...base,
      type: ChangeProposalType.updateRule,
      payload: {
        targetId: ruleId,
        oldValue: update.oldValue,
        newValue: update.newValue,
      },
    });
  }

  for (const rule of remainingDeleted) {
    const ruleId = createRuleId('unresolved');
    proposals.push({
      ...base,
      type: ChangeProposalType.deleteRule,
      payload: {
        targetId: ruleId,
        item: { id: ruleId, content: rule },
      },
    });
  }

  for (const rule of remainingAdded) {
    proposals.push({
      ...base,
      type: ChangeProposalType.addRule,
      payload: {
        item: { content: rule },
      },
    });
  }

  return proposals;
}

function buildUpdatedCommandProposals(
  entry: PlaybookChangeEntry,
  artifactId: string | null,
  deployedContent: string | null,
): ProposalItem[] {
  if (!artifactId) return [];

  const localParsed = parseCommandFile(entry.content, entry.filePath);
  if (!localParsed.success) return [];

  const serverParsed = deployedContent
    ? parseCommandFile(deployedContent, entry.filePath)
    : null;

  const proposals: ProposalItem[] = [];
  const base = {
    artefactId: artifactId,
    targetId: entry.targetId,
    spaceId: entry.spaceId,
  };

  if (serverParsed?.success) {
    if (serverParsed.parsed.name !== localParsed.parsed.name) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateCommandName,
        payload: {
          oldValue: serverParsed.parsed.name,
          newValue: localParsed.parsed.name,
        },
      });
    }

    if (serverParsed.parsed.content !== localParsed.parsed.content) {
      proposals.push({
        ...base,
        type: ChangeProposalType.updateCommandDescription,
        payload: {
          oldValue: serverParsed.parsed.content,
          newValue: localParsed.parsed.content,
        },
      });
    }
  }

  return proposals;
}

function buildUpdatedSkillProposals(
  entry: PlaybookChangeEntry,
  artifactId: string | null,
): ProposalItem[] {
  if (!artifactId) return [];

  return [
    {
      type: ChangeProposalType.updateSkillFileContent,
      artefactId: artifactId,
      payload: {
        targetId: artifactId,
        oldValue: '',
        newValue: entry.content,
      },
      targetId: entry.targetId,
      spaceId: entry.spaceId,
    },
  ];
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

function lockFileToArtifactVersionEntries(
  lockFile: PackmindLockFile,
): ArtifactVersionEntry[] {
  return Object.values(lockFile.artifacts).map((entry) => ({
    name: entry.name,
    type: entry.type,
    id: entry.id,
    version: entry.version,
    spaceId: entry.spaceId,
  }));
}

async function fetchDeployedFiles(
  packmindCliHexa: PackmindCliHexa,
  lockFile: PackmindLockFile,
): Promise<FileModification[]> {
  try {
    const artifacts = lockFileToArtifactVersionEntries(lockFile);
    const response = await packmindCliHexa
      .getPackmindGateway()
      .deployment.getContentByVersions({
        artifacts,
        agents: lockFile.agents,
      });
    return response.fileUpdates.createOrUpdate;
  } catch {
    return [];
  }
}

function findDeployedContentForPath(
  filePath: string,
  deployedFiles: FileModification[],
): string | null {
  const normalized = normalizePath(filePath);
  const match = deployedFiles.find((f) => normalizePath(f.path) === normalized);
  return match?.content ?? null;
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

  // Read lock file and fetch deployed content by artifact versions
  const projectDir = await findNearestConfigDir(cwd, packmindCliHexa);
  const lockFile = projectDir
    ? await lockFileRepository.read(projectDir)
    : null;
  const deployedFiles =
    lockFile && Object.keys(lockFile.artifacts).length > 0
      ? await fetchDeployedFiles(packmindCliHexa, lockFile)
      : [];

  // Build proposals
  const allProposals: ProposalItem[] = [];

  for (const entry of changes) {
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
        lockFile,
      );
      if (!artifactId) {
        logWarningConsole(
          `Skipping "${entry.artifactName}" — artifact not found in lock file.`,
        );
        continue;
      }
      allProposals.push(...buildRemovedProposals(entry, artifactId, lockFile));
    } else {
      const artifactId = resolveArtifactIdFromLockFile(
        entry.filePath,
        lockFile,
      );

      if (!artifactId) {
        logWarningConsole(
          `Skipping "${entry.artifactName}" — artifact not found in lock file. Try running a deploy first.`,
        );
        continue;
      }

      const deployedContent = findDeployedContentForPath(
        entry.filePath,
        deployedFiles,
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
          allProposals.push(...buildUpdatedSkillProposals(entry, artifactId));
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
  let totalCreated = 0;
  let totalSkipped = 0;
  let hasErrors = false;

  for (const [spaceId, proposals] of proposalsBySpaceId) {
    const response = await packmindGateway.changeProposals.batchCreate({
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
        if (projectDir) {
          const removedEntries = spaceChanges.filter(
            (c) => c.changeType === 'removed',
          );
          for (const entry of removedEntries) {
            try {
              const fullPath = path.join(projectDir, entry.filePath);
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
      if (projectDir) {
        const removedEntries = changes.filter(
          (c) => c.changeType === 'removed' && filePaths.has(c.filePath),
        );
        for (const entry of removedEntries) {
          try {
            const fullPath = path.join(projectDir, entry.filePath);
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
