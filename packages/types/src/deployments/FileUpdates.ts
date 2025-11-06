export type FileUpdates = {
  createOrUpdate: { path: string; content: string }[];
  delete: { path: string }[];
};
