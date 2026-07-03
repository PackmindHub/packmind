import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Organization, User, UserOrganizationRole } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { TokenResponse } from '../auth/auth.service';

const origin = 'TrialTokenService';

export interface ITrialTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
}

/**
 * Signs and verifies the JWT handed to trial users so they can authenticate
 * their local agent/CLI against the Packmind API during the quick-start flow.
 */
@Injectable()
export class TrialTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TrialTokenService initialized');
  }

  generateTokenForUser(
    user: User,
    organization: Organization,
    role: UserOrganizationRole,
  ): TokenResponse {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      user: {
        name: user.email,
        userId: user.id,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
      },
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.info('Trial token generated successfully', {
      userId: user.id,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
    };
  }

  verifyToken(token: string): ITrialTokenPayload {
    return this.jwtService.verify<ITrialTokenPayload>(token);
  }
}
