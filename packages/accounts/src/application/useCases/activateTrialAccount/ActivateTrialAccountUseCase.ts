import slug from 'slug';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import {
  ActivateTrialAccountCommand,
  ActivateTrialAccountResult,
  IActivateTrialAccountUseCase,
  createTrialActivationToken,
  AnonymousTrialAccountActivatedEvent,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { TrialActivationService } from '../../services/TrialActivationService';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { InvalidTrialActivationTokenError } from '../../../domain/errors';

const origin = 'ActivateTrialAccountUseCase';

export class ActivateTrialAccountUseCase
  implements IActivateTrialAccountUseCase
{
  private readonly logger: PackmindLogger;

  constructor(
    private readonly trialActivationService: TrialActivationService,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger = logger;
    this.logger.info('ActivateTrialAccountUseCase initialized');
  }

  async execute(
    command: ActivateTrialAccountCommand,
  ): Promise<ActivateTrialAccountResult> {
    this.logger.info('Activating trial account', {
      email: maskEmail(command.email),
      organizationName: command.organizationName,
    });

    const token = createTrialActivationToken(command.activationToken);

    // Find and validate the trial activation token
    const trialActivation =
      await this.trialActivationService.findByToken(token);

    if (!trialActivation) {
      this.logger.info('Trial activation token not found');
      throw new InvalidTrialActivationTokenError();
    }

    if (trialActivation.expirationDate < new Date()) {
      this.logger.info('Trial activation token has expired', {
        expirationDate: trialActivation.expirationDate,
      });
      throw new InvalidTrialActivationTokenError();
    }

    const userId = trialActivation.userId;

    // Get the current user
    const currentUser = await this.userService.getUserById(userId);
    if (!currentUser) {
      this.logger.error('User not found for trial activation', { userId });
      throw new Error('User not found');
    }

    // Get the organization from the user's membership
    const membership = currentUser.memberships?.[0];
    if (!membership) {
      this.logger.error('User has no organization membership', { userId });
      throw new Error('User has no organization');
    }

    const currentOrganization =
      await this.organizationService.getOrganizationById(
        membership.organizationId,
      );
    if (!currentOrganization) {
      this.logger.error('Organization not found', {
        organizationId: membership.organizationId,
      });
      throw new Error('Organization not found');
    }

    // Hash the new password
    const passwordHash = await this.userService.hashPassword(command.password);

    // Update user with new email and password, and mark as non-trial
    const updatedUser = await this.userService.updateUser({
      ...currentUser,
      email: command.email,
      passwordHash,
      trial: false,
    });

    // Update organization with new name and slug
    const newSlug = slug(command.organizationName);
    const updatedOrganization =
      await this.organizationService.updateOrganization({
        ...currentOrganization,
        name: command.organizationName,
        slug: newSlug,
      });

    // Delete the used trial activation token
    await this.trialActivationService.delete(trialActivation);

    // Emit trial account activated event
    this.eventEmitterService.emit(
      new AnonymousTrialAccountActivatedEvent({
        userId,
        organizationId: updatedOrganization.id,
        email: command.email,
      }),
    );

    this.logger.info('Trial account activated successfully', {
      userId: String(userId),
      email: maskEmail(command.email),
      organizationId: String(updatedOrganization.id),
      organizationName: command.organizationName,
    });

    return {
      user: updatedUser,
      organization: updatedOrganization,
    };
  }
}
