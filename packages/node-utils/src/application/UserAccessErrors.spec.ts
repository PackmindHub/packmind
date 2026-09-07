import {
  createOrganizationId,
  createUserId,
  isDomainError,
} from '@packmind/types';
import {
  OrganizationAdminRequiredError,
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';
import { SpaceMembershipRequiredError } from './AbstractSpaceMemberUseCase';
import { SpaceAdminRequiredError } from './AbstractSpaceAdminUseCase';

const userId = createUserId('11111111-1111-1111-1111-111111111111');
const organizationId = createOrganizationId(
  '22222222-2222-2222-2222-222222222222',
);

// These assertions look tautological but are not: the transform pipeline can
// erase them. packages/node-utils/jest.config.js compiles with SWC at
// target es2022 and leaves `useDefineForClassFields` at its default of true,
// under which a declaration-only field in a subclass re-defines the property
// as undefined *after* super() has already assigned it. Every `kind` and
// `reason` below is therefore written as a field *initializer* rather than a
// bare declaration, and this suite is what proves the distinction holds for
// real instead of only in tsc.
describe('user access errors', () => {
  describe.each([
    [
      'UserNotFoundError',
      new UserNotFoundError({ userId }),
      'not_found',
      'user_not_found',
    ],
    [
      'UserNotInOrganizationError',
      new UserNotInOrganizationError({ userId, organizationId }),
      'forbidden',
      'user_not_in_organization',
    ],
    [
      'OrganizationAdminRequiredError',
      new OrganizationAdminRequiredError({ userId, organizationId }),
      'forbidden',
      'user_not_an_admin',
    ],
    [
      'SpaceMembershipRequiredError',
      new SpaceMembershipRequiredError(userId, 'space-1'),
      'not_found',
      'space_membership_required',
    ],
    [
      'SpaceAdminRequiredError',
      new SpaceAdminRequiredError(userId, 'space-1'),
      'forbidden',
      'space_admin_required',
    ],
  ])('%s', (name, error, expectedKind, expectedReason) => {
    it('is recognized as a domain error', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('declares its kind', () => {
      expect(error.kind).toBe(expectedKind);
    });

    it('declares its reason', () => {
      expect(error.reason).toBe(expectedReason);
    });

    it('keeps its own name', () => {
      expect(error.name).toBe(name);
    });

    it('keeps a usable message', () => {
      expect(error.message).not.toBe('');
    });

    // The filter returns `message` verbatim to the client, and ~46 frontend
    // surfaces render it raw, so an identifier in the text is an identifier on
    // screen. The ids stay on `.context` for logging instead.
    it('names no identifier in its message', () => {
      expect(error.message).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      expect(error.message).not.toContain('space-1');
    });

    it('is still an Error', () => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('does not recognize a plain Error as a domain error', () => {
    expect(isDomainError(new Error('boom'))).toBe(false);
  });

  it('keeps the brand off enumerable properties', () => {
    const error = new UserNotInOrganizationError({ userId, organizationId });

    expect(Object.keys(error)).not.toContain(
      Symbol.for('packmind.DomainError').toString(),
    );
  });
});
