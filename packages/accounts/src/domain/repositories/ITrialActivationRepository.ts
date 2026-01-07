import { IRepository } from '@packmind/types';
import {
  TrialActivation,
  TrialActivationToken,
  TrialActivationTokenId,
} from '@packmind/types';
import { UserId } from '@packmind/types';

/**
 * Trial activation repository contract exposing persistence operations required by
 * trial activation use cases.
 */
export interface ITrialActivationRepository extends IRepository<TrialActivation> {
  /**
   * Find a trial activation by its token value.
   */
  findByToken(token: TrialActivationToken): Promise<TrialActivation | null>;

  /**
   * Find a trial activation by its ID.
   */
  findById(id: TrialActivationTokenId): Promise<TrialActivation | null>;

  /**
   * Retrieve trial activations for a given user identifier.
   */
  findByUserId(userId: UserId): Promise<TrialActivation[]>;

  /**
   * Retrieve the latest trial activation created for a given user identifier.
   */
  findLatestByUserId(userId: UserId): Promise<TrialActivation | null>;

  /**
   * Save a trial activation.
   */
  save(trialActivation: TrialActivation): Promise<TrialActivation>;

  /**
   * Delete a trial activation by ID.
   */
  delete(id: TrialActivationTokenId): Promise<void>;
}
