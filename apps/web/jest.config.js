const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Las pruebas E2E pertenecen a Playwright, no a Jest.
  testPathIgnorePatterns: [
    "/node_modules/",
    "[/\\\\]e2e[/\\\\]",
    "[/\\\\]\\.next[/\\\\]",
    "\\.mts$",
  ],
};

module.exports = createJestConfig(customJestConfig);
