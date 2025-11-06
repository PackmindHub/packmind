// TODO: drop and use the one in /types/deployment/

export type FileUpdates = {
  createOrUpdate: { path: string; content: string }[];
  delete: { path: string }[];
};
