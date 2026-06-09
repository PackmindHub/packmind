'use strict';

/**
 * Local ESLint plugin holding Packmind workspace-specific rules.
 * Consumed from the root `eslint.config.mjs` via a default import.
 */
module.exports = {
  rules: {
    'use-case-filename': require('./rules/use-case-filename'),
  },
};
