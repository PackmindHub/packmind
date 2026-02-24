import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  Skill,
  SkillFile,
  SkillFileId,
  SkillFileContentUpdatePayload,
  createSkillFileId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { FieldChange } from './applyStandardProposals';

export interface FileChange {
  added: Map<string, ChangeProposalId>;
  updatedContent: Map<SkillFileId, FieldChange>;
  updatedPermissions: Map<SkillFileId, FieldChange>;
  deleted: Map<SkillFileId, ChangeProposalId>;
}

export interface SkillChangeTracker {
  name?: FieldChange;
  description?: FieldChange;
  prompt?: FieldChange;
  license?: FieldChange;
  compatibility?: FieldChange;
  allowedTools?: FieldChange;
  metadata?: FieldChange;
  files: FileChange;
}

export interface AppliedSkill {
  name: string;
  description: string;
  prompt: string;
  license: string | undefined;
  compatibility: string | undefined;
  allowedTools: string | undefined;
  metadata: Record<string, string> | undefined;
  files: SkillFile[];
  changes: SkillChangeTracker;
}

/**
 * Applies all accepted change proposals sequentially to a skill,
 * tracking all changes for highlighting in the unified view.
 *
 * This replicates the backend SkillChangeProposalsApplier logic
 * for frontend preview purposes.
 */
export function applySkillProposals(
  skill: Skill,
  files: SkillFile[],
  proposals: ChangeProposalWithConflicts[],
  acceptedIds: Set<ChangeProposalId>,
): AppliedSkill {
  const acceptedProposals = proposals.filter((p) => acceptedIds.has(p.id));

  const sortedProposals = [...acceptedProposals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let currentName = skill.name;
  let currentDescription = skill.description;
  let currentPrompt = skill.prompt;
  let currentLicense = skill.license;
  let currentCompatibility = skill.compatibility;
  let currentAllowedTools = skill.allowedTools;
  let currentMetadata = skill.metadata;
  let currentFiles = [...files];

  const originalName = skill.name;
  const originalDescription = skill.description;
  const originalPrompt = skill.prompt;
  const originalLicense = skill.license ?? '';
  const originalCompatibility = skill.compatibility ?? '';
  const originalAllowedTools = skill.allowedTools ?? '';
  const originalMetadata = skill.metadata ? JSON.stringify(skill.metadata) : '';

  const changes: SkillChangeTracker = {
    files: {
      added: new Map(),
      updatedContent: new Map(),
      updatedPermissions: new Map(),
      deleted: new Map(),
    },
  };

  for (const proposal of sortedProposals) {
    switch (proposal.type) {
      case ChangeProposalType.updateSkillName: {
        if (isExpectedType(proposal, ChangeProposalType.updateSkillName)) {
          currentName = proposal.payload.newValue;
          changes.name = trackScalarChange(
            changes.name,
            originalName,
            currentName,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillDescription: {
        if (
          isExpectedType(proposal, ChangeProposalType.updateSkillDescription)
        ) {
          currentDescription = proposal.payload.newValue;
          changes.description = trackScalarChange(
            changes.description,
            originalDescription,
            currentDescription,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillPrompt: {
        if (isExpectedType(proposal, ChangeProposalType.updateSkillPrompt)) {
          currentPrompt = proposal.payload.newValue;
          changes.prompt = trackScalarChange(
            changes.prompt,
            originalPrompt,
            currentPrompt,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillLicense: {
        if (isExpectedType(proposal, ChangeProposalType.updateSkillLicense)) {
          currentLicense = proposal.payload.newValue || undefined;
          changes.license = trackScalarChange(
            changes.license,
            originalLicense,
            proposal.payload.newValue,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillCompatibility: {
        if (
          isExpectedType(proposal, ChangeProposalType.updateSkillCompatibility)
        ) {
          currentCompatibility = proposal.payload.newValue || undefined;
          changes.compatibility = trackScalarChange(
            changes.compatibility,
            originalCompatibility,
            proposal.payload.newValue,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillAllowedTools: {
        if (
          isExpectedType(proposal, ChangeProposalType.updateSkillAllowedTools)
        ) {
          currentAllowedTools = proposal.payload.newValue || undefined;
          changes.allowedTools = trackScalarChange(
            changes.allowedTools,
            originalAllowedTools,
            proposal.payload.newValue,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.updateSkillMetadata: {
        if (isExpectedType(proposal, ChangeProposalType.updateSkillMetadata)) {
          try {
            currentMetadata = JSON.parse(proposal.payload.newValue) as Record<
              string,
              string
            >;
          } catch {
            currentMetadata = undefined;
          }
          changes.metadata = trackScalarChange(
            changes.metadata,
            originalMetadata,
            proposal.payload.newValue,
            proposal.id,
          );
        }
        break;
      }

      case ChangeProposalType.addSkillFile: {
        if (isExpectedType(proposal, ChangeProposalType.addSkillFile)) {
          const addedFile = (
            proposal.payload as CollectionItemAddPayload<
              Omit<SkillFile, 'id' | 'skillVersionId'>
            >
          ).item;
          const newFile: SkillFile = {
            ...addedFile,
            id: createSkillFileId(''),
            skillVersionId: files[0]?.skillVersionId ?? ('' as never),
          };
          currentFiles = [...currentFiles, newFile];
          changes.files.added.set(addedFile.path, proposal.id);
        }
        break;
      }

      case ChangeProposalType.updateSkillFileContent: {
        if (
          isExpectedType(proposal, ChangeProposalType.updateSkillFileContent)
        ) {
          const payload = proposal.payload as SkillFileContentUpdatePayload;
          const targetId = payload.targetId;
          const fileIndex = currentFiles.findIndex((f) => f.id === targetId);

          if (fileIndex !== -1) {
            const originalContent = currentFiles[fileIndex].content;
            currentFiles = currentFiles.map((f) =>
              f.id === targetId ? { ...f, content: payload.newValue } : f,
            );

            const existing = changes.files.updatedContent.get(targetId);
            if (!existing) {
              changes.files.updatedContent.set(targetId, {
                originalValue: originalContent,
                finalValue: payload.newValue,
                proposalIds: [proposal.id],
              });
            } else {
              existing.finalValue = payload.newValue;
              existing.proposalIds.push(proposal.id);
            }
          }
        }
        break;
      }

      case ChangeProposalType.updateSkillFilePermissions: {
        if (
          isExpectedType(
            proposal,
            ChangeProposalType.updateSkillFilePermissions,
          )
        ) {
          const payload =
            proposal.payload as CollectionItemUpdatePayload<SkillFileId>;
          const targetId = payload.targetId;
          const fileIndex = currentFiles.findIndex((f) => f.id === targetId);

          if (fileIndex !== -1) {
            const originalPermissions = currentFiles[fileIndex].permissions;
            currentFiles = currentFiles.map((f) =>
              f.id === targetId ? { ...f, permissions: payload.newValue } : f,
            );

            const existing = changes.files.updatedPermissions.get(targetId);
            if (!existing) {
              changes.files.updatedPermissions.set(targetId, {
                originalValue: originalPermissions,
                finalValue: payload.newValue,
                proposalIds: [proposal.id],
              });
            } else {
              existing.finalValue = payload.newValue;
              existing.proposalIds.push(proposal.id);
            }
          }
        }
        break;
      }

      case ChangeProposalType.deleteSkillFile: {
        if (isExpectedType(proposal, ChangeProposalType.deleteSkillFile)) {
          const payload = proposal.payload as CollectionItemDeletePayload<
            Omit<SkillFile, 'skillVersionId'>
          >;
          const targetId = payload.targetId;
          currentFiles = currentFiles.filter((f) => f.id !== targetId);
          changes.files.deleted.set(targetId, proposal.id);

          // If this file was previously added in this session, cancel both out
          const addedPath = [...changes.files.added.entries()].find(
            ([, pId]) => {
              // Find the file that was added - check if the deleted target matches
              const addProposal = sortedProposals.find((p) => p.id === pId);
              if (
                addProposal &&
                isExpectedType(addProposal, ChangeProposalType.addSkillFile)
              ) {
                const addPayload =
                  addProposal.payload as CollectionItemAddPayload<
                    Omit<SkillFile, 'id' | 'skillVersionId'>
                  >;
                return addPayload.item.path === payload.item.path;
              }
              return false;
            },
          );
          if (addedPath) {
            changes.files.added.delete(addedPath[0]);
            changes.files.deleted.delete(targetId);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  return {
    name: currentName,
    description: currentDescription,
    prompt: currentPrompt,
    license: currentLicense,
    compatibility: currentCompatibility,
    allowedTools: currentAllowedTools,
    metadata: currentMetadata,
    files: currentFiles,
    changes,
  };
}

function trackScalarChange(
  existing: FieldChange | undefined,
  originalValue: string,
  finalValue: string,
  proposalId: ChangeProposalId,
): FieldChange {
  if (!existing) {
    return { originalValue, finalValue, proposalIds: [proposalId] };
  }
  existing.finalValue = finalValue;
  existing.proposalIds.push(proposalId);
  return existing;
}

function isExpectedType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
