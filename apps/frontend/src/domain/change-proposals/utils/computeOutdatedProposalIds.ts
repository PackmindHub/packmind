import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  Recipe,
  Rule,
  ScalarUpdatePayload,
  Skill,
  SkillFile,
  SkillFileId,
  Standard,
} from '@packmind/types';

/**
 * Deterministic JSON serialization of skill metadata.
 * Keep in sync with packages/node-utils/src/skillMd/parseSkillMdContent.ts#serializeSkillMetadata
 */
function serializeSkillMetadata(fields: Record<string, unknown>): string {
  const sorted = Object.keys(fields)
    .sort((a, b) => a.localeCompare(b))
    .reduce(
      (acc, key) => {
        acc[key] = fields[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );
  return JSON.stringify(sorted);
}

// --- Skill field mappings (mirrors backend SkillChangeProposalValidator) ---

type ScalarSkillType =
  | ChangeProposalType.updateSkillName
  | ChangeProposalType.updateSkillDescription
  | ChangeProposalType.updateSkillPrompt
  | ChangeProposalType.updateSkillMetadata
  | ChangeProposalType.updateSkillLicense
  | ChangeProposalType.updateSkillCompatibility
  | ChangeProposalType.updateSkillAllowedTools;

const SKILL_FIELD_BY_TYPE: Record<ScalarSkillType, (skill: Skill) => string> = {
  [ChangeProposalType.updateSkillName]: (skill) => skill.name,
  [ChangeProposalType.updateSkillDescription]: (skill) => skill.description,
  [ChangeProposalType.updateSkillPrompt]: (skill) => skill.prompt,
  [ChangeProposalType.updateSkillMetadata]: (skill) =>
    skill.metadata != null ? serializeSkillMetadata(skill.metadata) : '{}',
  [ChangeProposalType.updateSkillLicense]: (skill) => skill.license ?? '',
  [ChangeProposalType.updateSkillCompatibility]: (skill) =>
    skill.compatibility ?? '',
  [ChangeProposalType.updateSkillAllowedTools]: (skill) =>
    skill.allowedTools ?? '',
};

const SCALAR_SKILL_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
]);

// --- Standard field mappings (mirrors backend StandardChangeProposalValidator) ---

type ScalarStandardType =
  | ChangeProposalType.updateStandardName
  | ChangeProposalType.updateStandardDescription
  | ChangeProposalType.updateStandardScope;

const STANDARD_FIELD_BY_TYPE: Record<
  ScalarStandardType,
  (standard: Standard) => string
> = {
  [ChangeProposalType.updateStandardName]: (standard) => standard.name,
  [ChangeProposalType.updateStandardDescription]: (standard) =>
    standard.description,
  [ChangeProposalType.updateStandardScope]: (standard) => standard.scope ?? '',
};

const SCALAR_STANDARD_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
]);

// --- Command field mappings (mirrors backend CommandChangeProposalValidator) ---

type ScalarCommandType =
  | ChangeProposalType.updateCommandName
  | ChangeProposalType.updateCommandDescription;

const RECIPE_FIELD_BY_TYPE: Record<
  ScalarCommandType,
  (recipe: Recipe) => string
> = {
  [ChangeProposalType.updateCommandName]: (recipe) => recipe.name,
  [ChangeProposalType.updateCommandDescription]: (recipe) => recipe.content,
};

const SCALAR_COMMAND_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
]);

// --- Compute functions ---

export function computeSkillOutdatedIds(
  proposals: ChangeProposal[],
  skill: Skill | undefined,
  files: SkillFile[],
): Set<ChangeProposalId> {
  const outdated = new Set<ChangeProposalId>();
  if (!skill) return outdated;

  for (const proposal of proposals) {
    if (proposal.artefactVersion === skill.version) continue;

    if (SCALAR_SKILL_TYPES.has(proposal.type)) {
      const payload = proposal.payload as ScalarUpdatePayload;
      const currentValue =
        SKILL_FIELD_BY_TYPE[proposal.type as ScalarSkillType](skill);
      if (payload.oldValue !== currentValue) {
        outdated.add(proposal.id);
      }
      continue;
    }

    if (proposal.type === ChangeProposalType.updateSkillFileContent) {
      const payload =
        proposal.payload as CollectionItemUpdatePayload<SkillFileId>;
      const file = files.find((f) => f.id === payload.targetId);
      if (!file || payload.oldValue !== file.content) {
        outdated.add(proposal.id);
      }
      continue;
    }

    if (proposal.type === ChangeProposalType.updateSkillFilePermissions) {
      const payload =
        proposal.payload as CollectionItemUpdatePayload<SkillFileId>;
      const file = files.find((f) => f.id === payload.targetId);
      if (!file || payload.oldValue !== file.permissions) {
        outdated.add(proposal.id);
      }
      continue;
    }

    if (proposal.type === ChangeProposalType.deleteSkillFile) {
      const payload = proposal.payload as CollectionItemDeletePayload<
        Omit<SkillFile, 'skillVersionId'>
      >;
      const file = files.find((f) => f.id === payload.targetId);
      if (!file || file.content !== payload.item.content) {
        outdated.add(proposal.id);
      }
      continue;
    }

    // addSkillFile → never outdated
  }

  return outdated;
}

export function computeStandardOutdatedIds(
  proposals: ChangeProposal[],
  standard: Standard | undefined,
  rules: Rule[],
): Set<ChangeProposalId> {
  const outdated = new Set<ChangeProposalId>();
  if (!standard) return outdated;

  for (const proposal of proposals) {
    if (proposal.artefactVersion === standard.version) continue;

    if (SCALAR_STANDARD_TYPES.has(proposal.type)) {
      const payload = proposal.payload as ScalarUpdatePayload;
      const currentValue =
        STANDARD_FIELD_BY_TYPE[proposal.type as ScalarStandardType](standard);
      if (payload.oldValue !== currentValue) {
        outdated.add(proposal.id);
      }
      continue;
    }

    if (proposal.type === ChangeProposalType.updateRule) {
      const payload = proposal.payload as CollectionItemUpdatePayload<string>;
      const rule = rules.find((r) => r.id === payload.targetId);
      if (!rule || payload.oldValue !== rule.content) {
        outdated.add(proposal.id);
      }
      continue;
    }

    if (proposal.type === ChangeProposalType.deleteRule) {
      const payload = proposal.payload as CollectionItemDeletePayload<
        Omit<Rule, 'standardVersionId'>
      >;
      const rule = rules.find((r) => r.id === payload.targetId);
      if (!rule || rule.content !== payload.item.content) {
        outdated.add(proposal.id);
      }
      continue;
    }

    // addRule → never outdated
  }

  return outdated;
}

export function computeCommandOutdatedIds(
  proposals: ChangeProposal[],
  recipe: Recipe | undefined,
): Set<ChangeProposalId> {
  const outdated = new Set<ChangeProposalId>();
  if (!recipe) return outdated;

  for (const proposal of proposals) {
    if (proposal.artefactVersion === recipe.version) continue;
    if (!SCALAR_COMMAND_TYPES.has(proposal.type)) continue;

    const payload = proposal.payload as ScalarUpdatePayload;
    const currentValue =
      RECIPE_FIELD_BY_TYPE[proposal.type as ScalarCommandType](recipe);
    if (payload.oldValue !== currentValue) {
      outdated.add(proposal.id);
    }
  }

  return outdated;
}
