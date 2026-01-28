/**
 * Shared Jest configuration utilities for @swc/jest-based projects
 * This file contains common configuration helpers used across the monorepo
 * for projects that use @swc/jest as their transformer.
 *
 * Note: apps/frontend uses ts-jest and should NOT import from this file.
 */

// Helper to convert TypeScript paths to Jest moduleNameMapper format
export function pathsToModuleNameMapper(
  paths: Record<string, string[]>,
  prefix: string,
) {
  const moduleNameMapper: Record<string, string> = {};
  for (const [key, [value]] of Object.entries(paths)) {
    // Convert TS path pattern to Jest regex pattern
    const regexKey = '^' + key.replace(/\*/g, '(.*)') + '$';
    // Replace each * with its corresponding capture group ($1, $2, etc.)
    let groupIndex = 0;
    const mappedValue = prefix + value.replace(/\*/g, () => `$${++groupIndex}`);
    moduleNameMapper[regexKey] = mappedValue;
  }
  return moduleNameMapper;
}

/**
 * Standard SWC Jest transformer configuration for TypeScript projects
 */
export const swcTransformConfig = {
  jsc: {
    parser: { syntax: 'typescript' as const, tsx: false },
    target: 'es2022' as const,
  },
};

/**
 * SWC Jest transformer configuration with additional options for better compatibility
 */
export const swcTransformConfigWithDefineFields = {
  jsc: {
    parser: { syntax: 'typescript' as const, tsx: false },
    target: 'es2022' as const,
    transform: {
      // Enable better module mocking compatibility
      useDefineForClassFields: false,
    },
  },
  module: {
    // Use commonjs for better Jest compatibility with mocks
    type: 'commonjs' as const,
  },
};

/**
 * SWC Jest transformer configuration with decorator support (without extra transforms)
 */
export const swcTransformConfigWithDecoratorsOnly = {
  jsc: {
    parser: {
      syntax: 'typescript' as const,
      tsx: false,
      decorators: true, // Enable decorators
    },
    target: 'es2022' as const,
    transform: {
      legacyDecorator: true, // Use legacy decorator implementation
      decoratorMetadata: true, // Enable decorator metadata
    },
  },
};

/**
 * SWC Jest transformer configuration for NestJS projects with decorator support
 */
export const swcTransformConfigWithDecorators = {
  jsc: {
    parser: {
      syntax: 'typescript' as const,
      tsx: false,
      decorators: true, // Enable decorators for NestJS
    },
    target: 'es2022' as const,
    transform: {
      legacyDecorator: true, // Use legacy decorator implementation
      decoratorMetadata: true, // Enable decorator metadata (needed for NestJS DI)
      useDefineForClassFields: false,
    },
  },
  module: {
    type: 'commonjs' as const,
  },
};

/**
 * Standard transform configuration for @swc/jest
 */
export const swcTransform = {
  '^.+\\.[tj]s$': ['@swc/jest', swcTransformConfig],
};

/**
 * Transform configuration for @swc/jest with better compatibility
 */
export const swcTransformWithDefineFields = {
  '^.+\\.[tj]s$': ['@swc/jest', swcTransformConfigWithDefineFields],
};

/**
 * Transform configuration for @swc/jest with decorators only
 */
export const swcTransformWithDecoratorsOnly = {
  '^.+\\.[tj]s$': ['@swc/jest', swcTransformConfigWithDecoratorsOnly],
};

/**
 * Transform configuration for @swc/jest with NestJS decorator support
 */
export const swcTransformWithDecorators = {
  '^.+\\.[tj]s$': ['@swc/jest', swcTransformConfigWithDecorators],
};

/**
 * Standard transformIgnorePatterns for node packages
 */
export const standardTransformIgnorePatterns = [
  '/node_modules/(?!slug).+\\.js$',
];

/**
 * Standard moduleFileExtensions for TypeScript projects
 */
export const standardModuleFileExtensions = ['ts', 'js', 'html'];

/**
 * SWC Jest transformer configuration for React/TSX projects
 */
export const swcTransformConfigTsx = {
  jsc: {
    parser: {
      syntax: 'typescript' as const,
      tsx: true,
      decorators: false,
    },
    transform: {
      react: {
        runtime: 'automatic',
      },
    },
    target: 'es2022' as const,
  },
  module: {
    type: 'commonjs' as const,
  },
};

/**
 * Transform configuration for @swc/jest with TSX support (React components)
 */
export const swcTransformTsx = {
  '^.+\\.[tj]sx?$': ['@swc/jest', swcTransformConfigTsx],
};

/**
 * Transform ignore patterns for frontend with Chakra UI, framer-motion, etc.
 */
export const frontendTransformIgnorePatterns = [
  '/node_modules/(?!(slug|marked|@chakra-ui|@zag-js|framer-motion|lucide-react)).+\\.[tj]sx?$',
];
