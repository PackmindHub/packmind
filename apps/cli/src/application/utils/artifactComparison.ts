import { ChangeProposalType, createRuleId } from '@packmind/types';

import { parseStandardMd } from './parseStandardMd';
import { matchUpdatedRules } from './ruleSimilarity';

export type FieldChange = {
  type: ChangeProposalType;
  payload: unknown;
};

export function compareStandardFields(
  localContent: string,
  deployedContent: string,
  filePath: string,
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

  for (const update of updates) {
    const ruleId = createRuleId('unresolved');
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
    const ruleId = createRuleId('unresolved');
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
