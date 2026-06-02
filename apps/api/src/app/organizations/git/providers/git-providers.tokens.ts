/**
 * NestJS injection token for the InstallStateSigner provider.
 * Defined here (separate from the module) to avoid circular import chains
 * between the module, controller, and service files.
 */
export const INSTALL_STATE_SIGNER = 'INSTALL_STATE_SIGNER';
