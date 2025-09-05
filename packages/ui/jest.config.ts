export default {
  displayName: 'ui',
  preset: '../../jest.preset.ts',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/ui',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@packmind/assets$': '<rootDir>/../assets/src/index.ts',
    '^@packmind/assets/(.*)$': '<rootDir>/../assets/src/$1',
    '\\.css$': 'identity-obj-proxy',
  },
};
