import { JwtService } from '@nestjs/jwt';
import { AccountsHexa } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { LinterHexa } from '@packmind/linter';
import { AmplitudeHexa } from '@packmind/amplitude';
import { apiHexaPlugins } from '@packmind/plugins';
import { GitHexa } from '@packmind/git';
import { LlmHexa } from '@packmind/llm';
import { PackmindLogger } from '@packmind/logger';
import { JobsService } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SkillsHexa } from '@packmind/skills';
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
        AmplitudeHexa,
        LlmHexa,
        GitHexa,
        RecipesHexa,
        LinterHexa,
        StandardsHexa,
        SkillsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
        ...apiHexaPlugins,
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
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.initialized).toBe(true);
    });

    it('registers SpacesHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(SpacesHexa)).toBeDefined();
    });

    it('registers AccountsHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(AccountsHexa)).toBeDefined();
    });

    it('registers GitHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(GitHexa)).toBeDefined();
    });

    it('registers RecipesHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(RecipesHexa)).toBeDefined();
    });

    it('registers LinterHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(LinterHexa)).toBeDefined();
    });

    it('registers StandardsHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(StandardsHexa)).toBeDefined();
    });

    it('registers CodingAgentHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.get(CodingAgentHexa)).toBeDefined();
    });

    it('registers DeploymentsHexa', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

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
        jwtService: undefined,
        apiKeyService,
      });

      expect(registry.getService(JobsService)).toBeDefined();
    });

    it('provides AccountsHexa adapter', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      const accountsHexa = registry.get(AccountsHexa);
      expect(accountsHexa.getAdapter()).toBeDefined();
    });

    it('provides GitHexa adapter', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      const gitHexa = registry.get(GitHexa);
      expect(gitHexa.getAdapter()).toBeDefined();
    });

    it('provides RecipesHexa adapter', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      const recipesHexa = registry.get(RecipesHexa);
      expect(recipesHexa.getAdapter()).toBeDefined();
    });

    it('provides StandardsHexa adapter', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      const standardsHexa = registry.get(StandardsHexa);
      expect(standardsHexa.getAdapter()).toBeDefined();
    });

    it('provides DeploymentsHexa adapter', async () => {
      const logger = new PackmindLogger('Test');
      const apiKeyServiceProvider = new ApiKeyServiceProvider();
      const apiKeyService = apiKeyServiceProvider.createApiKeyService(
        jwtService,
        logger,
      );

      const registry = await initializePackmindApp(dataSource, {
        jwtService: undefined,
        apiKeyService,
      });

      const deploymentsHexa = registry.get(DeploymentsHexa);
      expect(deploymentsHexa.getAdapter()).toBeDefined();
    });
  });
});
