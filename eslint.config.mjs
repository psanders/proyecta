/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/src/generated/**",
      "cleanup/**",
      "design/**",
      "openspec/**",
      "shells/**",
      "playwright-report/**",
      "test-results/**",
      ".claude/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
);
