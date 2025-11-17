import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Rule } from '../Rule';
import { RuleExample } from '../RuleExample';
import { RuleId } from '../RuleId';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { StandardVersion } from '../StandardVersion';
import { StandardVersionId } from '../StandardVersionId';

export const IStandardsPortName = 'IStandardsPort' as const;

export interface IStandardsPort {
  // Read methods
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

  // Write methods for knowledge patch application
  addRuleToStandard(params: {
    standardSlug: string;
    ruleContent: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<StandardVersion>;

  updateStandardRules(params: {
    standardId: StandardId;
    ruleId: RuleId;
    newRuleContent: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<StandardVersion>;

  // Embedding methods
  updateStandardVersionEmbedding(
    versionId: StandardVersionId,
    embedding: number[],
  ): Promise<void>;
  findLatestStandardVersionsWithoutEmbedding(
    spaceId?: SpaceId,
  ): Promise<StandardVersion[]>;
  findAllLatestStandardVersions(spaceId?: SpaceId): Promise<StandardVersion[]>;
  findSimilarStandardsByEmbedding(
    embedding: number[],
    spaceId?: SpaceId,
    threshold?: number,
  ): Promise<Array<StandardVersion & { similarity: number }>>;
}
