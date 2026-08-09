import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Dive times are wall-clock times at the dive site. Running the suite in a
    // far-from-UTC zone means an accidental UTC conversion shifts the date and
    // fails the test, rather than passing by luck on a UTC machine.
    env: {
      TZ: "Pacific/Kiritimati",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
    },
  },
});
