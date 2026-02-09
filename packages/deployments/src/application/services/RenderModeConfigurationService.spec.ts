import { v4 as uuidv4 } from 'uuid';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';
import { stubLogger } from '@packmind/test-utils';
import { OrganizationId, createOrganizationId } from '@packmind/types';
import {
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  RenderModeConfiguration,
} from '@packmind/types';
import { renderModeConfigurationFactory } from '../../../test';

describe('RenderModeConfigurationService', () => {
  let repository: jest.Mocked<IRenderModeConfigurationRepository>;
  let service: RenderModeConfigurationService;
  let organizationId: OrganizationId;

  beforeEach(() => {
    repository = {
      findByOrganizationId: jest.fn(),
      upsert: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IRenderModeConfigurationRepository>;

    organizationId = createOrganizationId(uuidv4());
    service = new RenderModeConfigurationService(repository, stubLogger());
  });

  describe('getConfiguration', () => {
    describe('when configuration is absent', () => {
      let configuration: ReturnType<
        typeof service.getConfiguration
      > extends Promise<infer T>
        ? T
        : never;

      beforeEach(async () => {
        repository.findByOrganizationId.mockResolvedValue(null);
        configuration = await service.getConfiguration(organizationId);
      });

      it('returns null', () => {
        expect(configuration).toBeNull();
      });

      it('queries repository with organization id', () => {
        expect(repository.findByOrganizationId).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('does not upsert configuration', () => {
        expect(repository.upsert).not.toHaveBeenCalled();
      });
    });
  });

  describe('createConfiguration', () => {
    describe('when configuration does not yet exist', () => {
      beforeEach(() => {
        repository.findByOrganizationId.mockResolvedValue(null);
        repository.upsert.mockImplementation(async (config) => config);
      });

      describe('without provided modes', () => {
        let configuration: Awaited<
          ReturnType<typeof service.createConfiguration>
        >;

        beforeEach(async () => {
          configuration = await service.createConfiguration(organizationId);
        });

        it('queries repository with organization id', () => {
          expect(repository.findByOrganizationId).toHaveBeenCalledWith(
            organizationId,
          );
        });

        it('upserts configuration with default render modes', () => {
          expect(repository.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              organizationId,
              activeRenderModes: DEFAULT_ACTIVE_RENDER_MODES,
            }),
          );
        });

        it('returns configuration with default active render modes', () => {
          expect(configuration.activeRenderModes).toEqual(
            DEFAULT_ACTIVE_RENDER_MODES,
          );
        });
      });

      describe('with provided modes', () => {
        let configuration: Awaited<
          ReturnType<typeof service.createConfiguration>
        >;

        beforeEach(async () => {
          configuration = await service.createConfiguration(organizationId, [
            RenderMode.CLAUDE,
          ]);
        });

        it('upserts configuration with normalized render modes', () => {
          expect(repository.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              organizationId,
              activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
            }),
          );
        });

        it('returns configuration with normalized active render modes', () => {
          expect(configuration.activeRenderModes).toEqual([
            RenderMode.PACKMIND,
            RenderMode.CLAUDE,
          ]);
        });
      });
    });
  });

  describe('updateConfiguration', () => {
    describe('when configuration exists', () => {
      let configuration: Awaited<
        ReturnType<typeof service.updateConfiguration>
      >;
      let existingConfiguration: ReturnType<
        typeof renderModeConfigurationFactory
      >;

      beforeEach(async () => {
        existingConfiguration = renderModeConfigurationFactory({
          organizationId,
          activeRenderModes: DEFAULT_ACTIVE_RENDER_MODES,
        });

        repository.findByOrganizationId.mockResolvedValue(
          existingConfiguration,
        );
        repository.upsert.mockImplementation(async (config) => config);

        configuration = await service.updateConfiguration(organizationId, [
          RenderMode.CLAUDE,
        ]);
      });

      it('upserts configuration with normalized render modes', () => {
        expect(repository.upsert).toHaveBeenCalledWith({
          ...existingConfiguration,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });
      });

      it('returns configuration with normalized active render modes', () => {
        expect(configuration.activeRenderModes).toEqual([
          RenderMode.PACKMIND,
          RenderMode.CLAUDE,
        ]);
      });
    });

    describe('when configuration does not exist', () => {
      let thrownError: Error | undefined;

      beforeEach(async () => {
        repository.findByOrganizationId.mockResolvedValue(null);

        try {
          await service.updateConfiguration(organizationId, [
            RenderMode.CLAUDE,
          ]);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws an error', () => {
        expect(thrownError?.message).toBe(
          'Render mode configuration does not exist',
        );
      });

      it('does not upsert configuration', () => {
        expect(repository.upsert).not.toHaveBeenCalled();
      });
    });
  });

  describe('getActiveRenderModes', () => {
    describe('with existing configuration', () => {
      it('returns persisted modes', async () => {
        const configuration = renderModeConfigurationFactory({
          organizationId,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });

        repository.findByOrganizationId.mockResolvedValue(configuration);

        const modes = await service.getActiveRenderModes(organizationId);

        expect(modes).toEqual([RenderMode.PACKMIND, RenderMode.CLAUDE]);
      });
    });

    describe('with missing configuration', () => {
      it('returns default configuration', async () => {
        repository.findByOrganizationId.mockResolvedValue(null);

        const modes = await service.getActiveRenderModes(organizationId);

        expect(modes).toEqual(DEFAULT_ACTIVE_RENDER_MODES);
      });
    });
  });

  describe('mapRenderModesToCodingAgents', () => {
    it('maps render modes to coding agents without duplicates', () => {
      const agents = service.mapRenderModesToCodingAgents([
        RenderMode.PACKMIND,
        RenderMode.CLAUDE,
        RenderMode.CLAUDE,
        RenderMode.AGENTS_MD,
      ]);

      expect(agents).toEqual(['packmind', 'claude', 'agents_md']);
    });

    it('throws on unsupported render mode', () => {
      expect(() =>
        service.mapRenderModesToCodingAgents([
          'UNKNOWN' as unknown as RenderMode,
        ]),
      ).toThrow('Unsupported render mode: UNKNOWN');
    });
  });

  describe('mapCodingAgentsToRenderModes', () => {
    it('maps coding agents to render modes without duplicates', () => {
      const renderModes = service.mapCodingAgentsToRenderModes([
        'packmind',
        'claude',
        'claude',
        'cursor',
      ]);

      expect(renderModes).toEqual([
        RenderMode.PACKMIND,
        RenderMode.CLAUDE,
        RenderMode.CURSOR,
      ]);
    });

    it('filters out unknown coding agents', () => {
      const renderModes = service.mapCodingAgentsToRenderModes([
        'claude',
        'unknown-agent' as unknown as (typeof CodingAgents)[keyof typeof CodingAgents],
      ]);

      expect(renderModes).toEqual([RenderMode.CLAUDE]);
    });

    it('returns empty array for empty input', () => {
      const renderModes = service.mapCodingAgentsToRenderModes([]);

      expect(renderModes).toEqual([]);
    });
  });

  describe('resolveActiveCodingAgents', () => {
    describe('with existing configuration', () => {
      it('resolves coding agents from active render modes', async () => {
        const configuration: RenderModeConfiguration =
          renderModeConfigurationFactory({
            organizationId,
            activeRenderModes: [RenderMode.PACKMIND, RenderMode.GH_COPILOT],
          });

        repository.findByOrganizationId.mockResolvedValue(configuration);

        const agents = await service.resolveActiveCodingAgents(organizationId);

        expect(agents).toEqual(['packmind', 'copilot']);
      });
    });
  });
});
