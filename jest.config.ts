import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.ts"], // Ensure it only picks up .ts files
  verbose: true,
  setupFilesAfterEnv: [], // If you had any setup files
};

export default config;
