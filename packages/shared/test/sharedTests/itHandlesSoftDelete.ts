import { WithSoftDelete } from '../../src';
import { IRepository } from '../../src/repositories/IRepository';

type HandleSoftDeteTestOptions<Entity extends { id: string }> = {
  entityFactory: () => Entity;
  getRepository: () => IRepository<Entity>;
  queryDeletedEntity: (
    id: Entity['id'],
  ) => Promise<WithSoftDelete<Entity> | null>;
};

export function itHandlesSoftDelete<Entity extends { id: string }>({
  entityFactory,
  getRepository,
  queryDeletedEntity,
}: HandleSoftDeteTestOptions<Entity>) {
  describe('Soft-delete', () => {
    let entityId: Entity['id'];
    let repository: IRepository<Entity>;

    beforeEach(async () => {
      repository = getRepository();

      const { id } = await repository.add(entityFactory());
      entityId = id;
    });

    it('can delete the entity', async () => {
      await repository.deleteById(entityId);

      expect(await repository.findById(entityId)).toBeNull();
    });

    it('can find a deleted entity if includeDeleted is specified as an option to findById', async () => {
      await repository.deleteById(entityId);

      expect(
        await repository.findById(entityId, { includeDeleted: true }),
      ).toMatchObject({ id: entityId });
    });

    it('stores the deletion author if provided', async () => {
      await repository.deleteById(entityId, 'some-author-id');
      const deletedEntity = await queryDeletedEntity(entityId);

      expect(deletedEntity?.deletedBy).toEqual('some-author-id');
    });

    describe('when a deleted entity is restored', () => {
      beforeEach(async () => {
        await repository.deleteById(entityId);
        await repository.restoreById(entityId);
      });

      it('can be found again', async () => {
        expect(await repository.findById(entityId)).not.toBeNull();
      });

      it('removes the deletedBy property', async () => {
        const restored = await repository.findById(entityId);

        expect((restored as WithSoftDelete<Entity>)?.deletedBy).toBeNull();
      });
    });
  });
}
