import { describeCause } from './describeCause';

describe('describeCause', () => {
  describe('when the cause is an Error', () => {
    const cause = new TypeError('connection reset');

    it('keeps its name, message and stack', () => {
      expect(describeCause(cause)).toEqual({
        name: 'TypeError',
        message: 'connection reset',
        stack: cause.stack,
      });
    });
  });

  describe('when the cause is not an Error', () => {
    it('returns it as thrown', () => {
      const cause = { code: 'ECONNRESET' };

      expect(describeCause(cause)).toBe(cause);
    });
  });
});
