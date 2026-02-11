export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithSoftDelete<T> = T & {
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type QueryOption = Partial<{
  includeDeleted: boolean;
}>;

export type CreatedBy = {
  userId: string;
  displayName: string;
};

export interface IRepository<Entity extends { id: string }> {
  add(entity: Entity): Promise<Entity>;
  findById(id: Entity['id'], opts?: QueryOption): Promise<Entity | null>;
  deleteById(entityId: Entity['id'], deletedBy?: string): Promise<void>;
  restoreById(entityId: Entity['id']): Promise<void>;
}
