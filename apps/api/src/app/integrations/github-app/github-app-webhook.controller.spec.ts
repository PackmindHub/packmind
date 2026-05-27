import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { GitHubAppWebhookController } from './github-app-webhook.controller';
import { PackmindLogger } from '@packmind/logger';
import { GIT_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';
import { stubLogger } from '@packmind/test-utils';
import { RecipesService } from '../../organizations/spaces/recipes/recipes.service';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { createHmac } from 'crypto';
import { GitHubWebhookSignatureVerifier } from '@packmind/git';

const WEBHOOK_SECRET = 'test-secret';

function makeSignature(body: Buffer, secret: string): string {
  const hex = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hex}`;
}

function makeMockRequest(
  body: unknown,
  rawBody?: Buffer,
): RawBodyRequest<Request> {
  return {
    body,
    rawBody: rawBody ?? Buffer.from(JSON.stringify(body)),
  } as unknown as RawBodyRequest<Request>;
}

describe('GitHubAppWebhookController', () => {
  let controller: GitHubAppWebhookController;
  let mockRecipesService: jest.Mocked<
    Pick<RecipesService, 'updateRecipesFromGitHub'>
  >;
  let mockGitAdapter: {
    getGitHubAppConfig: jest.Mock;
    getGitProviderByInstallationId: jest.Mock;
  };
  let mockVerifier: jest.Mocked<GitHubWebhookSignatureVerifier>;

  beforeAll(async () => {
    mockRecipesService = {
      updateRecipesFromGitHub: jest.fn(),
    };

    mockGitAdapter = {
      getGitHubAppConfig: jest.fn().mockResolvedValue({
        webhookSecret: WEBHOOK_SECRET,
      }),
      getGitProviderByInstallationId: jest.fn(),
    };

    mockVerifier = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<GitHubWebhookSignatureVerifier>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubAppWebhookController],
      providers: [
        {
          provide: GIT_ADAPTER_TOKEN,
          useValue: mockGitAdapter,
        },
        {
          provide: RecipesService,
          useValue: mockRecipesService,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    controller = module.get<GitHubAppWebhookController>(
      GitHubAppWebhookController,
    );

    Object.assign(controller, { verifier: mockVerifier });
  });

  afterEach(() => jest.clearAllMocks());

  describe('when signature is invalid', () => {
    it('throws UnauthorizedException', async () => {
      mockGitAdapter.getGitHubAppConfig.mockResolvedValue({
        webhookSecret: WEBHOOK_SECRET,
      });
      mockVerifier.verify.mockReturnValue(false);

      const body = { action: 'push' };
      const rawBody = Buffer.from(JSON.stringify(body));

      await expect(
        controller.handleWebhook(
          makeMockRequest(body, rawBody),
          'sha256=invalid',
          'push',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when signature is valid and event is push', () => {
    it('dispatches recipe update with the correct organizationId', async () => {
      const installationId = 42;
      const organizationId = 'org-abc';

      mockVerifier.verify.mockReturnValue(true);
      mockGitAdapter.getGitProviderByInstallationId.mockResolvedValue({
        id: 'provider-1',
        organizationId,
      });
      mockRecipesService.updateRecipesFromGitHub.mockResolvedValue([]);

      const body = {
        installation: { id: installationId },
        repository: { full_name: 'owner/repo' },
        ref: 'refs/heads/main',
      };
      const rawBody = Buffer.from(JSON.stringify(body));
      const signature = makeSignature(rawBody, WEBHOOK_SECRET);

      await controller.handleWebhook(
        makeMockRequest(body, rawBody),
        signature,
        'push',
      );

      expect(
        mockGitAdapter.getGitProviderByInstallationId,
      ).toHaveBeenCalledWith(installationId);
      expect(mockRecipesService.updateRecipesFromGitHub).toHaveBeenCalled();
    });
  });

  describe('when event is installation', () => {
    it('returns without dispatching recipe update', async () => {
      mockVerifier.verify.mockReturnValue(true);

      const body = { action: 'created' };
      const rawBody = Buffer.from(JSON.stringify(body));

      await controller.handleWebhook(
        makeMockRequest(body, rawBody),
        'sha256=valid',
        'installation',
      );

      expect(mockRecipesService.updateRecipesFromGitHub).not.toHaveBeenCalled();
    });
  });

  describe('when event is unknown', () => {
    it('returns without dispatching recipe update', async () => {
      mockVerifier.verify.mockReturnValue(true);

      const body = { action: 'some_action' };
      const rawBody = Buffer.from(JSON.stringify(body));

      await controller.handleWebhook(
        makeMockRequest(body, rawBody),
        'sha256=valid',
        'unknown_event',
      );

      expect(mockRecipesService.updateRecipesFromGitHub).not.toHaveBeenCalled();
    });
  });

  describe('when push event has no matching installation', () => {
    it('returns without dispatching recipe update', async () => {
      mockVerifier.verify.mockReturnValue(true);
      mockGitAdapter.getGitProviderByInstallationId.mockResolvedValue(null);

      const body = {
        installation: { id: 999 },
        repository: { full_name: 'owner/repo' },
        ref: 'refs/heads/main',
      };
      const rawBody = Buffer.from(JSON.stringify(body));

      await controller.handleWebhook(
        makeMockRequest(body, rawBody),
        'sha256=valid',
        'push',
      );

      expect(mockRecipesService.updateRecipesFromGitHub).not.toHaveBeenCalled();
    });
  });
});
