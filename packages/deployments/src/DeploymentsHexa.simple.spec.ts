import { AccountsHexa } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { GitHexa } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import {
  IAccountsPortName,
  ICodingAgentPortName,
  IGitPortName,
  IRecipesPortName,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DeploymentsHexa } from './DeploymentsHexa';

describe('DeploymentsHexa - Simple Integration', () => {
  let mockRegistry: HexaRegistry;
  let mockDataSource: DataSource;
  let mockLogger: PackmindLogger;
  let mockCodingAgentHexa: jest.Mocked<CodingAgentHexa>;
  let mockGitHexa: jest.Mocked<GitHexa>;
  let mockRecipesHexa: jest.Mocked<RecipesHexa>;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;
  let mockSpacesHexa: jest.Mocked<SpacesHexa>;
  let mockAccountsHexa: jest.Mocked<AccountsHexa>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock CodingAgentHexa
    const mockCodingAgentAdapter = {
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
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockCodingAgentHexa = {
      getAdapter: jest.fn().mockReturnValue(mockCodingAgentAdapter),
      getCodingAgentDeployerRegistry: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock GitHexa
    const mockGitAdapter = {
      commitToGit: jest.fn().mockResolvedValue({
        id: 'commit-123',
        sha: 'abc123def456789',
        message: 'Deploy recipes to repository',
        author: 'Packmind Deployments',
        url: 'https://github.com/test-org/test-repo/commit/abc123def456789',
      }),
      getRepositoryById: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockGitHexa = {
      getAdapter: jest.fn().mockReturnValue(mockGitAdapter),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock RecipesHexa
    const mockRecipesAdapter = {
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
      getRecipeVersionById: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockRecipesHexa = {
      getAdapter: jest.fn().mockReturnValue(mockRecipesAdapter),
      getRecipeById: jest.fn(),
      getRecipeVersionById: jest.fn(),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock StandardsHexa
    const mockStandardsAdapter = {
      getStandardVersionById: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getStandard: jest.fn(),
      listStandardVersions: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockStandardsHexa = {
      getAdapter: jest.fn().mockReturnValue(mockStandardsAdapter),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock SpacesHexa
    const mockSpacesAdapter = {
      getSpaceById: jest.fn(),
      listSpacesByOrganization: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockSpacesHexa = {
      getAdapter: jest.fn().mockReturnValue(mockSpacesAdapter),
      destroy: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Create mock AccountsHexa (implements both UserProvider and OrganizationProvider)
    const mockAccountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    mockAccountsHexa = {
      getAdapter: jest.fn().mockReturnValue(mockAccountsAdapter),
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
        if (type === SpacesHexa) {
          return mockSpacesHexa;
        }
        if (type === AccountsHexa) {
          return mockAccountsHexa;
        }
        return null;
      }),
      getAdapter: jest.fn().mockImplementation((portName: string) => {
        if (portName === IGitPortName) {
          return mockGitHexa.getAdapter();
        }
        if (portName === ICodingAgentPortName) {
          return mockCodingAgentHexa.getAdapter();
        }
        if (portName === IRecipesPortName) {
          return mockRecipesHexa.getAdapter();
        }
        if (portName === IStandardsPortName) {
          return mockStandardsHexa.getAdapter();
        }
        if (portName === ISpacesPortName) {
          return mockSpacesHexa.getAdapter();
        }
        if (portName === IAccountsPortName) {
          return mockAccountsHexa.getAdapter();
        }
        throw new Error(`No hexa found for port type: ${portName}`);
      }),
      getDataSource: jest.fn().mockReturnValue(mockDataSource),
      register: jest.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  describe('constructor', () => {
    it('initializes successfully with valid dependencies', () => {
      expect(() => {
        new DeploymentsHexa(mockDataSource, { logger: mockLogger });
      }).not.toThrow();
    });
  });

  describe('initialize', () => {
    it('initializes successfully with valid dependencies', async () => {
      const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
        logger: mockLogger,
      });
      await expect(
        deploymentsHexa.initialize(mockRegistry),
      ).resolves.not.toThrow();
    });

    describe('when CodingAgentHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              return mockGitHexa.getAdapter();
            }
            if (portName === IRecipesPortName) {
              return mockRecipesHexa.getAdapter();
            }
            if (portName === IStandardsPortName) {
              return mockStandardsHexa.getAdapter();
            }
            if (portName === ISpacesPortName) {
              return mockSpacesHexa.getAdapter();
            }
            if (portName === IAccountsPortName) {
              return mockAccountsHexa.getAdapter();
            }
            if (portName === ICodingAgentPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });

    describe('when GitHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            if (portName === IRecipesPortName) {
              return mockRecipesHexa.getAdapter();
            }
            if (portName === IStandardsPortName) {
              return mockStandardsHexa.getAdapter();
            }
            if (portName === ISpacesPortName) {
              return mockSpacesHexa.getAdapter();
            }
            if (portName === IAccountsPortName) {
              return mockAccountsHexa.getAdapter();
            }
            if (portName === ICodingAgentPortName) {
              return mockCodingAgentHexa.getAdapter();
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });

    describe('when RecipesHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              return mockGitHexa.getAdapter();
            }
            if (portName === IRecipesPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            if (portName === IStandardsPortName) {
              return mockStandardsHexa.getAdapter();
            }
            if (portName === ISpacesPortName) {
              return mockSpacesHexa.getAdapter();
            }
            if (portName === IAccountsPortName) {
              return mockAccountsHexa.getAdapter();
            }
            if (portName === ICodingAgentPortName) {
              return mockCodingAgentHexa.getAdapter();
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });

    describe('when StandardsHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              return mockGitHexa.getAdapter();
            }
            if (portName === IRecipesPortName) {
              return mockRecipesHexa.getAdapter();
            }
            if (portName === IStandardsPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            if (portName === ISpacesPortName) {
              return mockSpacesHexa.getAdapter();
            }
            if (portName === IAccountsPortName) {
              return mockAccountsHexa.getAdapter();
            }
            if (portName === ICodingAgentPortName) {
              return mockCodingAgentHexa.getAdapter();
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });

    describe('when SpacesHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              return mockGitHexa.getAdapter();
            }
            if (portName === IRecipesPortName) {
              return mockRecipesHexa.getAdapter();
            }
            if (portName === IStandardsPortName) {
              return mockStandardsHexa.getAdapter();
            }
            if (portName === ISpacesPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            if (portName === IAccountsPortName) {
              return mockAccountsHexa.getAdapter();
            }
            if (portName === ICodingAgentPortName) {
              return mockCodingAgentHexa.getAdapter();
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });

    describe('when AccountsHexa is not in registry', () => {
      it('throws error', async () => {
        mockRegistry.getAdapter = jest
          .fn()
          .mockImplementation((portName: string) => {
            if (portName === IGitPortName) {
              return mockGitHexa.getAdapter();
            }
            if (portName === IRecipesPortName) {
              return mockRecipesHexa.getAdapter();
            }
            if (portName === IStandardsPortName) {
              return mockStandardsHexa.getAdapter();
            }
            if (portName === ISpacesPortName) {
              return mockSpacesHexa.getAdapter();
            }
            if (portName === IAccountsPortName) {
              throw new Error(`No hexa found for port type: ${portName}`);
            }
            if (portName === ICodingAgentPortName) {
              return mockCodingAgentHexa.getAdapter();
            }
            throw new Error(`No hexa found for port type: ${portName}`);
          });

        const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
          logger: mockLogger,
        });
        await expect(
          deploymentsHexa.initialize(mockRegistry),
        ).rejects.toThrow();
      });
    });
  });

  describe('destroy', () => {
    it('cleans up resources', async () => {
      const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
        logger: mockLogger,
      });
      await deploymentsHexa.initialize(mockRegistry);

      deploymentsHexa.destroy();
    });
  });

  describe('getAdapter', () => {
    it('returns the deployment port', async () => {
      const deploymentsHexa = new DeploymentsHexa(mockDataSource, {
        logger: mockLogger,
      });
      await deploymentsHexa.initialize(mockRegistry);

      const adapter = deploymentsHexa.getAdapter();
      expect(adapter).toBeDefined();
    });
  });
});
