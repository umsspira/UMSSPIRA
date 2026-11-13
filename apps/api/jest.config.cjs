module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '\\.integration\\.spec\\.ts$'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.check.json' }] },
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: {
    // `web-push` es ESM ("type": "module") y ts-jest no lo transpila en el
    // entorno CJS de las pruebas. Se usa un doble CommonJS.
    '^web-push$': '<rootDir>/test/__mocks__/web-push.cjs',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

