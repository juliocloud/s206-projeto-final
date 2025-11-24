import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.ts"],
  verbose: true,

  reporters: [
    // "default", 

    ["jest-html-reporter", {
      pageTitle: "Relatório de Testes QA S206", 
      outputPath: "reports/test-report.html", 
      includeConsoleLog: true,
    }],
  ],
    collectCoverage: true,
    coverageDirectory: "reports/coverage", 
    coverageReporters: ["html", "lcov", "text-summary"], 
    
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
};


export default config;

