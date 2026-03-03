import {
  ChangeProposalType,
  ChangeProposalViolation,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  CreateChangeProposalCommand,
  IStandardsPort,
  NewStandardPayload,
  Rule,
  RuleId,
  ScalarUpdatePayload,
  Standard,
  StandardId,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import {
  ChangeProposalValidationResult,
  IChangeProposalValidator,
} from './IChangeProposalValidator';
import { ChangeProposalLimitExceededError } from '../errors/ChangeProposalLimitExceededError';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

type ScalarStandardType =
  | ChangeProposalType.updateStandardName
  | ChangeProposalType.updateStandardDescription
  | ChangeProposalType.updateStandardScope;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.createStandard,
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
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

const STANDARD_NAME_MAX_LENGTH = 250;
const RULE_CONTENT_MAX_LENGTH = 1000;
const RULES_MAX_COUNT = 500;

export class StandardChangeProposalValidator implements IChangeProposalValidator {
  constructor(private readonly standardsPort: IStandardsPort) {}

  supports(type: ChangeProposalType): boolean {
    return SUPPORTED_TYPES.has(type);
  }

  async validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
    if (command.type === ChangeProposalType.createStandard) {
      const payload = command.payload as NewStandardPayload;

      if (payload.name.length > STANDARD_NAME_MAX_LENGTH) {
        throw new ChangeProposalLimitExceededError(
          ChangeProposalViolation.STANDARD_NAME_TOO_LONG,
          STANDARD_NAME_MAX_LENGTH,
          payload.name.length,
        );
      }

      if (payload.rules.length > RULES_MAX_COUNT) {
        throw new ChangeProposalLimitExceededError(
          ChangeProposalViolation.TOO_MANY_RULES,
          RULES_MAX_COUNT,
          payload.rules.length,
        );
      }

      const oversizedRule = payload.rules.find(
        (rule) => rule.content.length > RULE_CONTENT_MAX_LENGTH,
      );
      if (oversizedRule) {
        throw new ChangeProposalLimitExceededError(
          ChangeProposalViolation.RULE_CONTENT_TOO_LONG,
          RULE_CONTENT_MAX_LENGTH,
          oversizedRule.content.length,
        );
      }

      return { artefactVersion: 0 };
    }

    const standardId = command.artefactId as StandardId;

    const standard = await this.standardsPort.getStandard(standardId);
    if (!standard) {
      throw new Error(`Standard ${standardId} not found`);
    }

    if (command.type === ChangeProposalType.addRule) {
      return { artefactVersion: standard.version };
    }

    if (command.type === ChangeProposalType.updateRule) {
      return this.validateUpdateRule(standard, command);
    }

    if (command.type === ChangeProposalType.deleteRule) {
      return this.validateDeleteRule(standard, command);
    }

    const payload = command.payload as ScalarUpdatePayload;
    const currentValue =
      STANDARD_FIELD_BY_TYPE[command.type as ScalarStandardType](standard);

    if (command.type === ChangeProposalType.updateStandardScope) {
      if (normalizeScope(payload.oldValue) !== normalizeScope(currentValue)) {
        throw new ChangeProposalPayloadMismatchError(
          command.type,
          payload.oldValue,
          currentValue,
        );
      }
      return { artefactVersion: standard.version };
    }

    if (payload.oldValue !== currentValue) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        currentValue,
      );
    }

    return { artefactVersion: standard.version };
  }

  private async validateUpdateRule(
    standard: Standard,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<ChangeProposalValidationResult> {
    const payload = command.payload as CollectionItemUpdatePayload<RuleId>;
    const rules = await this.standardsPort.getRulesByStandardId(standard.id);
    const matchingRule = rules.find(
      (rule) => rule.content === payload.oldValue,
    );

    if (!matchingRule) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        'rule not found',
      );
    }

    return {
      artefactVersion: standard.version,
      resolvedPayload: {
        targetId: matchingRule.id,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
      },
    };
  }

  private async validateDeleteRule(
    standard: Standard,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<ChangeProposalValidationResult> {
    const payload = command.payload as CollectionItemDeletePayload<
      Omit<Rule, 'standardVersionId'>
    >;
    const rules = await this.standardsPort.getRulesByStandardId(standard.id);
    const matchingRule = rules.find(
      (rule) => rule.content === payload.item.content,
    );

    if (!matchingRule) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.item.content,
        'rule not found',
      );
    }

    return {
      artefactVersion: standard.version,
      resolvedPayload: {
        targetId: matchingRule.id,
        item: { id: matchingRule.id, content: matchingRule.content },
      },
    };
  }
}

function normalizeScope(scope: string): string {
  return scope
    .split(',')
    .map((s) => s.trim())
    .join(', ');
}
