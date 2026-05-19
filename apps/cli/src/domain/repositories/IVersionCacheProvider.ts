export interface IVersionCacheEntry {
  latestVersion: string;
  checkedAt: Date;
}

export interface IVersionCacheProvider {
  read(): IVersionCacheEntry | null;
  write(entry: IVersionCacheEntry): void;
}
