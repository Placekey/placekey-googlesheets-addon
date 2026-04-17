export default [
  {
    files: ["**/*.gs"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
        SpreadsheetApp: "readonly",
        PropertiesService: "readonly",
        HtmlService: "readonly",
        UrlFetchApp: "readonly",
        Utilities: "readonly",
        Logger: "readonly",
        console: "readonly",
        crypto: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", vars: "local", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "eqeqeq": ["warn", "always"],
      "no-throw-literal": "error",
    },
  },
];
