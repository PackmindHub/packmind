import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import type { QueryOption } from '../../database/types';
import { SpaceId } from '../../spaces/SpaceId';
import {
  CreateStandardSamplesCommand,
  CreateStandardSamplesResponse,
} from '../contracts';
import { StandardCreationMethod } from '../events/StandardCreatedEvent';
import { Rule } from '../Rule';
import { RuleExample } from '../RuleExample';
import { RuleId } from '../RuleId';
import { RuleWithExamples } from '../RuleWithExamples';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { StandardVersion } from '../StandardVersion';
import { StandardVersionId } from '../StandardVersionId';

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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]>;
  getRuleCodeExamples(id: RuleId): Promise<RuleExample[]>;
  findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
  createStandardWithExamples(params: {
    name: string;
    description: string;
    summary: string | null;
    rules: RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId;
    disableTriggerAssessment?: boolean;
    source?: string;
    method?: StandardCreationMethod;
  }): Promise<Standard>;
  createStandardSamples(
    command: CreateStandardSamplesCommand,
  ): Promise<CreateStandardSamplesResponse>;
}
