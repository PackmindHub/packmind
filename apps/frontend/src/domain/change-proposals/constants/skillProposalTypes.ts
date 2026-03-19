import { ChangeProposalType } from '@packmind/types';

export const SCALAR_SKILL_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
]);

export const FRONTMATTER_SKILL_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
]);

export const SKILL_MD_MARKDOWN_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
]);
