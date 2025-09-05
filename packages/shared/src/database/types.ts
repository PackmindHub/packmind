export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithSoftDelete<T> = T & {
  deletedAt: Date | null;
  deletedBy: string | null;
};
