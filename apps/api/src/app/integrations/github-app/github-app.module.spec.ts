import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAppController } from './github-app.controller';
import { GitHubAppWebhookController } from './github-app-webhook.controller';
import {
  ACCOUNTS_ADAPTER_TOKEN,
  GIT_ADAPTER_TOKEN,
} from '../../shared/HexaRegistryModule';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { RecipesService } from '../../organizations/spaces/recipes/recipes.service';

describe('GitHubAppModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [GitHubAppController, GitHubAppWebhookController],
      providers: [
        {
          provide: GIT_ADAPTER_TOKEN,
          useValue: {
            buildGitHubAppManifest: jest.fn(),
            registerGitHubAppFromManifest: jest.fn(),
            getGitHubAppStatus: jest.fn(),
            linkGitHubAppInstallation: jest.fn(),
            unlinkGitHubAppInstallation: jest.fn(),
            listInstallationRepositories: jest.fn(),
            importInstallationRepositories: jest.fn(),
            getGitHubAppConfig: jest.fn(),
            getGitProviderByInstallationId: jest.fn(),
          },
        },
        {
          provide: ACCOUNTS_ADAPTER_TOKEN,
          useValue: {
            findOrganizationAdmins: jest.fn(),
          },
        },
        {
          provide: RecipesService,
          useValue: { updateRecipesFromGitHub: jest.fn() },
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();
  });

  afterEach(() => jest.clearAllMocks());

  it('compiles the module with both controllers', () => {
    expect(module.get(GitHubAppController)).toBeDefined();
    expect(module.get(GitHubAppWebhookController)).toBeDefined();
  });
});
