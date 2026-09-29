import { ForbiddenException } from '@nestjs/common';
import { stubLogger } from '@packmind/test-utils';
import {
  ISpacesPort,
  UserSpaceMembership,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { SSESubscriptionAuthorizer } from './sse-subscription.authorizer';

const userId = createUserId('0f1d4a5e-7b2c-4d8e-9f31-5a6b7c8d9e01');
const organizationId = createOrganizationId(
  '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
);
const otherOrganizationId = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const spaceId = '2b3c4d5e-6f70-4812-9a3b-4c5d6e7f8091';

describe('SSESubscriptionAuthorizer', () => {
  let spacesAdapter: jest.Mocked<Pick<ISpacesPort, 'findMembership'>>;
  let authorizer: SSESubscriptionAuthorizer;

  beforeEach(() => {
    spacesAdapter = { findMembership: jest.fn() };
    authorizer = new SSESubscriptionAuthorizer(
      spacesAdapter as unknown as ISpacesPort,
      stubLogger(),
    );
  });

  describe('when the event type is not declared', () => {
    it('refuses the subscription', async () => {
      await expect(
        authorizer.assertMaySubscribe({
          userId,
          organizationId,
          eventType: 'SOMETHING_INVENTED',
          params: [spaceId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not look up a membership', async () => {
      await authorizer
        .assertMaySubscribe({
          userId,
          organizationId,
          eventType: 'SOMETHING_INVENTED',
          params: [spaceId],
        })
        .catch(() => undefined);

      expect(spacesAdapter.findMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the publisher names its recipients', () => {
    it('allows the subscription', async () => {
      await expect(
        authorizer.assertMaySubscribe({
          userId,
          organizationId,
          eventType: 'USER_CONTEXT_CHANGE',
          params: [],
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('when the event type is scoped to a space', () => {
    describe('and the caller is a member', () => {
      it('allows the subscription', async () => {
        spacesAdapter.findMembership.mockResolvedValue(
          {} as UserSpaceMembership,
        );

        await expect(
          authorizer.assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'SPACE_CONTENT_CHANGED',
            params: [spaceId],
          }),
        ).resolves.toBeUndefined();
      });

      it('checks the membership of the space that was named', async () => {
        spacesAdapter.findMembership.mockResolvedValue(
          {} as UserSpaceMembership,
        );

        await authorizer.assertMaySubscribe({
          userId,
          organizationId,
          eventType: 'CHANGE_PROPOSAL_UPDATE',
          params: [spaceId],
        });

        expect(spacesAdapter.findMembership).toHaveBeenCalledWith(
          userId,
          createSpaceId(spaceId),
        );
      });
    });

    describe('and the caller is not a member', () => {
      it('refuses the subscription', async () => {
        spacesAdapter.findMembership.mockResolvedValue(null);

        await expect(
          authorizer.assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'SPACE_CONTENT_CHANGED',
            params: [spaceId],
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('and no space was named', () => {
      it('refuses the subscription', async () => {
        await expect(
          authorizer.assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'SPACE_CONTENT_CHANGED',
            params: [],
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('and the named space is not an id', () => {
      it('refuses the subscription before querying', async () => {
        await authorizer
          .assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'SPACE_CONTENT_CHANGED',
            params: ["'; drop table spaces; --"],
          })
          .catch(() => undefined);

        expect(spacesAdapter.findMembership).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the event type is scoped to an organization', () => {
    describe("and it names the caller's own organization", () => {
      it('allows the subscription', async () => {
        await expect(
          authorizer.assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'DISTRIBUTION_STATUS_CHANGE',
            params: [organizationId],
          }),
        ).resolves.toBeUndefined();
      });
    });

    describe('and it names another organization', () => {
      it('refuses the subscription', async () => {
        await expect(
          authorizer.assertMaySubscribe({
            userId,
            organizationId,
            eventType: 'DISTRIBUTION_STATUS_CHANGE',
            params: [otherOrganizationId],
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('and the request carried no organization', () => {
      it('refuses the subscription', async () => {
        await expect(
          authorizer.assertMaySubscribe({
            userId,
            eventType: 'DISTRIBUTION_STATUS_CHANGE',
            params: [organizationId],
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
