import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import { ChangeProposalType, Standard } from '@packmind/types';

export class StandardCreateChangeProposalApplier implements ICreateChangeProposalApplier<ChangeProposalType.createStandard> {
  apply(): Promise<Standard> {
    throw new Error('Method not implemented.');
  }

  updateCreatedIds(): CreatedIds {
    throw new Error('Method not implemented.');
  }
}
