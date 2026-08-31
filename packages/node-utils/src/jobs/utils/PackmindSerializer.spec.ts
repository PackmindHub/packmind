import { PackmindSerializer } from './PackmindSerializer';

describe('PackmindSerializer', () => {
  const myData = {
    name: 'Some name',
    createdAt: new Date(),
    someSubObject: {
      createdAt: new Date(),
      versions: [new Date(), new Date(), new Date()],
    },
  };

  describe('withPackmindSafeObjects/fromPackmindSafeObjects', () => {
    it('properly serializes and deserializes Date', () => {
      const serialized = PackmindSerializer.withPackmindSafeObjects(myData);
      expect(PackmindSerializer.fromPackmindSafeObjects(serialized)).toEqual(
        myData,
      );
    });
  });

  describe('stringify/parse', () => {
    describe('when a value is undefined', () => {
      const data = { somethingUndefined: undefined };

      it('is not handled better by JSON by the way', () => {
        expect(JSON.parse(JSON.stringify(data))).toEqual({});
      });
    });
  });
});
