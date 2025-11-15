import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { GitHexa } from '@packmind/git';
import { LearningsHexa } from '@packmind/learnings';
import { LinterHexa } from '@packmind/linter';
import { JobsService } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
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
        GitHexa,
        SpacesHexa,
        LinterHexa,
        RecipesHexa,
        StandardsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
        AnalyticsHexa,
        LearningsHexa,
      ]);
    });

    it('includes required infrastructure services', () => {
      const definition = getPackmindAppDefinition();

      expect(definition.services).toEqual([JobsService]);
    });
  });

  describe('initializePackmindApp', () => {
    it('initializes HexaRegistry with all hexas', async () => {
      const registry = await initializePackmindApp(dataSource);

      expect(registry.initialized).toBe(true);
    });

    it('registers all expected hexas', async () => {
      const registry = await initializePackmindApp(dataSource);

      expect(registry.get(AccountsHexa)).toBeDefined();
      expect(registry.get(GitHexa)).toBeDefined();
      expect(registry.get(SpacesHexa)).toBeDefined();
      expect(registry.get(LinterHexa)).toBeDefined();
      expect(registry.get(RecipesHexa)).toBeDefined();
      expect(registry.get(StandardsHexa)).toBeDefined();
      expect(registry.get(CodingAgentHexa)).toBeDefined();
      expect(registry.get(DeploymentsHexa)).toBeDefined();
      expect(registry.get(AnalyticsHexa)).toBeDefined();
      expect(registry.get(LearningsHexa)).toBeDefined();
    });

    it('registers JobsService', async () => {
      const registry = await initializePackmindApp(dataSource);

      expect(registry.getService(JobsService)).toBeDefined();
    });

    it('provides access to hexas through adapters', async () => {
      const registry = await initializePackmindApp(dataSource);

      const accountsHexa = registry.get(AccountsHexa);
      expect(accountsHexa.getAdapter()).toBeDefined();

      const gitHexa = registry.get(GitHexa);
      expect(gitHexa.getAdapter()).toBeDefined();

      const recipesHexa = registry.get(RecipesHexa);
      expect(recipesHexa.getAdapter()).toBeDefined();

      const standardsHexa = registry.get(StandardsHexa);
      expect(standardsHexa.getAdapter()).toBeDefined();

      const deploymentsHexa = registry.get(DeploymentsHexa);
      expect(deploymentsHexa.getAdapter()).toBeDefined();
    });
  });
});
