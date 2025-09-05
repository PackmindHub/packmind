/**
 * @packmind/deployments
 *
 * This package provides deployment-related functionality for the Packmind platform.
 * It includes domain entities and repositories for managing recipe and standard deployments.
 */

// Re-export main hexa
export * from './DeploymentsHexa';
export * from './DeploymentsHexaFactory';

// Re-export domain entities
export * from './domain/entities/';
export * from './domain/types/StandardDeploymentOverview';
export * from './infra/schemas';

/**
 * Package version
 */
export const DEPLOYMENTS_VERSION = '0.0.1';
