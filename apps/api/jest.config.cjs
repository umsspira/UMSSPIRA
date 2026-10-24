module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.check.json' }] },
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: {
    '^@umsspira/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    // Resolver imports internos de Prisma (que usan .js pero existen como .ts)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};