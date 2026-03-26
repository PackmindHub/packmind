import { formatAdditionalPropertyDiff } from './formatAdditionalPropertyDiff';

describe('formatAdditionalPropertyDiff', () => {
  describe('when adding a property', () => {
    describe('when oldValue is null sentinel', () => {
      it('returns only an added line', () => {
        expect(formatAdditionalPropertyDiff('model', 'null', '"opus"')).toEqual(
          [{ type: 'added', text: 'model: "opus"' }],
        );
      });
    });
  });

  describe('when removing a property', () => {
    describe('when newValue is null sentinel', () => {
      it('returns only a removed line', () => {
        expect(formatAdditionalPropertyDiff('model', '"opus"', 'null')).toEqual(
          [{ type: 'removed', text: 'model: "opus"' }],
        );
      });
    });

    describe('when newValue is empty', () => {
      it('returns only a removed line', () => {
        expect(formatAdditionalPropertyDiff('model', '"opus"', '')).toEqual([
          { type: 'removed', text: 'model: "opus"' },
        ]);
      });
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

  describe('camelCase to kebab-case conversion', () => {
    it('converts camelCase targetId to kebab-case in output', () => {
      expect(
        formatAdditionalPropertyDiff('userInvocable', 'null', 'true'),
      ).toEqual([{ type: 'added', text: 'user-invocable: true' }]);
    });

    it('converts disableModelInvocation to kebab-case', () => {
      expect(
        formatAdditionalPropertyDiff('disableModelInvocation', 'null', 'true'),
      ).toEqual([{ type: 'added', text: 'disable-model-invocation: true' }]);
    });
  });
});
