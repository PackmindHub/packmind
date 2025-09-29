import { IRepository, QueryOption } from '@packmind/shared';
import {
  Invitation,
  InvitationToken,
  InvitationId,
} from '../entities/Invitation';
import { UserId } from '../entities/User';

/**
 * Invitation repository contract exposing persistence operations required by
 * invitation use cases.
 */
export interface IInvitationRepository extends IRepository<Invitation> {
  /**
   * Persist a collection of invitations in a single transaction.
   */
  addMany(invitations: Invitation[]): Promise<Invitation[]>;

  /**
   * Find an invitation by its deterministically encrypted token value.
   */
  findByToken(
    token: InvitationToken,
    opts?: QueryOption,
  ): Promise<Invitation | null>;

  /**
   * Find an invitation by its ID.
   */
  findById(id: InvitationId): Promise<Invitation | null>;

  /**
   * Retrieve invitations for a given user identifier.
   */
  findByUserId(userId: UserId): Promise<Invitation[]>;

  /**
   * Retrieve the latest invitation created for a given user identifier.
   */
  findLatestByUserId(userId: UserId): Promise<Invitation | null>;

  /**
   * Fetch invitations for the provided user identifiers.
   */
  findByUserIds(userIds: UserId[]): Promise<Invitation[]>;

  /**
   * Fetch invitations for the provided user identifiers (legacy method).
   */
  listByUserIds(userIds: UserId[], opts?: QueryOption): Promise<Invitation[]>;

  /**
   * Save an invitation.
   */
  save(invitation: Invitation): Promise<Invitation>;

  /**
   * Delete an invitation by ID.
   */
  delete(id: InvitationId): Promise<void>;
}
