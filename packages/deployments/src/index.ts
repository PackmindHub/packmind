/**
 * @packmind/deployments
 *
 * This package provides deployment-related functionality for the Packmind platform.
 * It includes domain entities and repositories for managing recipe and standard deployments.
 */

// Re-export main hexa
export * from './DeploymentsHexa';

// Re-export schemas
export * from './infra/schemas';

// Re-export domain errors
export * from './domain/errors/NoPackageSlugsProvidedError';
export * from './domain/errors/PackagesNotFoundError';
export * from './domain/errors/TargetNotFoundError';

/**
 * Package version
 */
export const DEPLOYMENTS_VERSION = '0.0.1';
