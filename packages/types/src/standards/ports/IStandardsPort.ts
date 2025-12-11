import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Rule } from '../Rule';
import { RuleExample } from '../RuleExample';
import { RuleId } from '../RuleId';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { StandardVersion } from '../StandardVersion';
import { StandardVersionId } from '../StandardVersionId';
import { UserId } from '../../accounts/User';

export type StandardChange = {
  newRule: string;
  oldRule?: string;
  operation: string;
  standard: string;
};

export type ProcessStandardChangesCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  changes: StandardChange[];
};

export type ProcessStandardChangesResult = {
  succeeded: Array<{
    standardSlug: string;
    rule: string;
    standardVersion: StandardVersion;
  }>;
  failed: Array<{
    standardSlug: string;
    rule: string;
    error: string;
  }>;
};

export const IStandardsPortName = 'IStandardsPort' as const;

export interface IStandardsPort {
  getStandard(id: StandardId): Promise<Standard | null>;
  getStandardVersion(id: StandardVersionId): Promise<StandardVersion | null>;
  getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null>;
  getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null>;
  listStandardVersions(standardId: StandardId): Promise<StandardVersion[]>;
  getRule(id: RuleId): Promise<Rule | null>;
  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]>;
  getRulesByStandardId(id: StandardId): Promise<Rule[]>;
  listStandardsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<Standard[]>;
  getRuleCodeExamples(id: RuleId): Promise<RuleExample[]>;
  findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
  processStandardChanges(
    command: ProcessStandardChangesCommand,
  ): Promise<ProcessStandardChangesResult>;
}
