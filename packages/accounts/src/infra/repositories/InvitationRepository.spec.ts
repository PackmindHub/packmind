import { DataSource } from 'typeorm';
import { InvitationRepository } from './InvitationRepository';
import {
  Invitation,
  createInvitationToken,
} from '../../domain/entities/Invitation';
import { createUserId, User } from '@packmind/types';
import { InvitationSchema } from '../schemas/InvitationSchema';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { createOrganizationId, OrganizationId } from '@packmind/types';
import {
  invitationFactory,
  organizationFactory,
  userFactory,
} from '../../../test';

// Mock Configuration to prevent excessive logging
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('InvitationRepository', () => {
  let dataSource: DataSource;
  let repository: InvitationRepository;
  let logger: jest.Mocked<PackmindLogger>;
  let user: User;
  let organizationId: OrganizationId;

  const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

  beforeAll(() => {
    mockConfiguration.getConfig.mockResolvedValue('test-invitation-key');
  });

  afterEach(() => {
    mockConfiguration.getConfig.mockClear();
  });

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([
      InvitationSchema,
      UserSchema,
      OrganizationSchema,
      UserOrganizationMembershipSchema,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    repository = new InvitationRepository(
      dataSource.getRepository(InvitationSchema),
      logger,
    );

    const organization = await dataSource
      .getRepository(OrganizationSchema)
      .save(organizationFactory());
    organizationId = createOrganizationId(organization.id);

    const userId = createUserId('123e4567-e89b-12d3-a456-426614174210');
    user = await dataSource.getRepository(UserSchema).save(
      userFactory({
        id: userId,
        email: 'primary-user@packmind.com',
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      }),
    );
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('.add', () => {
    it('returns decrypted token after saving', async () => {
      const invitation = invitationFactory({
        userId: user.id,
        token: createInvitationToken('plain-token'),
      });

      const saved = await repository.add(invitation);

      expect(saved.token).toEqual(invitation.token);
    });

    it('encrypts token at rest in database', async () => {
      const invitation = invitationFactory({
        userId: user.id,
        token: createInvitationToken('plain-token'),
      });

      await repository.add(invitation);

      const persisted = await dataSource
        .getRepository(InvitationSchema)
        .findOneByOrFail({ id: invitation.id });

      expect(persisted.token).not.toEqual(invitation.token);
    });

    it('stores encrypted token with separator character', async () => {
      const invitation = invitationFactory({
        userId: user.id,
        token: createInvitationToken('plain-token'),
      });

      await repository.add(invitation);

      const persisted = await dataSource
        .getRepository(InvitationSchema)
        .findOneByOrFail({ id: invitation.id });

      expect(persisted.token.includes(':')).toBe(true);
    });
  });

  describe('.addMany', () => {
    describe('when adding multiple invitations', () => {
      let invitations: Invitation[];
      let saved: Invitation[];

      beforeEach(async () => {
        invitations = [
          invitationFactory({ userId: user.id }),
          invitationFactory({
            userId: createUserId('223e4567-e89b-12d3-a456-426614174211'),
          }),
        ];

        const secondUserId = invitations[1].userId;
        await dataSource.getRepository(UserSchema).save(
          userFactory({
            id: secondUserId,
            email: 'second-user@packmind.com',
            memberships: [
              {
                userId: secondUserId,
                organizationId,
                role: 'admin',
              },
            ],
          }),
        );

        saved = await repository.addMany(invitations);
      });

      it('returns the correct number of invitations', async () => {
        expect(saved).toHaveLength(2);
      });

      it('returns invitations with matching identifiers', async () => {
        expect(saved.map((invitation) => invitation.id)).toEqual(
          invitations.map((invitation) => invitation.id),
        );
      });
    });

    it('returns an empty array if called with no invitations', async () => {
      const saved = await repository.addMany([]);

      expect(saved).toEqual([]);
    });
  });

  describe('.findByToken', () => {
    it('finds an invitation by token hash', async () => {
      const invitation = await repository.add(
        invitationFactory({ userId: user.id }),
      );

      const result = await repository.findByToken(invitation.token);

      expect(result).toEqual(invitation);
    });

    it('returns null if token does not exist', async () => {
      const result = await repository.findByToken(
        createInvitationToken('non-existent'),
      );

      expect(result).toBeNull();
    });
  });

  describe('.findByUserId', () => {
    describe('when user has multiple invitations', () => {
      let firstInvitation: Invitation;
      let secondInvitation: Invitation;
      let result: Invitation[];

      beforeEach(async () => {
        firstInvitation = await repository.add(
          invitationFactory({ userId: user.id }),
        );

        secondInvitation = await repository.add(
          invitationFactory({ userId: user.id }),
        );

        result = await repository.findByUserId(user.id);
      });

      it('returns all invitations for the user', async () => {
        expect(result).toHaveLength(2);
      });

      it('returns invitations ordered by expiration date descending', async () => {
        expect(result.map((inv) => inv.id)).toEqual([
          secondInvitation.id,
          firstInvitation.id,
        ]);
      });
    });

    it('returns empty array if no invitation exists for user', async () => {
      const result = await repository.findByUserId(
        createUserId('323e4567-e89b-12d3-a456-426614174212'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('.listByUserIds', () => {
    describe('when querying for multiple users', () => {
      let invitationForUser: Invitation;
      let invitationForAnotherUser: Invitation;
      let result: Invitation[];

      beforeEach(async () => {
        const anotherUserId = createUserId(
          '423e4567-e89b-12d3-a456-426614174213',
        );

        await dataSource.getRepository(UserSchema).save(
          userFactory({
            id: anotherUserId,
            email: 'another-user@packmind.com',
            memberships: [
              {
                userId: anotherUserId,
                organizationId,
                role: 'admin',
              },
            ],
          }),
        );

        invitationForUser = await repository.add(
          invitationFactory({ userId: user.id }),
        );
        invitationForAnotherUser = await repository.add(
          invitationFactory({ userId: anotherUserId }),
        );

        result = await repository.listByUserIds([user.id, anotherUserId]);
      });

      it('returns the correct number of invitations', async () => {
        expect(result).toHaveLength(2);
      });

      it('returns invitations for all provided users', async () => {
        expect(result).toEqual(
          expect.arrayContaining([invitationForUser, invitationForAnotherUser]),
        );
      });
    });

    it('returns an empty array if provided no user identifiers', async () => {
      const result = await repository.listByUserIds([]);

      expect(result).toEqual([]);
    });
  });
});
