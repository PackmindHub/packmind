import { v4 as uuidv4 } from 'uuid';
import { OrganizationId } from '@packmind/accounts';
import {
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  RenderModeConfiguration,
  createRenderModeConfigurationId,
  normalizeRenderModes,
} from '@packmind/types';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CodingAgent } from '@packmind/types';
import { CodingAgents } from '@packmind/coding-agent';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';

const origin = 'RenderModeConfigurationService';

const renderModeToCodingAgent: Record<RenderMode, CodingAgent> = {
  [RenderMode.PACKMIND]: CodingAgents.packmind,
  [RenderMode.AGENTS_MD]: CodingAgents.agents_md,
  [RenderMode.JUNIE]: CodingAgents.junie,
  [RenderMode.GH_COPILOT]: CodingAgents.copilot,
  [RenderMode.CLAUDE]: CodingAgents.claude,
  [RenderMode.CURSOR]: CodingAgents.cursor,
  [RenderMode.GITLAB_DUO]: CodingAgents.gitlab_duo,
};

export class RenderModeConfigurationService {
  constructor(
    private readonly repository: IRenderModeConfigurationRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('RenderModeConfigurationService initialized');
  }

  async getActiveRenderModes(
    organizationId: OrganizationId,
  ): Promise<RenderMode[]> {
    const configuration = await this.getConfiguration(organizationId);

    if (!configuration) {
      this.logger.info('Render mode configuration missing', {
        organizationId,
      });

      return DEFAULT_ACTIVE_RENDER_MODES;
    }

    return configuration.activeRenderModes;
  }

  mapRenderModesToCodingAgents(renderModes: RenderMode[]): CodingAgent[] {
    const mappedAgents = renderModes.map((mode) => {
      const codingAgent = renderModeToCodingAgent[mode];

      if (!codingAgent) {
        this.logger.error('Unsupported render mode encountered', { mode });
        throw new Error(`Unsupported render mode: ${mode}`);
      }

      return codingAgent;
    });

    return Array.from(new Set(mappedAgents));
  }

  async resolveActiveCodingAgents(
    organizationId: OrganizationId,
  ): Promise<CodingAgent[]> {
    const activeRenderModes = await this.getActiveRenderModes(organizationId);

    return this.mapRenderModesToCodingAgents(activeRenderModes);
  }

  async getConfiguration(
    organizationId: OrganizationId,
  ): Promise<RenderModeConfiguration | null> {
    this.logger.info('Fetching render mode configuration', {
      organizationId,
    });

    try {
      const configuration =
        await this.repository.findByOrganizationId(organizationId);

      if (!configuration) {
        this.logger.info('No render mode configuration found', {
          organizationId,
        });
        return null;
      }

      return configuration;
    } catch (error) {
      this.logger.error('Failed to fetch render mode configuration', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createConfiguration(
    organizationId: OrganizationId,
    activeRenderModes?: RenderMode[],
  ): Promise<RenderModeConfiguration> {
    this.logger.info('Ensuring render mode configuration', {
      organizationId,
      requestedRenderModes: activeRenderModes,
    });

    try {
      const existing =
        await this.repository.findByOrganizationId(organizationId);
      if (existing) {
        this.logger.info('Render mode configuration already exists', {
          organizationId,
        });
        return this.normalizeConfiguration(existing);
      }

      const renderModesToPersist =
        activeRenderModes && activeRenderModes.length > 0
          ? normalizeRenderModes(activeRenderModes)
          : DEFAULT_ACTIVE_RENDER_MODES;

      const configuration: RenderModeConfiguration = {
        id: createRenderModeConfigurationId(uuidv4()),
        organizationId,
        activeRenderModes: renderModesToPersist,
      };

      const createdConfiguration = await this.repository.upsert(configuration);

      this.logger.info('Render mode configuration created', {
        organizationId,
        activeRenderModes: createdConfiguration.activeRenderModes,
      });

      return {
        ...createdConfiguration,
        activeRenderModes: normalizeRenderModes(
          createdConfiguration.activeRenderModes,
        ),
      };
    } catch (error) {
      this.logger.error('Failed to create render mode configuration', {
        organizationId,
        requestedRenderModes: activeRenderModes,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateConfiguration(
    organizationId: OrganizationId,
    activeRenderModes: RenderMode[],
  ): Promise<RenderModeConfiguration> {
    const normalizedRenderModes = normalizeRenderModes(activeRenderModes);

    this.logger.info('Updating render mode configuration', {
      organizationId,
      requestedRenderModes: activeRenderModes,
      normalizedRenderModes,
    });

    try {
      const existingConfiguration =
        await this.repository.findByOrganizationId(organizationId);

      if (!existingConfiguration) {
        this.logger.error('Cannot update missing render mode configuration', {
          organizationId,
        });
        throw new Error('Render mode configuration does not exist');
      }

      const updatedConfiguration = await this.repository.upsert({
        ...existingConfiguration,
        activeRenderModes: normalizedRenderModes,
      });

      return {
        ...updatedConfiguration,
        activeRenderModes: normalizeRenderModes(
          updatedConfiguration.activeRenderModes,
        ),
      };
    } catch (error) {
      this.logger.error('Failed to update render mode configuration', {
        organizationId,
        requestedRenderModes: activeRenderModes,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async normalizeConfiguration(
    configuration: RenderModeConfiguration,
  ): Promise<RenderModeConfiguration> {
    const normalizedRenderModes = normalizeRenderModes(
      configuration.activeRenderModes,
    );

    if (
      this.areRenderModesEqual(
        configuration.activeRenderModes,
        normalizedRenderModes,
      )
    ) {
      return {
        ...configuration,
        activeRenderModes: normalizedRenderModes,
      };
    }

    this.logger.debug('Normalizing persisted render modes', {
      organizationId: configuration.organizationId,
      original: configuration.activeRenderModes,
      normalized: normalizedRenderModes,
    });

    const normalizedConfiguration = await this.repository.upsert({
      ...configuration,
      activeRenderModes: normalizedRenderModes,
    });

    return {
      ...normalizedConfiguration,
      activeRenderModes: normalizedRenderModes,
    };
  }

  private areRenderModesEqual(a: RenderMode[], b: RenderMode[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => value === b[index]);
  }
}
