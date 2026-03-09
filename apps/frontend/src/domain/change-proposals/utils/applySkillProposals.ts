import {
  ChangeProposalConflictError,
  ChangeProposalId,
  Skill,
  SkillFile,
  SkillChangeProposalApplier,
  SkillVersionWithFiles,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { PREVIEW_SKILL_VERSION_ID } from './changeProposalHelpers';

export interface AppliedSkill {
  name: string;
  description: string;
  prompt: string;
  license: string | undefined;
  compatibility: string | undefined;
  allowedTools: string | undefined;
  metadata: Record<string, string> | undefined;
  files: SkillFile[];
}

/**
 * Applies all accepted change proposals sequentially to a skill.
 *
 * Uses the shared SkillChangeProposalApplier for all field computation
 * (scalars + files).
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

  try {
    const appliedResult = applier.applyChangeProposals(
      sourceVersion,
      sortedProposals,
    );

    return {
      name: appliedResult.name,
      description: appliedResult.description,
      prompt: appliedResult.prompt,
      license: appliedResult.license,
      compatibility: appliedResult.compatibility,
      allowedTools: appliedResult.allowedTools,
      metadata: appliedResult.metadata,
      files: appliedResult.files,
    };
  } catch (error) {
    if (error instanceof ChangeProposalConflictError) {
      return {
        name: skill.name,
        description: skill.description,
        prompt: skill.prompt,
        license: skill.license,
        compatibility: skill.compatibility,
        allowedTools: skill.allowedTools,
        metadata: skill.metadata,
        files: [...files],
      };
    }
    throw error;
  }
}
