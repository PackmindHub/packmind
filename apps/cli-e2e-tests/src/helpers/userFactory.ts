import { randomBytes } from 'crypto';

export interface TestUserCredentials {
  email: string;
  password: string;
}

/**
 * Generates unique test user credentials with variety to avoid conflicts
 * when running tests multiple times.
 *
 * @returns Test user credentials with random email and strong password
 */
export function createTestUser(): TestUserCredentials {
  const randomId = randomBytes(8).toString('hex');

  return {
    email: `test-${randomId}@example.com`,
    password: `Test-${randomId}-Password!123`,
  };
}
