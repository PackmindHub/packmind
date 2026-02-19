import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  IStandardsPort,
  ScalarUpdatePayload,
  Standard,
  StandardId,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { IChangeProposalValidator } from './IChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

type ScalarStandardType =
  | ChangeProposalType.updateStandardName
  | ChangeProposalType.updateStandardDescription
  | ChangeProposalType.updateStandardScope;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
]);

const STANDARD_FIELD_BY_TYPE: Record<
  ScalarStandardType,
  (standard: Standard) => string
> = {
  [ChangeProposalType.updateStandardName]: (standard) => standard.name,
  [ChangeProposalType.updateStandardDescription]: (standard) =>
    standard.description,
  [ChangeProposalType.updateStandardScope]: (standard) => standard.scope ?? '',
};

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
    const currentValue =
      STANDARD_FIELD_BY_TYPE[command.type as ScalarStandardType](standard);

    if (payload.oldValue !== currentValue) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        currentValue,
      );
    }

    return { artefactVersion: standard.version };
  }
}
