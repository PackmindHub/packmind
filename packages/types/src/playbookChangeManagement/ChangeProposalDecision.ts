import {
  CommandChangeProposalPayloadMap,
  CreationChangeProposalPayloadMap,
  SkillChangeProposalPayloadMap,
  StandardChangeProposalPayloadMap,
} from './ChangeProposalPayload';
import { PackageId } from '../deployments';
import { ChangeProposalType } from './ChangeProposalType';

export type RemoveArtefactDecision =
  | {
      delete: true;
    }
  | {
      delete: false;
      removeFromPackages: PackageId[];
    };

type ChangeProposalDecisionMap = CommandChangeProposalPayloadMap &
  StandardChangeProposalPayloadMap &
  SkillChangeProposalPayloadMap &
  CreationChangeProposalPayloadMap & {
    [ChangeProposalType.removeStandard]: RemoveArtefactDecision;
    [ChangeProposalType.removeCommand]: RemoveArtefactDecision;
    [ChangeProposalType.removeSkill]: RemoveArtefactDecision;
  };

export type ChangeProposalDecision<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalDecisionMap[T];
