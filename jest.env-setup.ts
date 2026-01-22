// jest.env-setup.ts - runs BEFORE modules are loaded
// This is critical for preventing Winston memory leak by setting log level
// before any Winston loggers are instantiated

process.env.PACKMIND_LOG_LEVEL = 'silent';
