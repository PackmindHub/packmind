import {
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  isExpectedChangeProposalType,
  Skill,
  SkillFile,
  SkillFileId,
  SkillFileContentUpdatePayload,
  SkillChangeProposalApplier,
  SkillVersionWithFiles,
  DiffService,
  createSkillFileId,
  createSkillVersionId,
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
 * Uses the shared SkillChangeProposalApplier for scalar field
 * computation (including diff-based description/prompt merging),
 * while handling file operations manually for frontend-specific tracking.
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

  // Use shared applier for scalar field computation
  const sourceVersion: SkillVersionWithFiles = {
    id: files[0]?.skillVersionId ?? createSkillVersionId(''),
    skillId: skill.id,
    version: skill.version,
    userId: skill.userId,
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    prompt: skill.prompt,
    license: skill.license,
    compatibility: skill.compatibility,
    metadata: skill.metadata,
    allowedTools: skill.allowedTools,
    files: [...files],
  };

  const applier = new SkillChangeProposalApplier(new DiffService());
  const appliedResult = applier.applyChangeProposals(
    sourceVersion,
    sortedProposals,
  );

  // Take scalar values from the applier
  const finalName = appliedResult.name;
  const finalDescription = appliedResult.description;
  const finalPrompt = appliedResult.prompt;
  const finalLicense = appliedResult.license;
  const finalCompatibility = appliedResult.compatibility;
  const finalAllowedTools = appliedResult.allowedTools;
  const finalMetadata = appliedResult.metadata;

  // Build scalar change tracker
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

  trackScalarChange(
    changes,
    'name',
    originalName,
    finalName,
    sortedProposals,
    ChangeProposalType.updateSkillName,
  );
  trackScalarChange(
    changes,
    'description',
    originalDescription,
    finalDescription,
    sortedProposals,
    ChangeProposalType.updateSkillDescription,
  );
  trackScalarChange(
    changes,
    'prompt',
    originalPrompt,
    finalPrompt,
    sortedProposals,
    ChangeProposalType.updateSkillPrompt,
  );
  trackScalarChange(
    changes,
    'license',
    originalLicense,
    finalLicense ?? '',
    sortedProposals,
    ChangeProposalType.updateSkillLicense,
  );
  trackScalarChange(
    changes,
    'compatibility',
    originalCompatibility,
    finalCompatibility ?? '',
    sortedProposals,
    ChangeProposalType.updateSkillCompatibility,
  );
  trackScalarChange(
    changes,
    'allowedTools',
    originalAllowedTools,
    finalAllowedTools ?? '',
    sortedProposals,
    ChangeProposalType.updateSkillAllowedTools,
  );
  trackScalarChange(
    changes,
    'metadata',
    originalMetadata,
    finalMetadata ? JSON.stringify(finalMetadata) : '',
    sortedProposals,
    ChangeProposalType.updateSkillMetadata,
  );

  // Handle file operations manually for frontend-specific tracking
  let currentFiles = [...files];

  for (const proposal of sortedProposals) {
    if (
      isExpectedChangeProposalType(proposal, ChangeProposalType.addSkillFile)
    ) {
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

    if (
      isExpectedChangeProposalType(
        proposal,
        ChangeProposalType.updateSkillFileContent,
      )
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

    if (
      isExpectedChangeProposalType(
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

    if (
      isExpectedChangeProposalType(proposal, ChangeProposalType.deleteSkillFile)
    ) {
      const payload = proposal.payload as CollectionItemDeletePayload<
        Omit<SkillFile, 'skillVersionId'>
      >;
      const targetId = payload.targetId;
      currentFiles = currentFiles.filter((f) => f.id !== targetId);
      changes.files.deleted.set(targetId, proposal.id);

      // If this file was previously added in this session, cancel both out
      const addedPath = [...changes.files.added.entries()].find(([, pId]) => {
        const addProposal = sortedProposals.find((p) => p.id === pId);
        if (
          addProposal &&
          isExpectedChangeProposalType(
            addProposal,
            ChangeProposalType.addSkillFile,
          )
        ) {
          const addPayload = addProposal.payload as CollectionItemAddPayload<
            Omit<SkillFile, 'id' | 'skillVersionId'>
          >;
          return addPayload.item.path === payload.item.path;
        }
        return false;
      });
      if (addedPath) {
        changes.files.added.delete(addedPath[0]);
        changes.files.deleted.delete(targetId);
      }
    }
  }

  return {
    name: finalName,
    description: finalDescription,
    prompt: finalPrompt,
    license: finalLicense,
    compatibility: finalCompatibility,
    allowedTools: finalAllowedTools,
    metadata: finalMetadata,
    files: currentFiles,
    changes,
  };
}

type ScalarField =
  | 'name'
  | 'description'
  | 'prompt'
  | 'license'
  | 'compatibility'
  | 'allowedTools'
  | 'metadata';

function trackScalarChange(
  changes: SkillChangeTracker,
  field: ScalarField,
  originalValue: string,
  finalValue: string,
  proposals: ChangeProposalWithConflicts[],
  proposalType: ChangeProposalType,
): void {
  const proposalIds = proposals
    .filter((p) => p.type === proposalType)
    .map((p) => p.id);
  if (proposalIds.length > 0) {
    changes[field] = { originalValue, finalValue, proposalIds };
  }
}
