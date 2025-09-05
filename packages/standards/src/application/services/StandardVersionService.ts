import { v4 as uuidv4 } from 'uuid';
import { StandardId } from '../../domain/entities/Standard';
import { Rule, createRuleId } from '../../domain/entities/Rule';
import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { PackmindLogger } from '@packmind/shared';
import { UserId } from '@packmind/accounts/types';
import {
  createStandardVersionId,
  StandardVersionId,
  StandardVersion,
} from '../../domain/entities/StandardVersion';

const origin = 'StandardVersionService';

export type CreateStandardVersionData = {
  standardId: StandardId;
  name: string;
  slug: string;
  description: string;
  version: number;
  rules: Array<{ content: string }>;
  scope: string | null;
  summary?: string | null;
  userId?: UserId | null; // User who created this version through Web UI, null for git commits
};

export class StandardVersionService {
  constructor(
    private readonly standardVersionRepository: IStandardVersionRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('StandardVersionService initialized');
  }

  async addStandardVersion(
    standardVersionData: CreateStandardVersionData,
  ): Promise<StandardVersion> {
    this.logger.info('Adding new standard version', {
      standardId: standardVersionData.standardId,
      version: standardVersionData.version,
      rulesCount: standardVersionData.rules.length,
      hasSummary: !!standardVersionData.summary,
    });

    try {
      const versionId = createStandardVersionId(uuidv4());
      this.logger.debug('Generated standard version ID', { versionId });

      const newStandardVersion: StandardVersion = {
        id: versionId,
        standardId: standardVersionData.standardId,
        name: standardVersionData.name,
        slug: standardVersionData.slug,
        description: standardVersionData.description,
        version: standardVersionData.version,
        scope: standardVersionData.scope,
        summary: standardVersionData.summary,
        userId: standardVersionData.userId,
      };
      const savedVersion =
        await this.standardVersionRepository.add(newStandardVersion);

      // Add rules for this version
      this.logger.info('Adding rules for standard version', {
        versionId: savedVersion.id,
        rulesCount: standardVersionData.rules.length,
      });

      for (const ruleData of standardVersionData.rules) {
        const rule: Rule = {
          id: createRuleId(uuidv4()),
          content: ruleData.content,
          standardVersionId: savedVersion.id,
        };
        await this.ruleRepository.add(rule);
      }

      this.logger.info('Standard version and rules added successfully', {
        versionId: savedVersion.id,
      });

      return savedVersion;
    } catch (error) {
      this.logger.error('Failed to add standard version', {
        standardId: standardVersionData.standardId,
        version: standardVersionData.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listStandardVersions(
    standardId: StandardId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Listing standard versions', { standardId });

    try {
      const versions =
        await this.standardVersionRepository.findByStandardId(standardId);
      this.logger.info('Standard versions retrieved successfully', {
        standardId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list standard versions', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getStandardVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting standard version', { standardId, version });

    try {
      const standardVersion =
        await this.standardVersionRepository.findByStandardIdAndVersion(
          standardId,
          version,
        );

      if (standardVersion) {
        this.logger.info('Standard version found successfully', {
          standardId,
          version,
          versionId: standardVersion.id,
        });
      } else {
        this.logger.warn('Standard version not found', { standardId, version });
      }

      return standardVersion;
    } catch (error) {
      this.logger.error('Failed to get standard version', {
        standardId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getStandardVersionById(
    id: StandardVersionId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting standard version by ID', { versionId: id });

    try {
      const standardVersion = await this.standardVersionRepository.findById(id);

      if (standardVersion) {
        this.logger.info('Standard version found by ID successfully', {
          versionId: id,
          standardId: standardVersion.standardId,
          version: standardVersion.version,
        });
      } else {
        this.logger.warn('Standard version not found by ID', { versionId: id });
      }

      return standardVersion;
    } catch (error) {
      this.logger.error('Failed to get standard version by ID', {
        versionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting latest standard version', { standardId });

    try {
      const latestVersion =
        await this.standardVersionRepository.findLatestByStandardId(standardId);

      if (latestVersion) {
        this.logger.info('Latest standard version found successfully', {
          standardId,
          version: latestVersion.version,
          versionId: latestVersion.id,
        });
      } else {
        this.logger.warn('No standard versions found', { standardId });
      }

      return latestVersion;
    } catch (error) {
      this.logger.error('Failed to get latest standard version', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async prepareForGitPublishing(
    standardId: StandardId,
    version: number,
  ): Promise<{ filePath: string; content: string }> {
    this.logger.info('Preparing standard version for Git publishing', {
      standardId,
      version,
    });

    try {
      const standardVersion =
        await this.standardVersionRepository.findByStandardIdAndVersion(
          standardId,
          version,
        );

      if (!standardVersion) {
        this.logger.error('Standard version not found for Git publishing', {
          standardId,
          version,
        });
        throw new Error(
          `Standard version not found for standard ${standardId} version ${version}`,
        );
      }

      // Get rules for this version
      const rules = await this.ruleRepository.findByStandardVersionId(
        standardVersion.id,
      );

      // Generate markdown content
      const content = this.generateStandardMarkdown(standardVersion, rules);
      const filePath = `.packmind/standards/${standardVersion.slug}.md`;

      this.logger.info('Standard version prepared for Git publishing', {
        standardId,
        version,
        filePath,
        standardName: standardVersion.name,
        rulesCount: rules.length,
      });

      return {
        filePath,
        content,
      };
    } catch (error) {
      this.logger.error(
        'Failed to prepare standard version for Git publishing',
        {
          standardId,
          version,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async getRulesByVersionId(
    standardVersionId: StandardVersionId,
  ): Promise<Rule[]> {
    this.logger.info('Getting rules by standard version ID', {
      standardVersionId,
    });

    try {
      const rules =
        await this.ruleRepository.findByStandardVersionId(standardVersionId);
      this.logger.info('Rules retrieved by standard version ID successfully', {
        standardVersionId,
        count: rules.length,
      });
      return rules;
    } catch (error) {
      this.logger.error('Failed to get rules by standard version ID', {
        standardVersionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getLatestRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    this.logger.info('Getting latest rules by standard ID', { standardId });

    try {
      // Get the latest version of the standard
      const latestVersion = await this.getLatestStandardVersion(standardId);

      if (!latestVersion) {
        this.logger.warn(
          'No versions found for standard, returning empty rules',
          { standardId },
        );
        return [];
      }

      // Get rules for the latest version
      const rules = await this.getRulesByVersionId(latestVersion.id);
      this.logger.info('Rules retrieved by standard ID successfully', {
        standardId,
        versionId: latestVersion.id,
        count: rules.length,
      });
      return rules;
    } catch (error) {
      this.logger.error('Failed to get latest rules by standard ID', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private generateStandardMarkdown(
    standardVersion: StandardVersion,
    rules: Rule[],
  ): string {
    const header = `# ${standardVersion.name}

${standardVersion.description}

## Rules
`;

    const rulesContent = rules.map((rule) => `* ${rule.content}`).join('\n');

    const footer = `

---

*This standard was automatically generated from version ${standardVersion.version}.*`;

    return header + rulesContent + footer;
  }
}
