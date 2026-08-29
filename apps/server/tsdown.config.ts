import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@hackathon\/.*/],
    neverBundle: ["cloudflare:workers"],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
