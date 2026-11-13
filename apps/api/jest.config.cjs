module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '\\.integration\\.spec\\.ts$'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.check.json' }] },
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // La CI (GitHub define CI=true) mide la cobertura; en local se usa npx jest --coverage.
  collectCoverage: process.env.CI === 'true',
  coverageReporters: ['text-summary'],
  // T1.8: mínimo de 80 % solo para el módulo de encuestas.
  coverageThreshold: {
    './src/modules/surveys/': { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};