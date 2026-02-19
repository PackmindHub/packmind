import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  IStandardsPort,
  ScalarUpdatePayload,
  StandardId,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { IChangeProposalValidator } from './IChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.updateStandardName,
]);

export class StandardChangeProposalValidator implements IChangeProposalValidator {
  constructor(private readonly standardsPort: IStandardsPort) {}

  supports(type: ChangeProposalType): boolean {
    return SUPPORTED_TYPES.has(type);
  }

  async validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
    const standardId = command.artefactId as StandardId;

    const standard = await this.standardsPort.getStandard(standardId);
    if (!standard) {
      throw new Error(`Standard ${standardId} not found`);
    }

    const payload = command.payload as ScalarUpdatePayload;
    if (payload.oldValue !== standard.name) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        standard.name,
      );
    }

    return { artefactVersion: standard.version };
  }
}
