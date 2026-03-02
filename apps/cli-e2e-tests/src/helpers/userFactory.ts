import { v4 as uuidv4 } from 'uuid';

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
  return {
    email: `test-${uuidv4()}@example.com`,
    password: `Test-${uuidv4()}-Password!123`,
  };
}
