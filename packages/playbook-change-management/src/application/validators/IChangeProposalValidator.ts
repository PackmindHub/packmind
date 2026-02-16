import {
  ChangeProposalType,
  CreateChangeProposalCommand,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';

export type ChangeProposalValidationResult = {
  artefactVersion: number;
};

export interface IChangeProposalValidator {
  supports(type: ChangeProposalType): boolean;

  validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<ChangeProposalValidationResult>;
}
