import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.ts"],
  verbose: true,
  setupFilesAfterEnv: [],
};

export default config;
