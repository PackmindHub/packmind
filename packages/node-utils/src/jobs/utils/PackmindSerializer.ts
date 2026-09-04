export class PackmindSerializer {
  static withPackmindSafeObjects<T>(value: T): unknown {
    if (value instanceof Date) {
      return {
        __packmindType: 'date',
        value: value.toISOString(),
      };
    }

    if (Array.isArray(value)) {
      return value.map(PackmindSerializer.withPackmindSafeObjects);
    }

    if (typeof value === 'object' && value !== null && value !== undefined) {
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          return [key, PackmindSerializer.withPackmindSafeObjects(value)];
        }),
      );
    }

    return value;
  }

  static fromPackmindSafeObjects<T>(value: unknown): T {
    if (isPackmindSerializedDate(value)) {
      return new Date(value.value) as T;
    }

    if (Array.isArray(value)) {
      return value.map(PackmindSerializer.fromPackmindSafeObjects) as T;
    }

    if (typeof value === 'object' && value !== null && value !== undefined) {
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          return [key, PackmindSerializer.fromPackmindSafeObjects(value)];
        }),
      ) as T;
    }

    return value as T;
  }

  private static toPackmindSerializedDate<T>(
    value: T,
  ): T | PackmindSerializedDate {
    if (value instanceof Date) {
      return {
        __packmindType: 'date',
        value: value.toISOString(),
      };
    }
    return value;
  }
}

type PackmindSerializedDate = {
  __packmindType: 'date';
  value: string;
};

function isPackmindSerializedDate(tbd: unknown): tbd is PackmindSerializedDate {
  if (tbd === null || tbd === undefined || typeof tbd !== 'object')
    return false;

  const tbdAsSerialized = tbd as PackmindSerializedDate;
  return (
    tbdAsSerialized.__packmindType === 'date' &&
    !isNaN(new Date(tbdAsSerialized.value).getTime())
  );
}
