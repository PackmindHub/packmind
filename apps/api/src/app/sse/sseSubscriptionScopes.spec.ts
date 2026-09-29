import { resolveSSESubscriptionScope } from './sseSubscriptionScopes';

describe('resolveSSESubscriptionScope', () => {
  describe('when the event type names a space in its params', () => {
    it('scopes SPACE_CONTENT_CHANGED to a space', () => {
      expect(resolveSSESubscriptionScope('SPACE_CONTENT_CHANGED')).toBe(
        'space',
      );
    });

    it('scopes CHANGE_PROPOSAL_UPDATE to a space', () => {
      expect(resolveSSESubscriptionScope('CHANGE_PROPOSAL_UPDATE')).toBe(
        'space',
      );
    });
  });

  describe('when the event type names an organization in its params', () => {
    it('scopes DISTRIBUTION_STATUS_CHANGE to an organization', () => {
      expect(resolveSSESubscriptionScope('DISTRIBUTION_STATUS_CHANGE')).toBe(
        'organization',
      );
    });
  });

  describe('when the publisher names its recipients', () => {
    it.each([
      'USER_CONTEXT_CHANGE',
      'MARKETPLACE_PUBLISH_COMPLETED',
      'PROGRAM_STATUS_CHANGE',
      'ASSESSMENT_STATUS_CHANGE',
      'DETECTION_HEURISTICS_UPDATED',
    ])('scopes %s as targeted', (eventType) => {
      expect(resolveSSESubscriptionScope(eventType)).toBe('targeted');
    });
  });

  describe('when the publisher uses a different case than the subscriber', () => {
    it('resolves the lower-case spelling publishers use', () => {
      expect(resolveSSESubscriptionScope('program_status_change')).toBe(
        'targeted',
      );
    });
  });

  describe('when the event type is not declared', () => {
    it('resolves nothing for an unknown event type', () => {
      expect(resolveSSESubscriptionScope('SOMETHING_INVENTED')).toBeUndefined();
    });

    it('resolves nothing for an Object prototype member', () => {
      expect(resolveSSESubscriptionScope('constructor')).toBeUndefined();
    });
  });
});
