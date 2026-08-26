/**
 * bcrypt cost factor used when hashing passwords.
 *
 * bcrypt is deliberately slow, which is exactly what we want in production and
 * exactly what we do not want in the test suite: at cost 10 a single hash takes
 * ~70ms, and the integration suite performs one sign-up (hash + compare) per
 * test, so the cost factor alone accounted for a large share of its runtime.
 *
 * Tests therefore run at the lowest cost bcrypt accepts. This is opt-in through
 * `NODE_ENV=test` (which Jest sets for us) so a production process — where
 * NODE_ENV is `production`, or unset — always gets the strong cost factor.
 */
const PRODUCTION_SALT_ROUNDS = 10;
const TEST_SALT_ROUNDS = 4;

export function getPasswordSaltRounds(): number {
  return process.env['NODE_ENV'] === 'test'
    ? TEST_SALT_ROUNDS
    : PRODUCTION_SALT_ROUNDS;
}
