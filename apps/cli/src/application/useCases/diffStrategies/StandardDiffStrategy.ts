import { ChangeProposalType, createRuleId } from '@packmind/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { parseStandardMd } from '../../utils/parseStandardMd';
import { matchUpdatedRules } from '../../utils/ruleSimilarity';
import { IDiffStrategy } from './IDiffStrategy';
import { DiffableFile } from './DiffableFile';

export class StandardDiffStrategy implements IDiffStrategy {
  supports(file: DiffableFile): boolean {
    return file.artifactType === 'standard';
  }

  async diff(
    file: DiffableFile,
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const fullPath = path.join(baseDirectory, file.path);
    let localContent: string;
    try {
      localContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return [];
    }

    const serverParsed = parseStandardMd(file.content, file.path);
    const localParsed = parseStandardMd(localContent, file.path);

    if (!serverParsed || !localParsed) {
      return [];
    }

    const diffs: ArtefactDiff[] = [];
    const diffBase = {
      filePath: file.path,
      artifactName: file.artifactName,
      artifactType: file.artifactType,
      artifactId: file.artifactId,
      spaceId: file.spaceId,
    };

    if (
      serverParsed.frontmatterName &&
      localParsed.frontmatterName &&
      serverParsed.frontmatterName !== localParsed.frontmatterName
    ) {
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.updateStandardName,
        payload: {
          oldValue: serverParsed.frontmatterName,
          newValue: localParsed.frontmatterName,
        },
      });
    }

    if (serverParsed.name !== localParsed.name) {
      diffs.push({
        ...diffBase,
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
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.updateStandardDescription,
        payload: {
          oldValue: serverParsed.frontmatterDescription,
          newValue: localParsed.frontmatterDescription,
        },
      });
    }

    if (serverParsed.description !== localParsed.description) {
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.updateStandardDescription,
        payload: {
          oldValue: serverParsed.description,
          newValue: localParsed.description,
        },
      });
    }

    if (serverParsed.scope !== localParsed.scope) {
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.updateStandardScope,
        payload: {
          oldValue: serverParsed.scope,
          newValue: localParsed.scope,
        },
      });
    }

    const serverRules = new Set(serverParsed.rules);
    const localRules = new Set(localParsed.rules);

    const deletedRules = [...serverRules].filter(
      (rule) => !localRules.has(rule),
    );
    const addedRules = [...localRules].filter((rule) => !serverRules.has(rule));

    const { updates, remainingDeleted, remainingAdded } = matchUpdatedRules(
      deletedRules,
      addedRules,
    );

    for (const update of updates) {
      const ruleId = createRuleId('unresolved');
      diffs.push({
        ...diffBase,
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
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.deleteRule,
        payload: {
          targetId: ruleId,
          item: { id: ruleId, content: rule },
        },
      });
    }

    for (const rule of remainingAdded) {
      diffs.push({
        ...diffBase,
        type: ChangeProposalType.addRule,
        payload: {
          item: { content: rule },
        },
      });
    }

    return diffs;
  }
}
