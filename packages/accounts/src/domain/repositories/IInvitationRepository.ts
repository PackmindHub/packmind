import { IRepository } from '@packmind/types';
import { QueryOption } from '@packmind/types';
import {
  Invitation,
  InvitationToken,
  InvitationId,
} from '../entities/Invitation';
import { UserId } from '@packmind/types';

export interface IInvitationRepository extends IRepository<Invitation> {
  addMany(invitations: Invitation[]): Promise<Invitation[]>;

  /**
   * Tokens are stored encrypted, so the caller passes the plaintext token and
   * the implementation encrypts it to build the lookup. This only works because
   * that encryption is deterministic.
   */
  findByToken(
    token: InvitationToken,
    opts?: QueryOption,
  ): Promise<Invitation | null>;

  findById(id: InvitationId): Promise<Invitation | null>;

  findByUserId(userId: UserId): Promise<Invitation[]>;

  findLatestByUserId(userId: UserId): Promise<Invitation | null>;

  findByUserIds(userIds: UserId[]): Promise<Invitation[]>;

  // Superseded by findByUserIds; no caller left outside its own spec.
  listByUserIds(userIds: UserId[], opts?: QueryOption): Promise<Invitation[]>;

  save(invitation: Invitation): Promise<Invitation>;

  delete(id: InvitationId): Promise<void>;
}
