import { Logger } from 'typeorm';

/**
 * Records the SQL a test datasource issues, so a spec can assert how many
 * round trips a repository makes.
 */
export type QueryRecorder = {
  logger: Logger;
  /** Every statement recorded since the last `reset()`, in order. */
  queries: string[];
  reset(): void;
  countMatching(pattern: RegExp | string): number;
};

export function createQueryRecorder(): QueryRecorder {
  const queries: string[] = [];
  const record = (query: string) => {
    queries.push(query);
  };
  const noop = () => undefined;

  const logger = {
    logQuery: (query: string) => record(query),
    logQueryError: (_error: string | Error, query: string) => record(query),
    logQuerySlow: (_time: number, query: string) => record(query),
    logSchemaBuild: noop,
    logMigration: noop,
    log: noop,
  } as Logger;

  return {
    logger,
    queries,
    reset() {
      queries.length = 0;
    },
    countMatching(pattern: RegExp | string) {
      if (typeof pattern === 'string') {
        return queries.filter((query) => query.includes(pattern)).length;
      }
      // `g` and `y` carry `lastIndex` between calls, which skips matches.
      const stateless = new RegExp(
        pattern.source,
        pattern.flags.replace(/[gy]/g, ''),
      );
      return queries.filter((query) => stateless.test(query)).length;
    },
  };
}
