import { IRepository } from '../../src/repositories/IRepository';

type HandleDuplicateKeysTestOptions<Entity extends { id: string }> = {
  entityFactory: (overrides?: Partial<Entity>) => Entity;
  getRepository: () => IRepository<Entity>;
  duplicateFields: (keyof Entity)[];
  expectedErrorMessage: (entity: Entity) => string;
};

export function itHandlesDuplicateKeys<Entity extends { id: string }>({
  entityFactory,
  getRepository,
  duplicateFields,
  expectedErrorMessage,
}: HandleDuplicateKeysTestOptions<Entity>) {
  describe('Duplicate keys handling', () => {
    let repository: IRepository<Entity>;

    beforeEach(async () => {
      repository = getRepository();
    });

    it('throws error for duplicate key constraint violation', async () => {
      const firstEntity = entityFactory();

      // Create duplicate entity with same values for duplicate fields
      const duplicateOverrides = duplicateFields.reduce((acc, field) => {
        acc[field] = firstEntity[field];
        return acc;
      }, {} as Partial<Entity>);
      const duplicateEntity = entityFactory(duplicateOverrides);

      await repository.add(firstEntity);

      await expect(repository.add(duplicateEntity)).rejects.toThrow(
        expectedErrorMessage(firstEntity),
      );
    });

    describe('when no conflict occurs', () => {
      let firstEntity: Entity;
      let secondEntity: Entity;
      let differentOverrides: Partial<Entity>;

      beforeEach(() => {
        firstEntity = entityFactory();

        // Create different entity with modified values for duplicate fields
        const timestamp = Date.now();
        differentOverrides = duplicateFields.reduce((acc, field) => {
          const value = firstEntity[field];
          if (typeof value === 'string') {
            acc[field] = `${value}-${timestamp}` as Entity[keyof Entity];
          }
          return acc;
        }, {} as Partial<Entity>);
        secondEntity = entityFactory(differentOverrides);
      });

      it('does not throw an error', async () => {
        await repository.add(firstEntity);
        await expect(repository.add(secondEntity)).resolves.toBeDefined();
      });

      it('creates two different entries', async () => {
        const result1 = await repository.add(firstEntity);
        const result2 = await repository.add(secondEntity);

        expect(result1.id).not.toBe(result2.id);
      });
    });
  });
}
