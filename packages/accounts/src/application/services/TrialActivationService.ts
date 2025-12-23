import { v4 as uuidv4 } from 'uuid';
import {
  TrialActivation,
  TrialActivationToken,
  UserId,
  createTrialActivationToken,
  createTrialActivationTokenId,
} from '@packmind/types';
import { ITrialActivationRepository } from '../../domain/repositories/ITrialActivationRepository';
import { PackmindLogger } from '@packmind/logger';
import { IJwtService } from './ApiKeyService';

const origin = 'TrialActivationService';
const TRIAL_ACTIVATION_EXPIRATION_MINUTES = 5;

export class TrialActivationService {
  constructor(
    private readonly trialActivationRepository: ITrialActivationRepository,
    private readonly jwtService: IJwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TrialActivationService initialized');
  }

  async generateTrialActivationToken(userId: UserId): Promise<TrialActivation> {
    this.logger.info('Generating trial activation token', { userId });

    const expirationDate = new Date(
      Date.now() + TRIAL_ACTIVATION_EXPIRATION_MINUTES * 60 * 1000,
    );

    // Create JWT payload with userId (expiration is set via sign options)
    const jwtPayload: Record<string, unknown> = {
      userId: userId as string,
      type: 'trial_activation',
    };

    // Sign the JWT token with explicit expiration to override any global settings
    const signedToken = this.jwtService.sign(jwtPayload, {
      expiresIn: `${TRIAL_ACTIVATION_EXPIRATION_MINUTES}m`,
    });

    // Create the trial activation entity
    const trialActivation: TrialActivation = {
      id: createTrialActivationTokenId(uuidv4()),
      userId,
      token: createTrialActivationToken(signedToken),
      expirationDate,
    };

    // Save to database
    const savedTrialActivation =
      await this.trialActivationRepository.add(trialActivation);

    this.logger.info('Trial activation token generated successfully', {
      trialActivationId: savedTrialActivation.id,
      userId,
    });

    return savedTrialActivation;
  }

  async findByToken(
    token: TrialActivationToken,
  ): Promise<TrialActivation | null> {
    this.logger.info('Finding trial activation by token');
    return this.trialActivationRepository.findByToken(token);
  }

  async findLatestByUserId(userId: UserId): Promise<TrialActivation | null> {
    this.logger.info('Finding latest trial activation by user id', { userId });
    return this.trialActivationRepository.findLatestByUserId(userId);
  }

  async delete(trialActivation: TrialActivation): Promise<void> {
    this.logger.info('Deleting trial activation', { id: trialActivation.id });
    await this.trialActivationRepository.delete(trialActivation.id);
  }

  async validateTokenForUser(
    token: TrialActivationToken,
    userId: UserId,
  ): Promise<{ valid: boolean; trialActivation?: TrialActivation }> {
    this.logger.info('Validating trial activation token for user', { userId });

    const trialActivation =
      await this.trialActivationRepository.findByToken(token);

    if (!trialActivation) {
      this.logger.info('Trial activation token not found');
      return { valid: false };
    }

    if (trialActivation.userId !== userId) {
      this.logger.info('Trial activation token does not belong to user', {
        tokenUserId: trialActivation.userId,
        requestedUserId: userId,
      });
      return { valid: false };
    }

    if (trialActivation.expirationDate < new Date()) {
      this.logger.info('Trial activation token has expired', {
        expirationDate: trialActivation.expirationDate,
      });
      return { valid: false };
    }

    this.logger.info('Trial activation token is valid', { userId });
    return { valid: true, trialActivation };
  }
}
