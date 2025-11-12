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

    it('supports null values', () => {
      expect(
        PackmindSerializer.parse(
          PackmindSerializer.stringify({ somethingNull: null }),
        ),
      ).toEqual({ somethingNull: null });
    });
  });

  describe('stringify/parse', () => {
    it('properly serializes and deserializes Date', () => {
      const serialized = PackmindSerializer.stringify(myData);
      expect(PackmindSerializer.parse(serialized)).toEqual(myData);
    });

    it('supports null values', () => {
      expect(
        PackmindSerializer.parse(
          PackmindSerializer.stringify({ somethingNull: null }),
        ),
      ).toEqual({ somethingNull: null });
    });

    describe('when a value is undefined', () => {
      const data = { somethingUndefined: undefined };

      it('is omitted', () => {
        expect(
          PackmindSerializer.parse(PackmindSerializer.stringify(data)),
        ).toEqual({});
      });

      it('is not handled better by JSON by the way', () => {
        expect(JSON.parse(JSON.stringify(data))).toEqual({});
      });
    });
  });
});
