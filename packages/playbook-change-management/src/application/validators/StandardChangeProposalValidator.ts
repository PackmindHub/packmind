import {
  ChangeProposalType,
  CollectionItemDeletePayload,
  CreateChangeProposalCommand,
  IStandardsPort,
  Rule,
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
  ChangeProposalType.addRule,
  ChangeProposalType.deleteRule,
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

    if (command.type === ChangeProposalType.addRule) {
      return { artefactVersion: standard.version };
    }

    if (command.type === ChangeProposalType.deleteRule) {
      return this.validateDeleteRule(standard, command);
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

  private async validateDeleteRule(
    standard: Standard,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
    const payload = command.payload as CollectionItemDeletePayload<
      Omit<Rule, 'standardVersionId'>
    >;
    const rules = await this.standardsPort.getRulesByStandardId(standard.id);
    const ruleExists = rules.some(
      (rule) => rule.content === payload.item.content,
    );

    if (!ruleExists) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.item.content,
        'rule not found',
      );
    }

    return { artefactVersion: standard.version };
  }
}
