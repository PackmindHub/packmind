import { AbstractChangeProposalsApplier } from './AbstractChangeProposalsApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  IStandardsPort,
  OrganizationId,
  SpaceId,
  StandardId,
  StandardVersion,
  UserId,
  createRuleId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';

const STANDARD_CHANGE_TYPES = [
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
];

export class StandardChangeProposalsApplier extends AbstractChangeProposalsApplier<StandardVersion> {
  constructor(
    diffService: DiffService,
    private readonly standardsPort: IStandardsPort,
  ) {
    super(diffService);
  }

  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, STANDARD_CHANGE_TYPES);
  }

  async getVersion(artefactId: StandardId): Promise<StandardVersion> {
    const standardVersion =
      await this.standardsPort.getLatestStandardVersion(artefactId);

    if (!standardVersion) {
      throw new Error(`Unable to find standard version with id ${artefactId}.`);
    }

    const rules = await this.standardsPort.getRulesByStandardId(artefactId);

    return {
      ...standardVersion,
      rules,
    };
  }

  protected applyChangeProposal(
    source: StandardVersion,
    changeProposal: ChangeProposal,
  ): StandardVersion {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateStandardName,
      )
    ) {
      return {
        ...source,
        name: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateStandardDescription,
      )
    ) {
      return {
        ...source,
        description: this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          source.description,
        ),
      };
    }

    if (
      isExpectedChangeProposalType(changeProposal, ChangeProposalType.addRule)
    ) {
      const newRule = {
        ...changeProposal.payload.item,
        id: createRuleId(''),
        standardVersionId: source.id,
      };

      return {
        ...source,
        rules: [...(source.rules || []), newRule],
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateRule,
      )
    ) {
      const rules = source.rules || [];
      const updatedRules = rules.map((rule) => {
        if (rule.id !== changeProposal.payload.targetId) {
          return rule;
        }

        return {
          ...rule,
          content: changeProposal.payload.newValue,
        };
      });

      return {
        ...source,
        rules: updatedRules,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.deleteRule,
      )
    ) {
      const rules = source.rules || [];
      const filteredRules = rules.filter(
        (rule) => rule.id !== changeProposal.payload.targetId,
      );

      return {
        ...source,
        rules: filteredRules,
      };
    }

    throw new Error(`Unsupported ChangeProposalType: ${changeProposal.type}`);
  }

  async saveNewVersion(
    version: StandardVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<StandardVersion> {
    const updatedStandard = await this.standardsPort.updateStandard({
      userId,
      organizationId,
      spaceId,
      standardId: version.standardId,
      name: version.name,
      description: version.description,
      rules: (version.rules || []).map((rule) => ({
        id: rule.id,
        content: rule.content,
      })),
      scope: version.scope,
    });

    const newVersion = await this.standardsPort.getLatestStandardVersion(
      updatedStandard.id,
    );

    if (!newVersion) {
      throw new Error(
        `Failed to retrieve latest version for standard ${updatedStandard.id}`,
      );
    }

    const rules = await this.standardsPort.getRulesByStandardId(
      updatedStandard.id,
    );

    return {
      ...newVersion,
      rules,
    };
  }
}
