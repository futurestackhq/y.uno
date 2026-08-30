import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  extends: [core, react, tanstack],
  ignorePatterns: [...core.ignorePatterns, "docs/**", "packages/ui/**"],
  rules: {
    "eslint/sort-keys": "off",
    "typescript/no-empty-interface": "off",
    "typescript/no-empty-object-type": "off",
    "unicorn/prefer-export-from": "off",
  },
});
