import { AccountsHexa } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa } from '@packmind/amplitude';
import { GitHexa } from '@packmind/git';
import { LinterHexa } from '@packmind/linter';
import { LlmHexa } from '@packmind/llm';
import { JobsService, PackmindEventEmitterService } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SkillsHexa } from '@packmind/skills';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';
import { getPackmindAppDefinition, initializePackmindApp } from './PackmindApp';

describe('PackmindApp MCP Server', () => {
  let dataSource: DataSource;

  beforeEach(() => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    dataSource = {
      manager: {},
      isInitialized: true,
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as DataSource;
  });

  describe('getPackmindAppDefinition', () => {
    it('returns all hexas in correct dependency order', () => {
      const definition = getPackmindAppDefinition();

      expect(definition.hexas).toEqual([
        AccountsHexa,
        AmplitudeHexa,
        LlmHexa,
        GitHexa,
        SpacesHexa,
        LinterHexa,
        RecipesHexa,
        StandardsHexa,
        SkillsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
      ]);
    });

    it('includes required infrastructure services', () => {
      const definition = getPackmindAppDefinition();

      expect(definition.services).toEqual([
        JobsService,
        PackmindEventEmitterService,
      ]);
    });
  });

  describe('initializePackmindApp', () => {
    it('initializes HexaRegistry with all hexas', async () => {
      const registry = await initializePackmindApp(dataSource);

      expect(registry.initialized).toBe(true);
    });

    describe('when registering hexas', () => {
      let registry: Awaited<ReturnType<typeof initializePackmindApp>>;

      beforeEach(async () => {
        registry = await initializePackmindApp(dataSource);
      });

      it('registers AccountsHexa', () => {
        expect(registry.get(AccountsHexa)).toBeDefined();
      });

      it('registers GitHexa', () => {
        expect(registry.get(GitHexa)).toBeDefined();
      });

      it('registers SpacesHexa', () => {
        expect(registry.get(SpacesHexa)).toBeDefined();
      });

      it('registers LinterHexa', () => {
        expect(registry.get(LinterHexa)).toBeDefined();
      });

      it('registers RecipesHexa', () => {
        expect(registry.get(RecipesHexa)).toBeDefined();
      });

      it('registers StandardsHexa', () => {
        expect(registry.get(StandardsHexa)).toBeDefined();
      });

      it('registers CodingAgentHexa', () => {
        expect(registry.get(CodingAgentHexa)).toBeDefined();
      });

      it('registers DeploymentsHexa', () => {
        expect(registry.get(DeploymentsHexa)).toBeDefined();
      });
    });

    it('registers JobsService', async () => {
      const registry = await initializePackmindApp(dataSource);

      expect(registry.getService(JobsService)).toBeDefined();
    });

    describe('when accessing hexa adapters', () => {
      let registry: Awaited<ReturnType<typeof initializePackmindApp>>;

      beforeEach(async () => {
        registry = await initializePackmindApp(dataSource);
      });

      it('provides access to AccountsHexa adapter', () => {
        const accountsHexa = registry.get(AccountsHexa);

        expect(accountsHexa.getAdapter()).toBeDefined();
      });

      it('provides access to GitHexa adapter', () => {
        const gitHexa = registry.get(GitHexa);

        expect(gitHexa.getAdapter()).toBeDefined();
      });

      it('provides access to RecipesHexa adapter', () => {
        const recipesHexa = registry.get(RecipesHexa);

        expect(recipesHexa.getAdapter()).toBeDefined();
      });

      it('provides access to StandardsHexa adapter', () => {
        const standardsHexa = registry.get(StandardsHexa);

        expect(standardsHexa.getAdapter()).toBeDefined();
      });

      it('provides access to DeploymentsHexa adapter', () => {
        const deploymentsHexa = registry.get(DeploymentsHexa);

        expect(deploymentsHexa.getAdapter()).toBeDefined();
      });
    });
  });
});
