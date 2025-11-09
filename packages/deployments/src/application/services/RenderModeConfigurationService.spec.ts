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
import { CodingAgents } from '@packmind/coding-agent';
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
      it('returns null', async () => {
        repository.findByOrganizationId.mockResolvedValue(null);

        const configuration = await service.getConfiguration(organizationId);

        expect(configuration).toBeNull();
        expect(repository.findByOrganizationId).toHaveBeenCalledWith(
          organizationId,
        );
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
        it('creates configuration with defaults', async () => {
          const configuration =
            await service.createConfiguration(organizationId);

          expect(repository.findByOrganizationId).toHaveBeenCalledWith(
            organizationId,
          );
          expect(repository.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              organizationId,
              activeRenderModes: DEFAULT_ACTIVE_RENDER_MODES,
            }),
          );
          expect(configuration.activeRenderModes).toEqual(
            DEFAULT_ACTIVE_RENDER_MODES,
          );
        });
      });

      describe('with provided modes', () => {
        it('persists normalized render modes', async () => {
          const configuration = await service.createConfiguration(
            organizationId,
            [RenderMode.CLAUDE],
          );

          expect(repository.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              organizationId,
              activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
            }),
          );
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
      it('updates configuration with normalized modes', async () => {
        const existingConfiguration = renderModeConfigurationFactory({
          organizationId,
          activeRenderModes: DEFAULT_ACTIVE_RENDER_MODES,
        });

        repository.findByOrganizationId.mockResolvedValue(
          existingConfiguration,
        );
        repository.upsert.mockImplementation(async (config) => config);

        const configuration = await service.updateConfiguration(
          organizationId,
          [RenderMode.CLAUDE],
        );

        expect(repository.upsert).toHaveBeenCalledWith({
          ...existingConfiguration,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });
        expect(configuration.activeRenderModes).toEqual([
          RenderMode.PACKMIND,
          RenderMode.CLAUDE,
        ]);
      });
    });

    describe('when configuration does not exist', () => {
      it('throws an error', async () => {
        repository.findByOrganizationId.mockResolvedValue(null);

        await expect(
          service.updateConfiguration(organizationId, [RenderMode.CLAUDE]),
        ).rejects.toThrow('Render mode configuration does not exist');
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

      expect(agents).toEqual([
        CodingAgents.packmind,
        CodingAgents.claude,
        CodingAgents.agents_md,
      ]);
    });

    it('throws on unsupported render mode', () => {
      expect(() =>
        service.mapRenderModesToCodingAgents([
          'UNKNOWN' as unknown as RenderMode,
        ]),
      ).toThrow('Unsupported render mode: UNKNOWN');
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

        expect(agents).toEqual([CodingAgents.packmind, CodingAgents.copilot]);
      });
    });
  });
});
