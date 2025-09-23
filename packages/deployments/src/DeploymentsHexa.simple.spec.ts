import { DeploymentsHexa } from './DeploymentsHexa';
import { HexaRegistry, PackmindLogger } from '@packmind/shared';
import { DataSource } from 'typeorm';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { StandardsHexa } from '@packmind/standards';

describe('DeploymentsHexa - Simple Integration', () => {
  let mockRegistry: HexaRegistry;
  let mockDataSource: DataSource;
  let mockLogger: PackmindLogger;
  let mockCodingAgentHexa: jest.Mocked<CodingAgentHexa>;
  let mockGitHexa: jest.Mocked<GitHexa>;
  let mockRecipesHexa: jest.Mocked<RecipesHexa>;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock CodingAgentHexa
    mockCodingAgentHexa = {
      prepareRecipesDeployment: jest.fn().mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/recipe-1.md',
            content: '# Recipe 1',
          },
          {
            path: '.packmind/recipes-index.md',
            content: '# Recipes Index',
          },
        ],
        delete: [],
      }),
      prepareStandardsDeployment: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock GitHexa
    mockGitHexa = {
      commitToGit: jest.fn().mockResolvedValue({
        id: 'commit-123',
        sha: 'abc123def456789',
        message: 'Deploy recipes to repository',
        author: 'Packmind Deployments',
        url: 'https://github.com/test-org/test-repo/commit/abc123def456789',
      }),
      getRepositoryById: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock RecipesHexa
    mockRecipesHexa = {
      getRecipeById: jest.fn(),
      getRecipeVersionById: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock StandardsHexa
    mockStandardsHexa = {
      getStandardVersionById: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock DataSource first
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      }),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock registry
    mockRegistry = {
      get: jest.fn().mockImplementation((type) => {
        if (type === CodingAgentHexa) {
          return mockCodingAgentHexa;
        }
        if (type === GitHexa) {
          return mockGitHexa;
        }
        if (type === RecipesHexa) {
          return mockRecipesHexa;
        }
        if (type === StandardsHexa) {
          return mockStandardsHexa;
        }
        return null;
      }),
      getDataSource: jest.fn().mockReturnValue(mockDataSource),
      register: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  describe('constructor', () => {
    it('initializes successfully with valid dependencies', () => {
      expect(() => {
        new DeploymentsHexa(mockRegistry, { logger: mockLogger });
      }).not.toThrow();
    });

    describe('when CodingAgentHexa is not in registry', () => {
      it('throws error', () => {
        mockRegistry.get = jest.fn().mockImplementation((type) => {
          if (type === GitHexa) {
            return mockGitHexa;
          }
          if (type === RecipesHexa) {
            return mockRecipesHexa;
          }
          if (type === StandardsHexa) {
            return mockStandardsHexa;
          }
          return null; // CodingAgentHexa not found
        });

        expect(() => {
          new DeploymentsHexa(mockRegistry, { logger: mockLogger });
        }).toThrow('CodingAgentHexa not found in registry');
      });
    });

    describe('when GitHexa is not in registry', () => {
      it('throws error', () => {
        mockRegistry.get = jest.fn().mockImplementation((type) => {
          if (type === CodingAgentHexa) {
            return mockCodingAgentHexa;
          }
          if (type === RecipesHexa) {
            return mockRecipesHexa;
          }
          return null; // GitHexa not found
        });

        expect(() => {
          new DeploymentsHexa(mockRegistry, { logger: mockLogger });
        }).toThrow('GitHexa not found in registry');
      });
    });

    describe('when StandardsHexa is not in registry', () => {
      it('throws error', () => {
        mockRegistry.get = jest.fn().mockImplementation((type) => {
          if (type === CodingAgentHexa) {
            return mockCodingAgentHexa;
          }
          if (type === GitHexa) {
            return mockGitHexa;
          }
          // StandardsHexa not found, RecipesHexa is optional
          return null;
        });

        expect(() => {
          new DeploymentsHexa(mockRegistry, { logger: mockLogger });
        }).toThrow('StandardsHexa not found in registry');
      });
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      const deploymentsHexa = new DeploymentsHexa(mockRegistry, {
        logger: mockLogger,
      });

      deploymentsHexa.destroy();
    });
  });
});
