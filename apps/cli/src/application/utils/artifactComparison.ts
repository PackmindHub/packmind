import { serializeSkillMetadata } from '@packmind/node-utils';
import {
  ChangeProposalType,
  canonicalJsonStringify,
  createRuleId,
  RuleId,
} from '@packmind/types';

import { parseCommandFile } from './parseCommandFile';
import { parseStandardMd } from './parseStandardMd';
import { matchUpdatedRules } from './ruleSimilarity';
import { logWarningConsole } from '../../infra/utils/consoleLogger';

const RULE_LABEL_MAX_LENGTH = 60;

function truncateRule(content: string): string {
  return content.length > RULE_LABEL_MAX_LENGTH
    ? `${content.slice(0, RULE_LABEL_MAX_LENGTH)}...`
    : content;
}

export type FieldChange = {
  type: ChangeProposalType;
  payload: unknown;
};

export type SkillDefinitionInput = {
  name: string;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
  metadata?: Record<string, unknown>;
  additionalProperties?: Record<string, unknown>;
};

/**
 * Maps a deployed rule's content to its server-side id.
 *
 * `deleteRule` and `updateRule` proposals are applied by matching
 * `payload.targetId` against the rule's real id, so a proposal built without
 * one silently applies to nothing. The caller fetches the ids; passing the map
 * is optional so that callers which only display a diff stay synchronous.
 */
export type RuleIdsByContent = ReadonlyMap<string, string>;

/**
 * Stands in for a rule id that could not be resolved. It matches no rule, so a
 * proposal carrying it is applied to nothing; callers that asked for ids treat
 * its presence as a failure rather than shipping it.
 */
export const UNRESOLVED_RULE_ID = 'unresolved';

export function compareStandardFields(
  localContent: string,
  deployedContent: string,
  filePath: string,
  ruleIdsByContent?: RuleIdsByContent,
): FieldChange[] {
  const localParsed = parseStandardMd(localContent, filePath);
  const serverParsed = parseStandardMd(deployedContent, filePath);

  if (!localParsed || !serverParsed) return [];

  const changes: FieldChange[] = [];

  if (
    serverParsed.frontmatterName &&
    localParsed.frontmatterName &&
    serverParsed.frontmatterName !== localParsed.frontmatterName
  ) {
    changes.push({
      type: ChangeProposalType.updateStandardName,
      payload: {
        oldValue: serverParsed.frontmatterName,
        newValue: localParsed.frontmatterName,
      },
    });
  }

  if (serverParsed.name !== localParsed.name) {
    changes.push({
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
    changes.push({
      type: ChangeProposalType.updateStandardDescription,
      payload: {
        oldValue: serverParsed.frontmatterDescription,
        newValue: localParsed.frontmatterDescription,
      },
    });
  }

  if (serverParsed.description !== localParsed.description) {
    changes.push({
      type: ChangeProposalType.updateStandardDescription,
      payload: {
        oldValue: serverParsed.description,
        newValue: localParsed.description,
      },
    });
  }

  if (serverParsed.scope !== localParsed.scope) {
    changes.push({
      type: ChangeProposalType.updateStandardScope,
      payload: {
        oldValue: serverParsed.scope,
        newValue: localParsed.scope,
      },
    });
  }

  const serverRules = new Set(serverParsed.rules);
  const localRules = new Set(localParsed.rules);
  const deletedRules = [...serverRules].filter((r) => !localRules.has(r));
  const addedRules = [...localRules].filter((r) => !serverRules.has(r));

  const { updates, remainingDeleted, remainingAdded } = matchUpdatedRules(
    deletedRules,
    addedRules,
  );

  // The placeholder kept for callers that supply no ids matches no rule, so
  // the change it names is applied to nothing. A caller that did supply ids
  // and still missed one is warned, rather than left to read a success line
  // for a change that was dropped.
  const resolveRuleId = (content: string, changeLabel: string): RuleId => {
    const resolved = ruleIdsByContent?.get(content);
    if (resolved) return createRuleId(resolved);

    if (ruleIdsByContent) {
      logWarningConsole(
        `Could not resolve the rule "${truncateRule(content)}" in ${filePath} to a known rule; its ${changeLabel} may not be applied.`,
      );
    }
    return createRuleId(UNRESOLVED_RULE_ID);
  };

  for (const update of updates) {
    const ruleId = resolveRuleId(update.oldValue, 'update');
    changes.push({
      type: ChangeProposalType.updateRule,
      payload: {
        targetId: ruleId,
        oldValue: update.oldValue,
        newValue: update.newValue,
      },
    });
  }

  for (const rule of remainingDeleted) {
    const ruleId = resolveRuleId(rule, 'removal');
    changes.push({
      type: ChangeProposalType.deleteRule,
      payload: {
        targetId: ruleId,
        item: { id: ruleId, content: rule },
      },
    });
  }

  for (const rule of remainingAdded) {
    changes.push({
      type: ChangeProposalType.addRule,
      payload: {
        item: { content: rule },
      },
    });
  }

  return changes;
}

export function compareCommandFields(
  localContent: string,
  deployedContent: string,
  filePath: string,
): FieldChange[] {
  const localParsed = parseCommandFile(localContent, filePath);
  if (!localParsed.success) return [];

  const serverParsed = parseCommandFile(deployedContent, filePath);
  if (!serverParsed.success) return [];

  const changes: FieldChange[] = [];

  if (serverParsed.parsed.name !== localParsed.parsed.name) {
    changes.push({
      type: ChangeProposalType.updateCommandName,
      payload: {
        oldValue: serverParsed.parsed.name,
        newValue: localParsed.parsed.name,
      },
    });
  }

  if (serverParsed.parsed.content !== localParsed.parsed.content) {
    changes.push({
      type: ChangeProposalType.updateCommandDescription,
      payload: {
        oldValue: serverParsed.parsed.content,
        newValue: localParsed.parsed.content,
      },
    });
  }

  return changes;
}

export function compareSkillDefinitionFields(
  local: SkillDefinitionInput,
  deployed: {
    name: string;
    description: string;
    body: string;
    license: string;
    compatibility: string;
    allowedTools: string;
    metadataJson: string;
    additionalProperties: Record<string, string>;
  },
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (local.name !== deployed.name) {
    changes.push({
      type: ChangeProposalType.updateSkillName,
      payload: { oldValue: deployed.name, newValue: local.name },
    });
  }

  if (local.description !== deployed.description) {
    changes.push({
      type: ChangeProposalType.updateSkillDescription,
      payload: { oldValue: deployed.description, newValue: local.description },
    });
  }

  if (local.prompt !== deployed.body) {
    changes.push({
      type: ChangeProposalType.updateSkillPrompt,
      payload: { oldValue: deployed.body, newValue: local.prompt },
    });
  }

  const localLicense = local.license ?? '';
  if (localLicense !== deployed.license) {
    changes.push({
      type: ChangeProposalType.updateSkillLicense,
      payload: { oldValue: deployed.license, newValue: localLicense },
    });
  }

  const localCompatibility = local.compatibility ?? '';
  if (localCompatibility !== deployed.compatibility) {
    changes.push({
      type: ChangeProposalType.updateSkillCompatibility,
      payload: {
        oldValue: deployed.compatibility,
        newValue: localCompatibility,
      },
    });
  }

  const localAllowedTools = local.allowedTools ?? '';
  if (localAllowedTools !== deployed.allowedTools) {
    changes.push({
      type: ChangeProposalType.updateSkillAllowedTools,
      payload: {
        oldValue: deployed.allowedTools,
        newValue: localAllowedTools,
      },
    });
  }

  const localMetadataJson =
    local.metadata && Object.keys(local.metadata).length > 0
      ? serializeSkillMetadata(local.metadata)
      : '{}';
  if (localMetadataJson !== deployed.metadataJson) {
    changes.push({
      type: ChangeProposalType.updateSkillMetadata,
      payload: {
        oldValue: deployed.metadataJson,
        newValue: localMetadataJson,
      },
    });
  }

  // Additional properties (Claude Code specific fields)
  const localAdditionalProps = local.additionalProperties ?? {};
  const deployedAdditionalProps = deployed.additionalProperties;
  const allKeys = new Set([
    ...Object.keys(localAdditionalProps),
    ...Object.keys(deployedAdditionalProps),
  ]);
  for (const key of allKeys) {
    const localValue =
      key in localAdditionalProps
        ? canonicalJsonStringify(localAdditionalProps[key])
        : '';
    // Matches canonicalJsonStringify(null) for properties present in deployed but absent locally
    const deployedValue = deployedAdditionalProps[key] ?? 'null';
    if (localValue !== deployedValue) {
      changes.push({
        type: ChangeProposalType.updateSkillAdditionalProperty,
        payload: {
          targetId: key,
          oldValue: deployedValue,
          newValue: localValue,
        },
      });
    }
  }

  return changes;
}
