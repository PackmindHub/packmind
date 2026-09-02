import { Logger } from 'typeorm';

/**
 * Records the SQL a test datasource issues, so a spec can assert on the number
 * of round trips a repository makes and not only on its return value.
 *
 * Enable it with `createTestDatasourceFixture(entities, { recordQueries: true })`
 * and read it through `fixture.queries`. N+1 regressions are invisible to
 * result-shape assertions, which is how they get reintroduced.
 */
export type QueryRecorder = {
  /** The TypeORM logger to hand to the datasource. */
  logger: Logger;
  /** Every statement recorded since the last `reset()`, in order. */
  queries: string[];
  /** Drops the recorded statements. */
  reset(): void;
  /** How many recorded statements match `pattern`. */
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
      // A `g`-flagged regex would carry `lastIndex` from one test() to the
      // next and start skipping matches, so match without it.
      const stateless = new RegExp(
        pattern.source,
        pattern.flags.replace('g', ''),
      );
      return queries.filter((query) => stateless.test(query)).length;
    },
  };
}
