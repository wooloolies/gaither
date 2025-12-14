import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "../backend/openapi.json",
    output: {
      clean: true,
      client: "react-query",
      httpClient: "axios",
      mock: false,
      mode: "tags-split",
      namingConvention: "kebab-case",
      override: {
        mutator: {
          name: "useCustomInstance",
          path: "./src/hooks/use-custom-instance.ts",
        },
        operations: {
        },
        query: {
          useSuspenseQuery: true,
        },
      },
      prettier: false,
      schemas: "./src/lib/api/model",
      target: "./src/lib/api/generated.ts",
    },
  },
  zod: {
    input: "../backend/openapi.json",
    output: {
      clean: true,
      client: "zod",
      fileExtension: ".zod.ts",
      mode: "tags-split",
      namingConvention: "kebab-case",
      prettier: false,
      target: "./src/lib/api/zod",
    },
  },
});
