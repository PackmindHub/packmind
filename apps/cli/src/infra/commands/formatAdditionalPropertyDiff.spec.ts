import { formatAdditionalPropertyDiff } from './formatAdditionalPropertyDiff';

describe('formatAdditionalPropertyDiff', () => {
  describe('when adding a property', () => {
    it('returns only an added line when oldValue is null sentinel', () => {
      expect(formatAdditionalPropertyDiff('model', 'null', '"opus"')).toEqual([
        { type: 'added', text: 'model: "opus"' },
      ]);
    });
  });

  describe('when removing a property', () => {
    it('returns only a removed line when newValue is null sentinel', () => {
      expect(formatAdditionalPropertyDiff('model', '"opus"', 'null')).toEqual([
        { type: 'removed', text: 'model: "opus"' },
      ]);
    });

    it('returns only a removed line when newValue is empty', () => {
      expect(formatAdditionalPropertyDiff('model', '"opus"', '')).toEqual([
        { type: 'removed', text: 'model: "opus"' },
      ]);
    });
  });

  describe('when updating a property', () => {
    it('returns both removed and added lines', () => {
      expect(
        formatAdditionalPropertyDiff('model', '"opus"', '"sonnet"'),
      ).toEqual([
        { type: 'removed', text: 'model: "opus"' },
        { type: 'added', text: 'model: "sonnet"' },
      ]);
    });
  });

  describe('when both values are null sentinels', () => {
    it('returns an empty array', () => {
      expect(formatAdditionalPropertyDiff('model', 'null', 'null')).toEqual([]);
    });
  });
});
