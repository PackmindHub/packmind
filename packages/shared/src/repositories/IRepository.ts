export type QueryOption = Partial<{
  includeDeleted: boolean;
}>;

export interface IRepository<Entity extends { id: string }> {
  add(entity: Entity): Promise<Entity>;
  findById(id: Entity['id'], opts?: QueryOption): Promise<Entity | null>;
  deleteById(entityId: Entity['id'], deletedBy?: string): Promise<void>;
  restoreById(entityId: Entity['id']): Promise<void>;
}
