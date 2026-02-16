import { Injectable, Logger } from '@nestjs/common';
import { WorkOS } from '@workos-inc/node';
import { Configuration } from '@packmind/node-utils';
import type { SocialProvider } from '@packmind/types';
import { SOCIAL_PROVIDERS } from '@packmind/types';

@Injectable()
export class WorkOsService {
  private readonly logger = new Logger(WorkOsService.name);
  private workos: WorkOS | null = null;
  private clientId: string | null = null;
  private redirectUri: string | null = null;
  private initialized = false;

  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return this.workos !== null;
    }

    this.initialized = true;

    const apiKey = await Configuration.getConfig('WORKOS_API_KEY');
    const clientId = await Configuration.getConfig('WORKOS_CLIENT_ID');
    const redirectUri = await Configuration.getConfig('WORKOS_REDIRECT_URI');

    if (!apiKey || !clientId || !redirectUri) {
      this.logger.log(
        'WorkOS not configured - social login disabled (missing WORKOS_API_KEY, WORKOS_CLIENT_ID, or WORKOS_REDIRECT_URI)',
      );
      return false;
    }

    this.workos = new WorkOS(apiKey);
    this.clientId = clientId;
    this.redirectUri = redirectUri;

    this.logger.log('WorkOS initialized successfully');
    return true;
  }

  async isConfigured(): Promise<boolean> {
    return this.ensureInitialized();
  }

  async getAvailableProviders(): Promise<SocialProvider[]> {
    const configured = await this.ensureInitialized();
    if (!configured) {
      return [];
    }
    return [...SOCIAL_PROVIDERS];
  }

  async getAuthorizationUrl(
    provider: SocialProvider,
    state: string,
  ): Promise<string> {
    const configured = await this.ensureInitialized();
    if (!configured || !this.workos || !this.clientId || !this.redirectUri) {
      throw new Error('WorkOS is not configured');
    }

    return this.workos.userManagement.getAuthorizationUrl({
      provider,
      redirectUri: this.redirectUri,
      clientId: this.clientId,
      state,
    });
  }

  async authenticateWithCode(
    code: string,
  ): Promise<{ email: string; firstName?: string; lastName?: string }> {
    const configured = await this.ensureInitialized();
    if (!configured || !this.workos || !this.clientId) {
      throw new Error('WorkOS is not configured');
    }

    try {
      const response = await this.workos.userManagement.authenticateWithCode({
        code,
        clientId: this.clientId,
      });

      return {
        email: response.user.email,
        firstName: response.user.firstName ?? undefined,
        lastName: response.user.lastName ?? undefined,
      };
    } catch (error: unknown) {
      // Handle email verification required error (GitHub, Microsoft OAuth).
      // WorkOS requires email verification for these providers, but the OAuth
      // provider already verified the email. We extract the email from the
      // error response and return it directly.
      // Handle email verification required error (GitHub, Microsoft OAuth).
      // WorkOS requires email verification for these providers, but the OAuth
      // provider already verified the email. We extract the email from the
      // error response and return it directly.
      const err = error as Record<string, unknown>;
      const rawData = err.rawData as Record<string, unknown> | undefined;

      if (
        rawData &&
        rawData.code === 'email_verification_required' &&
        typeof rawData.email === 'string'
      ) {
        this.logger.log(
          'Email verification required by WorkOS - using email from OAuth provider directly',
        );
        return { email: rawData.email };
      }

      throw error;
    }
  }
}
