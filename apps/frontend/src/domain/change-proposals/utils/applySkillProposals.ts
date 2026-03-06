import {
  ChangeProposalId,
  ChangeProposalType,
  isExpectedChangeProposalType,
  Skill,
  SkillFile,
  SkillFileId,
  SkillChangeProposalApplier,
  SkillVersionWithFiles,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  FieldChange,
  PREVIEW_SKILL_VERSION_ID,
  trackScalarChange,
} from './changeProposalHelpers';

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
 * Uses the shared SkillChangeProposalApplier for all field computation
 * (scalars + files), then builds tracking maps in a pure second pass.
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
    id: files[0]?.skillVersionId ?? PREVIEW_SKILL_VERSION_ID,
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

  // Build file change tracking in a second pass over proposals
  // (the shared applier already computed appliedResult.files)
  for (const proposal of sortedProposals) {
    if (
      isExpectedChangeProposalType(proposal, ChangeProposalType.addSkillFile)
    ) {
      changes.files.added.set(proposal.payload.item.path, proposal.id);
    }

    if (
      isExpectedChangeProposalType(
        proposal,
        ChangeProposalType.updateSkillFileContent,
      )
    ) {
      const targetId = proposal.payload.targetId;

      const existing = changes.files.updatedContent.get(targetId);
      if (!existing) {
        const originalFile = files.find((f) => f.id === targetId);
        const finalFile = appliedResult.files.find((f) => f.id === targetId);
        changes.files.updatedContent.set(targetId, {
          originalValue: originalFile?.content ?? '',
          finalValue: finalFile?.content ?? '',
          proposalIds: [proposal.id],
        });
      } else {
        existing.proposalIds.push(proposal.id);
      }
    }

    if (
      isExpectedChangeProposalType(
        proposal,
        ChangeProposalType.updateSkillFilePermissions,
      )
    ) {
      const targetId = proposal.payload.targetId;

      const existing = changes.files.updatedPermissions.get(targetId);
      if (!existing) {
        const originalFile = files.find((f) => f.id === targetId);
        const finalFile = appliedResult.files.find((f) => f.id === targetId);
        changes.files.updatedPermissions.set(targetId, {
          originalValue: originalFile?.permissions ?? '',
          finalValue: finalFile?.permissions ?? '',
          proposalIds: [proposal.id],
        });
      } else {
        existing.proposalIds.push(proposal.id);
      }
    }

    if (
      isExpectedChangeProposalType(proposal, ChangeProposalType.deleteSkillFile)
    ) {
      const targetId = proposal.payload.targetId;
      changes.files.deleted.set(targetId, proposal.id);

      // If this file was previously added in this session, cancel both out
      const addedPath = proposal.payload.item.path;
      if (changes.files.added.has(addedPath)) {
        changes.files.added.delete(addedPath);
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
    files: appliedResult.files,
    changes,
  };
}
