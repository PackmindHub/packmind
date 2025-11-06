export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// WithSoftDelete is exported from @packmind/types
export type { WithSoftDelete } from '@packmind/types';
