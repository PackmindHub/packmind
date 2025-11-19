import { JwtService } from '@nestjs/jwt';
import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { GitHexa } from '@packmind/git';
import { LinterHexa } from '@packmind/linter';
import { LlmHexa } from '@packmind/llm';
import { PackmindLogger } from '@packmind/logger';
import { JobsService } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';
import { ApiKeyServiceProvider } from './ApiKeyServiceProvider';
import { getPackmindAppDefinition, initializePackmindApp } from './PackmindApp';

describe('PackmindApp API', () => {
  let dataSource: DataSource;
  let jwtService: JwtService;

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

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as JwtService;
  });

  describe('getPackmindAppDefinition', () => {
    it('returns all hexas in correct dependency order', () => {
      const definition = getPackmindAppDefinition();

      expect(definition.hexas).toEqual([
        SpacesHexa,
        AccountsHexa,
        LlmHexa,
        GitHexa,
        RecipesHexa,
        AnalyticsHexa,
        LinterHexa,
        StandardsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
      ]);
    });

    it('includes required infrastructure services', () => {
      const definition = getPackmindAppDefinition();

      expect(definition.services).toBeDefined();
    });
  });

  describe('initializePackmindApp', () => {
    it('initializes HexaRegistry with all hexas', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        apiKeyService,
      });

      expect(registry.initialized).toBe(true);
    });

    it('registers all expected hexas', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        apiKeyService,
      });

      expect(registry.get(SpacesHexa)).toBeDefined();
      expect(registry.get(AccountsHexa)).toBeDefined();
      expect(registry.get(GitHexa)).toBeDefined();
      expect(registry.get(RecipesHexa)).toBeDefined();
      expect(registry.get(AnalyticsHexa)).toBeDefined();
      expect(registry.get(LinterHexa)).toBeDefined();
      expect(registry.get(StandardsHexa)).toBeDefined();
      expect(registry.get(CodingAgentHexa)).toBeDefined();
      expect(registry.get(DeploymentsHexa)).toBeDefined();
    });

    it('registers JobsService', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        apiKeyService,
      });

      expect(registry.getService(JobsService)).toBeDefined();
    });

    it('provides access to hexas through adapters', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        apiKeyService,
      });

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
