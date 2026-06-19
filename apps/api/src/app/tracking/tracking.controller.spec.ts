import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IDeploymentPort,
  TrackPluginInstallHeartbeatResponse,
  createMarketplaceId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ApiKeyService } from '@packmind/accounts';
import { TrackingController } from './tracking.controller';
import { TrackPluginInstallBodyDto } from './dto/TrackPluginInstallBody.dto';

describe('TrackingController', () => {
  const marketplaceId = createMarketplaceId(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  );

  const validToken = 'valid-tracking-token-123';
  const validApiKey = 'bearer-api-key-value';

  const baseBody: TrackPluginInstallBodyDto = {
    pluginSlug: 'my-plugin',
    marketplaceName: 'acme-marketplace',
    scope: 'user',
  };

  const heartbeatResponse: TrackPluginInstallHeartbeatResponse = {
    created: true,
    marketplaceId,
  };

  let mockDeploymentAdapter: jest.Mocked<
    Pick<IDeploymentPort, 'trackPluginInstallHeartbeat'>
  >;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockApiKeyService: { extractUserFromApiKey: jest.Mock };
  let controller: TrackingController;

  beforeEach(() => {
    mockDeploymentAdapter = {
      trackPluginInstallHeartbeat: jest
        .fn()
        .mockResolvedValue(heartbeatResponse),
    };

    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockApiKeyService = {
      extractUserFromApiKey: jest.fn().mockReturnValue(null),
    };

    controller = new TrackingController(
      mockDeploymentAdapter as unknown as IDeploymentPort,
      mockJwtService,
      stubLogger(),
    );

    // Patch the internal ApiKeyService on the controller instance
    // to use our mock, bypassing the constructor wiring.
    (
      controller as unknown as { apiKeyService: typeof mockApiKeyService }
    ).apiKeyService = mockApiKeyService as unknown as ApiKeyService;
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /tracking/plugin-installs', () => {
    describe('when tracking token header is missing', () => {
      it('throws UnauthorizedException', async () => {
        await expect(
          controller.trackPluginInstallHeartbeat(
            undefined,
            undefined,
            baseBody,
          ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('when tracking token header is empty', () => {
      it('throws UnauthorizedException', async () => {
        await expect(
          controller.trackPluginInstallHeartbeat('  ', undefined, baseBody),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('when the use case throws an UnauthorizedError (unknown token)', () => {
      beforeEach(() => {
        const err = new Error('Invalid tracking token');
        err.name = 'UnauthorizedError';
        mockDeploymentAdapter.trackPluginInstallHeartbeat.mockRejectedValue(
          err,
        );
      });

      it('maps UnauthorizedError to 401', async () => {
        await expect(
          controller.trackPluginInstallHeartbeat(
            validToken,
            undefined,
            baseBody,
          ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('when no Authorization header is provided (anonymous heartbeat)', () => {
      let result: TrackPluginInstallHeartbeatResponse;

      beforeEach(async () => {
        result = await controller.trackPluginInstallHeartbeat(
          validToken,
          undefined,
          baseBody,
        );
      });

      it('returns the heartbeat response', () => {
        expect(result).toEqual(heartbeatResponse);
      });

      it('calls trackPluginInstallHeartbeat with null verifiedUserId', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ verifiedUserId: null }),
        );
      });
    });

    describe('when Authorization header carries a valid API key', () => {
      const userId = 'user-uuid-1234';
      const orgId = 'org-uuid-5678';

      beforeEach(async () => {
        mockApiKeyService.extractUserFromApiKey.mockReturnValue({
          user: { userId, name: 'Alice' },
          organization: {
            id: orgId,
            name: 'Acme',
            slug: 'acme',
            role: 'member',
          },
        });

        await controller.trackPluginInstallHeartbeat(
          validToken,
          `Bearer ${validApiKey}`,
          baseBody,
        );
      });

      it('passes the verified userId from the API key', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ verifiedUserId: userId }),
        );
      });
    });

    describe('when Authorization header carries an invalid/expired API key', () => {
      beforeEach(async () => {
        mockApiKeyService.extractUserFromApiKey.mockReturnValue(null);

        await controller.trackPluginInstallHeartbeat(
          validToken,
          'Bearer invalid-expired-key',
          baseBody,
        );
      });

      it('degrades to anonymous (null verifiedUserId)', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ verifiedUserId: null }),
        );
      });
    });

    describe('when Authorization header has a malformed scheme', () => {
      beforeEach(async () => {
        await controller.trackPluginInstallHeartbeat(
          validToken,
          'Basic dXNlcjpwYXNz',
          baseBody,
        );
      });

      it('degrades to anonymous (null verifiedUserId)', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ verifiedUserId: null }),
        );
      });
    });

    describe('when a valid heartbeat is processed with all optional fields', () => {
      let result: TrackPluginInstallHeartbeatResponse;

      beforeEach(async () => {
        result = await controller.trackPluginInstallHeartbeat(
          validToken,
          undefined,
          {
            ...baseBody,
            scope: 'project',
            installedVersion: '0.1.0',
            repoRemoteUrl: 'https://github.com/acme/repo.git',
            anonymousIdHash: 'hash123',
            anonymousEmailMasked: 'al***@acme.com',
          },
        );
      });

      it('returns the response from the use case', () => {
        expect(result).toEqual(heartbeatResponse);
      });

      it('forwards all body fields to the adapter', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            pluginSlug: 'my-plugin',
            marketplaceName: 'acme-marketplace',
            scope: 'project',
            installedVersion: '0.1.0',
            repoRemoteUrl: 'https://github.com/acme/repo.git',
            anonymousIdHash: 'hash123',
            anonymousEmailMasked: 'al***@acme.com',
            trackingToken: validToken,
          }),
        );
      });
    });

    describe('when the heartbeat omits the installed version', () => {
      beforeEach(async () => {
        await controller.trackPluginInstallHeartbeat(
          validToken,
          undefined,
          baseBody,
        );
      });

      it('forwards installedVersion as null', () => {
        expect(
          mockDeploymentAdapter.trackPluginInstallHeartbeat,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ installedVersion: null }),
        );
      });
    });
  });
});
