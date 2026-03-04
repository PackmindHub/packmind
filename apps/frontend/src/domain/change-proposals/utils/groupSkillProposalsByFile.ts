import {
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  SkillFile,
  SkillFileId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { SCALAR_SKILL_TYPES } from '../constants/skillProposalTypes';

export const SKILL_MD_PATH = '/SKILL.md';

export interface FileGroup {
  filePath: string;
  proposals: ChangeProposalWithConflicts[];
  changeCount: number;
  pendingCount: number;
}

export function getProposalFilePath(
  proposal: ChangeProposalWithConflicts,
  files: SkillFile[],
): string {
  if (SCALAR_SKILL_TYPES.has(proposal.type)) {
    return SKILL_MD_PATH;
  }

  if (proposal.type === ChangeProposalType.addSkillFile) {
    const payload = proposal.payload as CollectionItemAddPayload<
      Omit<SkillFile, 'id' | 'skillVersionId'>
    >;
    return payload.item.path;
  }

  if (proposal.type === ChangeProposalType.deleteSkillFile) {
    const payload = proposal.payload as CollectionItemDeletePayload<
      Omit<SkillFile, 'skillVersionId'>
    >;
    return payload.item.path;
  }

  if (
    proposal.type === ChangeProposalType.updateSkillFileContent ||
    proposal.type === ChangeProposalType.updateSkillFilePermissions
  ) {
    const payload =
      proposal.payload as CollectionItemUpdatePayload<SkillFileId>;
    const file = files.find((f) => f.id === payload.targetId);
    return file?.path ?? SKILL_MD_PATH;
  }

  return SKILL_MD_PATH;
}

export function groupSkillProposalsByFile(
  proposals: ChangeProposalWithConflicts[],
  files: SkillFile[],
  acceptedIds: Set<ChangeProposalId>,
  rejectedIds: Set<ChangeProposalId>,
): FileGroup[] {
  const groupMap = new Map<string, ChangeProposalWithConflicts[]>();

  for (const proposal of proposals) {
    const filePath = getProposalFilePath(proposal, files);
    const existing = groupMap.get(filePath);
    if (existing) {
      existing.push(proposal);
    } else {
      groupMap.set(filePath, [proposal]);
    }
  }

  const groups: FileGroup[] = [];

  for (const [filePath, groupProposals] of groupMap) {
    const sorted = [...groupProposals].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const pendingCount = sorted.filter(
      (p) => !acceptedIds.has(p.id) && !rejectedIds.has(p.id),
    ).length;

    groups.push({
      filePath,
      proposals: sorted,
      changeCount: sorted.length,
      pendingCount,
    });
  }

  groups.sort((a, b) => {
    if (a.filePath === SKILL_MD_PATH) return -1;
    if (b.filePath === SKILL_MD_PATH) return 1;
    return a.filePath.localeCompare(b.filePath);
  });

  return groups;
}
